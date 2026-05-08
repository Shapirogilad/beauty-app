import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { generateSlots } from './slot-engine'

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  async getAvailableSlots(stylistId: string, serviceId: string, dateStr: string) {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) throw new BadRequestException('תאריך לא תקין')

    const dayOfWeek = date.getDay()

    const [service, workingHours, existingBookings] = await Promise.all([
      this.prisma.service.findUniqueOrThrow({
        where: { id: serviceId },
        select: { durationMinutes: true, slotIntervalMinutes: true },
      }),
      this.prisma.workingHours.findUnique({
        where: { stylistId_dayOfWeek: { stylistId, dayOfWeek } },
      }),
      this.prisma.booking.findMany({
        where: {
          stylistId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startAt: {
            gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
            lt: new Date(new Date(date).setHours(23, 59, 59, 999)),
          },
        },
        select: { startAt: true, endAt: true },
      }),
    ])

    const now = new Date()

    const slots = generateSlots({
      date,
      workingHours: workingHours
        ? {
            openTime:  workingHours.openTime,
            closeTime: workingHours.closeTime,
            isClosed:  workingHours.isClosed,
            breaks:    (workingHours.breaks as { start: string; end: string }[] | null) ?? [],
          }
        : null,
      serviceDurationMinutes: service.durationMinutes,
      slotIntervalMinutes: service.slotIntervalMinutes,
      existingBookings,
    }).filter((s) => s > now)

    return {
      date: dateStr,
      slots: slots.map((s) => s.toISOString()),
      serviceDurationMinutes: service.durationMinutes,
    }
  }
}
