import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'
import { WaitlistService } from '../notifications/waitlist.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { generateSlots } from '../slots/slot-engine'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private waitlist: WaitlistService,
  ) {}

  async create(clientId: string, dto: CreateBookingDto) {
    const slotStart = new Date(dto.slotStart)
    const dayOfWeek = slotStart.getDay()

    const [service, workingHours] = await Promise.all([
      this.prisma.service.findUniqueOrThrow({ where: { id: dto.serviceId } }),
      this.prisma.workingHours.findUnique({
        where: { stylistId_dayOfWeek: { stylistId: dto.stylistId, dayOfWeek } },
      }),
    ])

    const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60_000)

    // Re-validate slot is still available (prevents race conditions)
    const conflict = await this.prisma.booking.findFirst({
      where: {
        stylistId: dto.stylistId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startAt: { lt: slotEnd } }, { endAt: { gt: slotStart } }],
      },
    })
    if (conflict) throw new ConflictException('הזמן הזה כבר נלקח, בחרי זמן אחר')

    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        stylistId: dto.stylistId,
        serviceId: dto.serviceId,
        startAt: slotStart,
        endAt: slotEnd,
        status: 'PENDING',
      },
      include: {
        service: { select: { nameHe: true, price: true, durationMinutes: true } },
        stylist: {
          select: {
            name: true,
            photo: true,
            business: { select: { name: true, address: true } },
          },
        },
        client: { select: { deviceToken: true, name: true } },
      },
    })

    // Confirmation push — fire and forget
    if (booking.client.deviceToken) {
      const dateLabel = format(slotStart, "d בMMMM 'בשעה' HH:mm", { locale: he })
      this.notifications.sendOne({
        to: booking.client.deviceToken,
        title: 'ההזמנה אושרה! ✅',
        body: `${booking.service.nameHe} אצל ${booking.stylist.name} — ${dateLabel}`,
        data: { screen: 'AppointmentsTab', bookingId: booking.id },
      }).catch(() => {})
    }

    return booking
  }

  async findMyBookings(clientId: string, status: 'upcoming' | 'past') {
    const now = new Date()
    return this.prisma.booking.findMany({
      where: {
        clientId,
        ...(status === 'upcoming'
          ? { startAt: { gte: now }, status: { in: ['PENDING', 'CONFIRMED'] } }
          : { startAt: { lt: now } }),
      },
      include: {
        service: { select: { nameHe: true, price: true, businessId: true } },
        stylist: { select: { name: true, photo: true } },
        payment: { select: { status: true } },
        review: { select: { id: true } },
        changeRequests: {
          where: { status: 'PENDING' },
          select: { id: true, type: true },
          take: 1,
        },
      },
      orderBy: { startAt: status === 'upcoming' ? 'asc' : 'desc' },
    }).then((bookings) =>
      bookings.map((b) => ({
        ...b,
        pendingChangeRequest: b.changeRequests[0] ?? null,
        changeRequests: undefined,
      })),
    )
  }

  async cancel(bookingId: string, clientId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        payment: true,
        client: { select: { deviceToken: true } },
        service: { select: { nameHe: true, businessId: true } },
      },
    })
    if (booking.clientId !== clientId) throw new NotFoundException()

    const hoursUntil = (booking.startAt.getTime() - Date.now()) / 3_600_000
    const eligibleForRefund = hoursUntil >= 24

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: eligibleForRefund ? 'CANCELLED' : 'CANCELLED_NO_REFUND' },
    })

    // Notify client of cancellation
    if (booking.client.deviceToken) {
      this.notifications.sendOne({
        to: booking.client.deviceToken,
        title: 'התור בוטל',
        body: eligibleForRefund
          ? `התור ל${booking.service.nameHe} בוטל. ההחזר יגיע תוך 3–5 ימים.`
          : `התור ל${booking.service.nameHe} בוטל.`,
        data: { screen: 'AppointmentsTab' },
      }).catch(() => {})
    }

    // Notify next person on waitlist — fire and forget
    this.waitlist.notifyNext(booking.serviceId, booking.startAt).catch(() => {})

    return { refund: eligibleForRefund }
  }

  async cancelByOwner(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        service: { include: { business: true } },
        client: { select: { id: true, deviceToken: true } },
        payment: { select: { id: true, amountAgorot: true, status: true } },
      },
    })
    if (booking.service.business.ownerId !== ownerId) throw new NotFoundException()

    const hasPaidPayment = booking.payment?.status === 'COMPLETED'
    const refundAgorot   = hasPaidPayment ? booking.payment!.amountAgorot : 0

    // Build transaction ops
    const txOps: any[] = [
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      }),
    ]

    // Credit wallet if booking was paid
    if (hasPaidPayment) {
      txOps.push(
        this.prisma.payment.update({
          where: { id: booking.payment!.id },
          data: { status: 'REFUNDED' },
        }),
        this.prisma.user.update({
          where: { id: booking.clientId },
          data: { walletBalance: { increment: refundAgorot } },
        }),
      )
    }

    // Get or create conversation, then send a message as the business owner
    const conversation = await this.prisma.conversation.upsert({
      where: {
        businessId_clientId: {
          businessId: booking.service.businessId,
          clientId: booking.clientId,
        },
      },
      create: {
        businessId: booking.service.businessId,
        clientId: booking.clientId,
      },
      update: {},
    })

    const dateLabel = format(booking.startAt, "d בMMMM 'בשעה' HH:mm", { locale: he })
    const creditLine = hasPaidPayment
      ? ` זיכוי של ₪${(refundAgorot / 100).toFixed(2)} נוסף לארנק שלך באפליקציה.`
      : ''
    const messageText =
      `📢 התור ל${booking.service.nameHe} ב${dateLabel} בוטל על ידי העסק.${creditLine} מצטערות על אי הנוחות.`

    txOps.push(
      this.prisma.message.create({
        data: { conversationId: conversation.id, senderId: ownerId, text: messageText },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    )

    await this.prisma.$transaction(txOps)

    // Push notification
    if (booking.client.deviceToken) {
      this.notifications.sendOne({
        to: booking.client.deviceToken,
        title: 'התור בוטל על ידי העסק',
        body: hasPaidPayment
          ? `התור ל${booking.service.nameHe} בוטל. זיכוי של ₪${(refundAgorot / 100).toFixed(2)} נוסף לארנק שלך.`
          : `התור ל${booking.service.nameHe} בוטל. אנא צרי קשר עם העסק.`,
        data: { screen: 'MessagesTab' },
      }).catch(() => {})
    }

    this.waitlist.notifyNext(booking.serviceId, booking.startAt).catch(() => {})
    return { success: true, refundedAgorot: refundAgorot }
  }

  async createChangeRequest(
    clientId: string,
    bookingId: string,
    type: 'CANCEL_REFUND' | 'RESCHEDULE',
    proposedStart?: string,
    note?: string,
  ) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        service: { include: { business: { select: { id: true, ownerId: true } } } },
        client: { select: { name: true } },
      },
    })
    if (booking.clientId !== clientId) throw new NotFoundException()
    if (!['PENDING', 'CONFIRMED'].includes(booking.status))
      throw new BadRequestException('לא ניתן לשלוח בקשה עבור הזמנה זו')
    if (booking.startAt <= new Date())
      throw new BadRequestException('לא ניתן לשנות הזמנה שכבר עברה')

    const existing = await this.prisma.bookingChangeRequest.findFirst({
      where: { bookingId, status: 'PENDING' },
    })
    if (existing) throw new BadRequestException('כבר קיימת בקשה פתוחה עבור הזמנה זו')

    const request = await this.prisma.bookingChangeRequest.create({
      data: {
        bookingId,
        clientId,
        type,
        proposedStart: proposedStart ? new Date(proposedStart) : undefined,
        note,
      },
    })

    // Send in-app message from client to business
    const conversation = await this.prisma.conversation.upsert({
      where: { businessId_clientId: { businessId: booking.service.business.id, clientId } },
      create: { businessId: booking.service.business.id, clientId },
      update: {},
    })

    const dateLabel = format(booking.startAt, "d בMMMM 'בשעה' HH:mm", { locale: he })
    const proposedLabel = proposedStart
      ? format(new Date(proposedStart), "d בMMMM 'בשעה' HH:mm", { locale: he })
      : ''
    const msgText = type === 'CANCEL_REFUND'
      ? `📋 ${booking.client.name} שלחה בקשת ביטול עם החזר כספי עבור התור ל${booking.service.nameHe} ב${dateLabel}.${note ? `\nהערה: ${note}` : ''}`
      : `📋 ${booking.client.name} שלחה בקשת שינוי מועד עבור התור ל${booking.service.nameHe} ב${dateLabel} לתאריך ${proposedLabel}.${note ? `\nהערה: ${note}` : ''}`

    await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId: conversation.id, senderId: clientId, text: msgText },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ])

    // Notify owner
    const owner = await this.prisma.user.findUnique({
      where: { id: booking.service.business.ownerId },
      select: { deviceToken: true },
    })
    if (owner?.deviceToken) {
      this.notifications.sendOne({
        to: owner.deviceToken,
        title: type === 'CANCEL_REFUND' ? 'בקשת ביטול חדשה' : 'בקשת שינוי מועד',
        body: `${booking.client.name} — ${booking.service.nameHe} ב${dateLabel}`,
        data: { screen: 'ScheduleTab' },
      }).catch(() => {})
    }

    return request
  }

  async getChangeRequestsForOwner(ownerId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerId }, select: { id: true },
    })
    if (!business) throw new NotFoundException()

    return this.prisma.bookingChangeRequest.findMany({
      where: {
        status: 'PENDING',
        booking: { service: { businessId: business.id } },
      },
      include: {
        booking: {
          include: {
            service: { select: { nameHe: true, durationMinutes: true } },
            stylist: { select: { id: true, name: true } },
            client: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async approveChangeRequest(ownerId: string, requestId: string) {
    const req = await this.prisma.bookingChangeRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        booking: {
          include: {
            service: { include: { business: true } },
            payment: { select: { id: true, amountAgorot: true, walletAgorot: true, status: true } },
            client: { select: { id: true, deviceToken: true, name: true } },
          },
        },
      },
    })
    if (req.booking.service.business.ownerId !== ownerId) throw new NotFoundException()
    if (req.status !== 'PENDING') throw new BadRequestException('הבקשה כבר טופלה')

    if (req.type === 'CANCEL_REFUND') {
      const hasPaid = req.booking.payment?.status === 'COMPLETED'
      const refundAgorot = hasPaid
        ? (req.booking.payment!.amountAgorot + req.booking.payment!.walletAgorot)
        : 0

      const txOps: any[] = [
        this.prisma.bookingChangeRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } }),
        this.prisma.booking.update({ where: { id: req.bookingId }, data: { status: 'CANCELLED' } }),
      ]
      if (hasPaid) {
        txOps.push(
          this.prisma.payment.update({ where: { id: req.booking.payment!.id }, data: { status: 'REFUNDED' } }),
          this.prisma.user.update({ where: { id: req.booking.clientId }, data: { walletBalance: { increment: refundAgorot } } }),
        )
      }
      await this.prisma.$transaction(txOps)

      if (req.booking.client.deviceToken) {
        const dateLabel = format(req.booking.startAt, "d בMMMM 'בשעה' HH:mm", { locale: he })
        this.notifications.sendOne({
          to: req.booking.client.deviceToken,
          title: 'בקשת הביטול אושרה',
          body: hasPaid
            ? `התור ל${req.booking.service.nameHe} ב${dateLabel} בוטל. זיכוי של ₪${(refundAgorot / 100).toFixed(2)} נוסף לארנק.`
            : `התור ל${req.booking.service.nameHe} ב${dateLabel} בוטל.`,
          data: { screen: 'AppointmentsTab' },
        }).catch(() => {})
      }

      this.waitlist.notifyNext(req.booking.serviceId, req.booking.startAt).catch(() => {})
      return { success: true }
    }

    // RESCHEDULE
    if (!req.proposedStart) throw new BadRequestException('חסר מועד מוצע')
    const newStart = new Date(req.proposedStart)
    const durationMs = req.booking.service.durationMinutes * 60_000
    const newEnd = new Date(newStart.getTime() + durationMs)

    const conflict = await this.prisma.booking.findFirst({
      where: {
        id: { not: req.bookingId },
        stylistId: req.booking.stylistId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        AND: [{ startAt: { lt: newEnd } }, { endAt: { gt: newStart } }],
      },
    })
    if (conflict) throw new BadRequestException('המועד המוצע כבר תפוס')

    await this.prisma.$transaction([
      this.prisma.bookingChangeRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } }),
      this.prisma.booking.update({
        where: { id: req.bookingId },
        data: { startAt: newStart, endAt: newEnd },
      }),
    ])

    if (req.booking.client.deviceToken) {
      const dateLabel = format(newStart, "d בMMMM 'בשעה' HH:mm", { locale: he })
      this.notifications.sendOne({
        to: req.booking.client.deviceToken,
        title: 'שינוי המועד אושר',
        body: `התור ל${req.booking.service.nameHe} הועבר ל${dateLabel}.`,
        data: { screen: 'AppointmentsTab' },
      }).catch(() => {})
    }

    return { success: true }
  }

  async declineChangeRequest(ownerId: string, requestId: string) {
    const req = await this.prisma.bookingChangeRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        booking: {
          include: {
            service: { include: { business: true } },
            client: { select: { deviceToken: true } },
          },
        },
      },
    })
    if (req.booking.service.business.ownerId !== ownerId) throw new NotFoundException()
    if (req.status !== 'PENDING') throw new BadRequestException('הבקשה כבר טופלה')

    await this.prisma.bookingChangeRequest.update({ where: { id: requestId }, data: { status: 'DECLINED' } })

    if (req.booking.client.deviceToken) {
      const dateLabel = format(req.booking.startAt, "d בMMMM 'בשעה' HH:mm", { locale: he })
      const typeLabel = req.type === 'CANCEL_REFUND' ? 'הביטול' : 'שינוי המועד'
      this.notifications.sendOne({
        to: req.booking.client.deviceToken,
        title: `בקשת ${typeLabel} נדחתה`,
        body: `בקשתך עבור התור ל${req.booking.service.nameHe} ב${dateLabel} נדחתה.`,
        data: { screen: 'AppointmentsTab' },
      }).catch(() => {})
    }

    return { success: true }
  }

  async confirmByOwner(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { service: { include: { business: true } } },
    })
    if (booking.service.business.ownerId !== ownerId) throw new NotFoundException()
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'CONFIRMED' } })
  }

  async markNoShow(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { service: { include: { business: true } } },
    })
    if (booking.service.business.ownerId !== ownerId) throw new NotFoundException()
    return this.prisma.booking.update({ where: { id: bookingId }, data: { status: 'NO_SHOW' } })
  }
}
