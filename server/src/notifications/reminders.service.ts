import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../common/prisma.service'
import { NotificationsService } from './notifications.service'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name)

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Runs every 30 minutes — finds appointments in the next 24h or 2h window
   * and sends reminders if not already sent.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendReminders() {
    const now = new Date()

    const windows = [
      { label: '24h', from: 23 * 60, to: 24 * 60 },   // 23–24h ahead
      { label: '2h',  from: 115,      to: 125 },        // 1h55–2h05 ahead (±5min window)
    ]

    for (const window of windows) {
      const windowStart = new Date(now.getTime() + window.from * 60_000)
      const windowEnd   = new Date(now.getTime() + window.to   * 60_000)

      const bookings = await this.prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          startAt: { gte: windowStart, lte: windowEnd },
        },
        include: {
          client: { select: { name: true, deviceToken: true } },
          service: { select: { nameHe: true } },
          stylist: { select: { name: true } },
        },
      })

      if (bookings.length === 0) continue
      this.logger.log(`Sending ${window.label} reminders for ${bookings.length} bookings`)

      const payloads = bookings
        .filter((b) => b.client.deviceToken)
        .map((b) => {
          const timeLabel = format(b.startAt, 'HH:mm', { locale: he })
          const isLong = window.label === '24h'
          return {
            to: b.client.deviceToken!,
            title: 'תזכורת לתור 💅',
            body: isLong
              ? `מחר בשעה ${timeLabel} — ${b.service.nameHe} אצל ${b.stylist.name}`
              : `בעוד שעתיים! ${b.service.nameHe} בשעה ${timeLabel} אצל ${b.stylist.name}`,
            data: { screen: 'AppointmentsTab', bookingId: b.id },
          }
        })

      await this.notifications.send(payloads)
    }
  }
}
