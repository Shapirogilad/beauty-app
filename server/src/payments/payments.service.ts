import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../common/prisma.service'
import axios from 'axios'
import * as qs from 'querystring'

interface ChargeCardParams {
  bookingId: string
  ccno: string
  expdate: string  // MMYY
  cvv: string
  saveCard: boolean
  useWallet?: boolean
}

@Injectable()
export class PaymentsService {
  private readonly terminal: string
  private readonly password: string
  private readonly isDev: boolean

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.terminal = config.get<string>('TRANZILA_TERMINAL', '')
    this.password = config.get<string>('TRANZILA_PASSWORD', '')
    this.isDev = config.get<string>('NODE_ENV') !== 'production'
  }

  async charge(clientId: string, params: ChargeCardParams) {
    const [booking, user] = await Promise.all([
      this.prisma.booking.findUniqueOrThrow({
        where: { id: params.bookingId },
        include: { service: true, payment: true },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { walletBalance: true } }),
    ])

    if (booking.clientId !== clientId) throw new BadRequestException()
    if (booking.payment) throw new BadRequestException('תשלום כבר בוצע עבור הזמנה זו')

    const originalAgorot = booking.service.price
    const walletAgorot = params.useWallet
      ? Math.min(user.walletBalance, originalAgorot)
      : 0
    const cardAgorot = originalAgorot - walletAgorot

    let providerRef = ''
    let token: string | null = null
    let last4 = ''

    if (cardAgorot > 0) {
      const result = this.isDev
        ? this.mockCharge(params.ccno)
        : await this.callTranzila({ ccno: params.ccno, expdate: params.expdate, cvv: params.cvv, amountAgorot: cardAgorot })
      providerRef = result.providerRef
      token = result.token
      last4 = result.last4
    }

    const txOps: any[] = [
      this.prisma.payment.create({
        data: {
          bookingId: params.bookingId,
          amountAgorot: cardAgorot,
          originalAgorot,
          walletAgorot,
          status: 'COMPLETED',
          providerRef,
          cardLast4: last4 || null,
        },
      }),
      this.prisma.booking.update({
        where: { id: params.bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]
    if (walletAgorot > 0) {
      txOps.push(
        this.prisma.user.update({
          where: { id: clientId },
          data: { walletBalance: { decrement: walletAgorot } },
        }),
      )
    }

    const [payment] = await this.prisma.$transaction(txOps)

    if (params.saveCard && token) {
      try {
        const existing = await this.prisma.savedCard.findFirst({
          where: { userId: clientId, last4 },
        })
        if (existing) {
          await this.prisma.savedCard.update({
            where: { id: existing.id },
            data: { token, expiry: params.expdate.replace(/(\d{2})(\d{2})/, '$1/$2'), isDefault: true },
          })
        } else {
          await this.prisma.savedCard.create({
            data: {
              userId: clientId,
              token,
              last4,
              expiry: params.expdate.replace(/(\d{2})(\d{2})/, '$1/$2'),
              isDefault: true,
            },
          })
        }
      } catch (e) {
        console.error('[payments] Failed to save card:', e)
      }
    }

    return payment
  }

  async chargeWithToken(clientId: string, bookingId: string, savedCardId: string, useWallet = false) {
    const [booking, savedCard, user] = await Promise.all([
      this.prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { service: true, payment: true },
      }),
      this.prisma.savedCard.findUniqueOrThrow({ where: { id: savedCardId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { walletBalance: true } }),
    ])

    if (booking.clientId !== clientId || savedCard.userId !== clientId)
      throw new BadRequestException()
    if (booking.payment) throw new BadRequestException('תשלום כבר בוצע עבור הזמנה זו')

    const originalAgorot = booking.service.price
    const walletAgorot = useWallet ? Math.min(user.walletBalance, originalAgorot) : 0
    const cardAgorot = originalAgorot - walletAgorot

    let providerRef = ''
    if (cardAgorot > 0) {
      const result = this.isDev
        ? this.mockCharge(savedCard.token)
        : await this.callTranzilaWithToken({ token: savedCard.token, amountAgorot: cardAgorot })
      providerRef = result.providerRef
    }

    const txOps: any[] = [
      this.prisma.payment.create({
        data: {
          bookingId,
          amountAgorot: cardAgorot,
          originalAgorot,
          walletAgorot,
          status: 'COMPLETED',
          providerRef,
          cardLast4: savedCard.last4,
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
    ]
    if (walletAgorot > 0) {
      txOps.push(
        this.prisma.user.update({
          where: { id: clientId },
          data: { walletBalance: { decrement: walletAgorot } },
        }),
      )
    }

    const [payment] = await this.prisma.$transaction(txOps)
    return payment
  }

  async payWithWalletOnly(clientId: string, bookingId: string) {
    const [booking, user] = await Promise.all([
      this.prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: { service: true, payment: true },
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: clientId }, select: { walletBalance: true } }),
    ])

    if (booking.clientId !== clientId) throw new BadRequestException()
    if (booking.payment) throw new BadRequestException('תשלום כבר בוצע עבור הזמנה זו')

    const originalAgorot = booking.service.price
    if (user.walletBalance < originalAgorot)
      throw new BadRequestException('יתרת ארנק אינה מספיקה')

    const [payment] = await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          bookingId,
          amountAgorot: 0,
          originalAgorot,
          walletAgorot: originalAgorot,
          status: 'COMPLETED',
          providerRef: 'WALLET',
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CONFIRMED' },
      }),
      this.prisma.user.update({
        where: { id: clientId },
        data: { walletBalance: { decrement: originalAgorot } },
      }),
    ])

    return payment
  }

  getSavedCards(clientId: string) {
    return this.prisma.savedCard.findMany({
      where: { userId: clientId },
      orderBy: { isDefault: 'desc' },
    })
  }

  async addCard(clientId: string, params: { ccno: string; expdate: string; cvv: string }) {
    // Tokenize via a ₪1 authorization — in dev we mock it
    const { token, last4 } = this.isDev
      ? this.mockCharge(params.ccno)
      : await this.callTranzila({ ...params, amountAgorot: 100 })

    const existing = await this.prisma.savedCard.findFirst({
      where: { userId: clientId, last4 },
    })
    if (existing) {
      return this.prisma.savedCard.update({
        where: { id: existing.id },
        data: { token, expiry: params.expdate.replace(/(\d{2})(\d{2})/, '$1/$2'), isDefault: true },
      })
    }
    return this.prisma.savedCard.create({
      data: {
        userId: clientId,
        token: token!,
        last4,
        expiry: params.expdate.replace(/(\d{2})(\d{2})/, '$1/$2'),
        isDefault: true,
      },
    })
  }

  async refundByOwner(ownerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        payment: true,
        service: { include: { business: true } },
        client: { select: { deviceToken: true } },
      },
    })

    if (booking.service.business.ownerId !== ownerId)
      throw new BadRequestException('אין הרשאה')
    if (!booking.payment)
      throw new BadRequestException('לא נמצא תשלום עבור הזמנה זו')
    if (booking.payment.status === 'REFUNDED')
      throw new BadRequestException('הוחזר כבר')

    if (!this.isDev) {
      const sum = (booking.payment.amountAgorot / 100).toFixed(2)
      const body = qs.stringify({
        supplier:    this.terminal,
        TranzilaPW:  this.password,
        sum,
        currency:    1,
        cred_type:   5,   // credit / refund
        ...(booking.payment.providerRef ? { originalIndex: booking.payment.providerRef } : {}),
      })
      const { data } = await axios.post(
        'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi',
        body,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
      )
      const parsed = Object.fromEntries(new URLSearchParams(data))
      if (parsed['Response'] !== '000')
        throw new InternalServerErrorException('זיכוי נכשל, נסי שוב')
    } else {
      console.log(`[DEV] Mock refund approved for booking ${bookingId}`)
    }

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: booking.payment.id },
        data: { status: 'REFUNDED' },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      }),
    ])

    return { success: true, refundedAgorot: booking.payment.amountAgorot }
  }

  async deleteCard(clientId: string, cardId: string) {
    const card = await this.prisma.savedCard.findUnique({ where: { id: cardId } })
    if (!card || card.userId !== clientId) throw new BadRequestException()
    await this.prisma.savedCard.delete({ where: { id: cardId } })
  }

  // ── Tranzila integration ────────────────────────────────────────────────────

  private async callTranzila(params: {
    ccno: string
    expdate: string
    cvv: string
    amountAgorot: number
  }) {
    const sum = (params.amountAgorot / 100).toFixed(2)
    const body = qs.stringify({
      supplier: this.terminal,
      TranzilaPW: this.password,
      ccno: params.ccno,
      expdate: params.expdate,
      mycvv: params.cvv,
      sum,
      currency: 1,   // ILS
      cred_type: 1,  // regular charge
      tranmode: 'A', // get token
    })

    const { data } = await axios.post(
      'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi',
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    )

    const parsed = Object.fromEntries(new URLSearchParams(data))
    if (parsed['Response'] !== '000') {
      throw new BadRequestException(
        parsed['Response'] === '004' ? 'הכרטיס נדחה' : 'שגיאת תשלום, נסי שוב',
      )
    }

    return {
      providerRef: parsed['index'] ?? parsed['ConfirmationCode'] ?? '',
      token: parsed['TranzilaTK'] ?? null,
      last4: params.ccno.slice(-4),
    }
  }

  private async callTranzilaWithToken(params: { token: string; amountAgorot: number }) {
    const sum = (params.amountAgorot / 100).toFixed(2)
    const body = qs.stringify({
      supplier: this.terminal,
      TranzilaPW: this.password,
      TranzilaTK: params.token,
      sum,
      currency: 1,
      cred_type: 1,
    })

    const { data } = await axios.post(
      'https://secure5.tranzila.com/cgi-bin/tranzila71u.cgi',
      body,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15_000 },
    )

    const parsed = Object.fromEntries(new URLSearchParams(data))
    if (parsed['Response'] !== '000') throw new InternalServerErrorException('תשלום נכשל')

    return { providerRef: parsed['index'] ?? '', token: params.token }
  }

  private mockCharge(ccno: string) {
    const last4 = ccno.slice(-4)
    console.log(`[DEV] Mock charge approved. last4=${last4}`)
    return { providerRef: `DEV-${Date.now()}`, token: `mock-token-${last4}`, last4 }
  }
}
