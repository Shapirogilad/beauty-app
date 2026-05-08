import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear,
  eachMonthOfInterval, format,
} from 'date-fns'
import { he } from 'date-fns/locale'

@Injectable()
export class EarningsService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(ownerId: string): Promise<string> {
    const biz = await this.prisma.business.findUnique({
      where: { ownerId }, select: { id: true },
    })
    if (!biz) throw new NotFoundException('עסק לא נמצא')
    return biz.id
  }

  async getMonthly(ownerId: string, year: number) {
    const businessId = await this.getBusinessId(ownerId)
    const yearStart = startOfYear(new Date(year, 0, 1))
    const yearEnd   = endOfYear(new Date(year, 0, 1))

    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
        createdAt: { gte: yearStart, lte: yearEnd },
        booking: { service: { businessId } },
      },
      select: { originalAgorot: true, refundedAgorot: true, createdAt: true },
    })

    const net = (p: { originalAgorot: number; refundedAgorot: number }) =>
      p.originalAgorot - p.refundedAgorot

    // Build month buckets
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })
    const buckets = months.map((m) => {
      const ms = startOfMonth(m).getTime()
      const me = endOfMonth(m).getTime()
      const monthPayments = payments.filter(
        (p) => p.createdAt.getTime() >= ms && p.createdAt.getTime() <= me,
      )
      return {
        month: format(m, 'MMM', { locale: he }),
        monthNum: m.getMonth() + 1,
        revenueAgorot: monthPayments.reduce((s, p) => s + net(p), 0),
        bookingCount: monthPayments.length,
      }
    })

    const totalAgorot = payments.reduce((s, p) => s + net(p), 0)
    return { year, months: buckets, totalAgorot }
  }

  async getByService(ownerId: string, from: string, to: string) {
    const businessId = await this.getBusinessId(ownerId)
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
        createdAt: { gte: new Date(from), lte: new Date(to) },
        booking: { service: { businessId } },
      },
      include: { booking: { include: { service: { select: { nameHe: true, id: true } } } } },
    })

    const map = new Map<string, { nameHe: string; revenueAgorot: number; count: number }>()
    for (const p of payments) {
      const { id, nameHe } = p.booking.service
      const earned = p.originalAgorot - p.refundedAgorot
      const curr = map.get(id) ?? { nameHe, revenueAgorot: 0, count: 0 }
      map.set(id, { nameHe, revenueAgorot: curr.revenueAgorot + earned, count: curr.count + 1 })
    }

    return Array.from(map.values()).sort((a, b) => b.revenueAgorot - a.revenueAgorot)
  }

  async getByStylist(ownerId: string, from: string, to: string) {
    const businessId = await this.getBusinessId(ownerId)
    const payments = await this.prisma.payment.findMany({
      where: {
        status: { in: ['COMPLETED', 'PARTIALLY_REFUNDED'] },
        createdAt: { gte: new Date(from), lte: new Date(to) },
        booking: { service: { businessId } },
      },
      include: { booking: { include: { stylist: { select: { name: true, id: true } } } } },
    })

    const map = new Map<string, { name: string; revenueAgorot: number; count: number }>()
    for (const p of payments) {
      const { id, name } = p.booking.stylist
      const earned = p.originalAgorot - p.refundedAgorot
      const curr = map.get(id) ?? { name, revenueAgorot: 0, count: 0 }
      map.set(id, { name, revenueAgorot: curr.revenueAgorot + earned, count: curr.count + 1 })
    }

    return Array.from(map.values()).sort((a, b) => b.revenueAgorot - a.revenueAgorot)
  }
}
