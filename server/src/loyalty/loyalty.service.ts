import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

const POINTS_TO_AGOROT_RATE = 10  // 100 points = 10 agorot? No: 100 pts = 1000 agorot (10 ₪)
// Actually: redemptionRate pts → 10 ₪ (1000 agorot). Business configures pointsPerHundredAgorot.

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getAccount(clientId: string, businessId: string) {
    return this.prisma.loyaltyAccount.upsert({
      where: { clientId_businessId: { clientId, businessId } },
      create: { clientId, businessId, points: 0 },
      update: {},
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
  }

  /** Earn points after a completed payment */
  async earnPoints(clientId: string, businessId: string, amountAgorot: number, bookingId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { pointsPerHundredAgorot: true, loyaltyEnabled: true },
    })
    if (!business?.loyaltyEnabled) return

    const points = Math.floor((amountAgorot / 100) * business.pointsPerHundredAgorot)
    if (points === 0) return

    const account = await this.prisma.loyaltyAccount.upsert({
      where: { clientId_businessId: { clientId, businessId } },
      create: { clientId, businessId, points: 0 },
      update: {},
    })

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: { accountId: account.id, type: 'EARN', points, bookingId },
      }),
    ])
  }

  /**
   * Preview how many agorot a redemption of `points` is worth.
   * Returns 0 if loyalty not enabled or insufficient points.
   */
  async previewRedemption(clientId: string, businessId: string, pointsToRedeem: number) {
    const [business, account] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { loyaltyEnabled: true, pointsRedemptionRate: true },
      }),
      this.prisma.loyaltyAccount.findUnique({
        where: { clientId_businessId: { clientId, businessId } },
        select: { points: true },
      }),
    ])

    if (!business?.loyaltyEnabled) return { eligible: false, discountAgorot: 0, balance: 0 }

    const balance = account?.points ?? 0
    const toRedeem = Math.min(pointsToRedeem, balance)
    // pointsRedemptionRate pts → 1000 agorot (10 ₪)
    const discountAgorot = Math.floor((toRedeem / business.pointsRedemptionRate) * 1000)

    return { eligible: balance > 0, discountAgorot, balance, toRedeem }
  }

  /** Deduct points at payment time */
  async redeemPoints(clientId: string, businessId: string, points: number, bookingId: string) {
    const account = await this.prisma.loyaltyAccount.findUniqueOrThrow({
      where: { clientId_businessId: { clientId, businessId } },
    })

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { decrement: points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: { accountId: account.id, type: 'REDEEM', points: -points, bookingId },
      }),
    ])
  }

  async getAllAccounts(clientId: string) {
    return this.prisma.loyaltyAccount.findMany({
      where: { clientId, points: { gt: 0 } },
      include: { business: { select: { id: true, name: true } } },
      orderBy: { points: 'desc' },
    })
  }

  async manualGrant(ownerId: string, clientId: string, businessId: string, points: number, note: string) {
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { clientId_businessId: { clientId, businessId } },
      create: { clientId, businessId, points: 0 },
      update: {},
    })

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: { increment: points } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: { accountId: account.id, type: 'MANUAL_GRANT', points, note },
      }),
    ])
  }
}
