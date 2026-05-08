import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { NotificationsService } from './notifications.service'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name)

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async join(clientId: string, serviceId: string, dateFrom: Date, dateTo?: Date) {
    const end = dateTo ?? dateFrom
    const days: Date[] = []
    const cursor = new Date(dateFrom)
    while (cursor <= end) {
      // Skip Shabbat (Saturday = 6)
      if (cursor.getDay() !== 6) days.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }

    await Promise.all(
      days.map(async (date) => {
        const existing = await this.prisma.waitlistEntry.findFirst({
          where: { clientId, serviceId, date, notifiedAt: null },
        })
        if (!existing) {
          await this.prisma.waitlistEntry.create({
            data: { clientId, serviceId, date },
          })
        }
      }),
    )
  }

  /**
   * Called whenever a booking is cancelled.
   * Notifies the next waiting client for that service+date.
   */
  async notifyNext(serviceId: string, date: Date): Promise<void> {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        serviceId,
        date: { gte: dayStart, lte: dayEnd },
        notifiedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        client: { select: { name: true, deviceToken: true } },
        service: { select: { nameHe: true } },
      },
    })

    if (!entry) return

    await this.prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { notifiedAt: new Date() },
    })

    if (!entry.client.deviceToken) return

    const dateLabel = format(date, "d בMMMM", { locale: he })
    await this.notifications.sendOne({
      to: entry.client.deviceToken,
      title: 'פנה מקום! 🎉',
      body: `נפתח תור ל${entry.service.nameHe} ב-${dateLabel}. מהרי להזמין!`,
      data: { screen: 'Home', serviceId },
    })

    this.logger.log(`Waitlist notification sent to ${entry.client.name} for service ${serviceId}`)
  }

  getWaitlist(clientId: string) {
    return this.prisma.waitlistEntry.findMany({
      where: { clientId, notifiedAt: null },
      include: { service: { select: { nameHe: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
