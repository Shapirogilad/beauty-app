import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

const REFERRER_POINTS = 100    // points awarded to the referrer
const REFERRED_POINTS = 50     // points awarded to the new user
const DEFAULT_BUSINESS_ID = '' // referral rewards go to a platform-level loyalty pool
                                // In production, pick the first business the new user books with

@Injectable()
export class ReferralsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Called during registration if a referral code is present */
  async applyReferral(referredId: string, referralCode: string) {
    if (!referralCode) return

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true, name: true, deviceToken: true },
    })
    if (!referrer || referrer.id === referredId) return

    const existing = await this.prisma.referral.findUnique({ where: { referredId } })
    if (existing) return

    await this.prisma.referral.create({ data: { referrerId: referrer.id, referredId } })
  }

  /**
   * Called after the referred user completes their FIRST paid booking.
   * Awards points to both parties if not already rewarded.
   */
  async rewardOnFirstBooking(clientId: string, businessId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { referredId: clientId, rewardedAt: null },
      include: {
        referrer: { select: { id: true, name: true, deviceToken: true } },
        referred: { select: { name: true } },
      },
    })
    if (!referral) return

    // Check this really is the first completed booking
    const bookingCount = await this.prisma.payment.count({
      where: { status: 'COMPLETED', booking: { clientId } },
    })
    if (bookingCount > 1) return // not the first

    await this.prisma.referral.update({
      where: { id: referral.id },
      data: { rewardedAt: new Date() },
    })

    // Grant loyalty points to both — at the business they just booked
    const grantPoints = async (userId: string, points: number, note: string) => {
      const account = await this.prisma.loyaltyAccount.upsert({
        where: { clientId_businessId: { clientId: userId, businessId } },
        create: { clientId: userId, businessId, points: 0 },
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

    await Promise.all([
      grantPoints(referral.referrerId, REFERRER_POINTS, `הפניה של ${referral.referred.name}`),
      grantPoints(clientId, REFERRED_POINTS, 'הטבת הצטרפות על הפניה'),
    ])

    // Notify referrer
    if (referral.referrer.deviceToken) {
      await this.notifications.sendOne({
        to: referral.referrer.deviceToken,
        title: 'קיבלת נקודות! 🎉',
        body: `${referral.referred.name} הזמינה תור בעזרת הקישור שלך — קיבלת ${REFERRER_POINTS} נקודות`,
        data: { screen: 'LoyaltyTab' },
      }).catch(() => {})
    }
  }

  getReferralInfo(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referralsMade: {
          select: {
            rewardedAt: true,
            referred: { select: { name: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }
}
