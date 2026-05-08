import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Platform Stats ────────────────────────────────────────────────────────

  async getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      totalClients,
      totalBusinesses,
      totalBookings,
      bookingsToday,
      revenueAgg,
      recentSignups,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CLIENT' } }),
      this.prisma.business.count(),
      this.prisma.booking.count(),
      this.prisma.booking.count({
        where: { startAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amountAgorot: true },
      }),
      this.prisma.user.count({
        where: {
          role: 'CLIENT',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ])

    return {
      totalClients,
      totalBusinesses,
      totalBookings,
      bookingsToday,
      totalRevenueAgorot: revenueAgg._sum?.amountAgorot ?? 0,
      newClientsThisWeek: recentSignups,
    }
  }

  // ─── Clients ───────────────────────────────────────────────────────────────

  async getClients(search?: string) {
    const where = search
      ? {
          role: 'CLIENT' as const,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { role: 'CLIENT' as const }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
    })

    // Attach total spent per client
    const enriched = await Promise.all(
      users.map(async (u) => {
        const agg = await this.prisma.payment.aggregate({
          where: { booking: { clientId: u.id }, status: 'COMPLETED' },
          _sum: { amountAgorot: true },
        })
        return {
          ...u,
          bookingCount: u._count.bookings,
          totalSpentAgorot: agg._sum?.amountAgorot ?? 0,
        }
      }),
    )

    return enriched
  }

  async getClient(clientId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        city: true,
        photo: true,
        createdAt: true,
        bookings: {
          orderBy: { startAt: 'desc' },
          take: 10,
          select: {
            id: true,
            startAt: true,
            status: true,
            service: { select: { nameHe: true, price: true } },
            stylist: { select: { name: true, business: { select: { name: true } } } },
          },
        },
        loyaltyAccounts: {
          select: {
            points: true,
            business: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!user) throw new NotFoundException('לקוח לא נמצא')

    const agg = await this.prisma.payment.aggregate({
      where: { booking: { clientId }, status: 'COMPLETED' },
      _sum: { amountAgorot: true },
    })

    return { ...user, totalSpentAgorot: agg._sum?.amountAgorot ?? 0 }
  }

  // ─── Businesses ────────────────────────────────────────────────────────────

  async getBusinesses(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { owner: { name: { contains: search, mode: 'insensitive' as const } } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const businesses = await this.prisma.business.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        address: true,
        category: true,
        createdAt: true,
        owner: { select: { name: true, phone: true } },
        _count: { select: { stylists: true } },
      },
    })

    const enriched = await Promise.all(
      businesses.map(async (b) => {
        const [bookingCount, revenueAgg] = await Promise.all([
          this.prisma.booking.count({ where: { stylist: { businessId: b.id } } }),
          this.prisma.payment.aggregate({
            where: { booking: { stylist: { businessId: b.id } }, status: 'COMPLETED' },
            _sum: { amountAgorot: true },
          }),
        ])
        return {
          ...b,
          bookingCount,
          revenueAgorot: revenueAgg._sum?.amountAgorot ?? 0,
        }
      }),
    )

    return enriched
  }

  async getBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        owner: { select: { name: true, phone: true, email: true } },
        stylists: {
          select: {
            id: true,
            name: true,
            _count: { select: { bookings: true } },
          },
        },
        services: {
          select: { id: true, nameHe: true, price: true, durationMinutes: true },
        },
      },
    })

    if (!business) throw new NotFoundException('עסק לא נמצא')

    const [bookingCount, revenueAgg, recentBookings] = await Promise.all([
      this.prisma.booking.count({ where: { stylist: { businessId } } }),
      this.prisma.payment.aggregate({
        where: { booking: { stylist: { businessId } }, status: 'COMPLETED' },
        _sum: { amountAgorot: true },
      }),
      this.prisma.booking.findMany({
        where: { stylist: { businessId } },
        orderBy: { startAt: 'desc' },
        take: 10,
        select: {
          id: true,
          startAt: true,
          status: true,
          client: { select: { name: true, phone: true } },
          service: { select: { nameHe: true, price: true } },
        },
      }),
    ])

    return {
      ...business,
      bookingCount,
      revenueAgorot: revenueAgg._sum?.amountAgorot ?? 0,
      recentBookings,
    }
  }

  // ─── Recent Bookings ───────────────────────────────────────────────────────

  async getRecentBookings(limit = 20) {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        startAt: true,
        status: true,
        createdAt: true,
        client: { select: { name: true, phone: true } },
        service: { select: { nameHe: true, price: true } },
        stylist: { select: { name: true, business: { select: { name: true } } } },
      },
    })
  }

  // ─── Loyalty Credit ────────────────────────────────────────────────────────

  async creditLoyalty(clientId: string, businessId: string, points: number, note: string) {
    const [client, business] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: clientId }, select: { id: true } }),
      this.prisma.business.findUnique({ where: { id: businessId }, select: { id: true } }),
    ])

    if (!client) throw new NotFoundException('לקוח לא נמצא')
    if (!business) throw new NotFoundException('עסק לא נמצא')

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

    return { success: true, pointsGranted: points }
  }

  // ─── Finance Overview ──────────────────────────────────────────────────────

  async getFinance() {
    const now = new Date()
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
    const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - 7)
    const startOfMonth = new Date(now); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

    const [
      revenueToday, revenueWeek, revenueMonth, revenueTotal,
      avgAgg, statusBreakdown, topBusinessesRaw, recentPayments,
    ] = await Promise.all([
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfToday } }, _sum: { amountAgorot: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfWeek } }, _sum: { amountAgorot: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } }, _sum: { amountAgorot: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amountAgorot: true } }),
      this.prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _avg: { amountAgorot: true } }),
      this.prisma.payment.groupBy({ by: ['status'], _count: true }),
      this.prisma.stylist.groupBy({
        by: ['businessId'],
        where: { bookings: { some: { payment: { status: 'COMPLETED' } } } },
        _count: true,
      }),
      this.prisma.payment.findMany({
        where: {},
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, amountAgorot: true, status: true, createdAt: true, cardLast4: true,
          booking: {
            select: {
              client: { select: { name: true } },
              service: { select: { nameHe: true } },
              stylist: { select: { business: { select: { name: true } } } },
            },
          },
        },
      }),
    ])

    // Top businesses by revenue
    const businessIds = topBusinessesRaw.map((r) => r.businessId)
    const businessRevenues = await Promise.all(
      businessIds.map(async (id) => {
        const agg = await this.prisma.payment.aggregate({
          where: { booking: { stylist: { businessId: id } }, status: 'COMPLETED' },
          _sum: { amountAgorot: true },
        })
        const biz = await this.prisma.business.findUnique({ where: { id }, select: { name: true } })
        const bookingCount = await this.prisma.booking.count({ where: { stylist: { businessId: id } } })
        return { id, name: biz?.name ?? '', revenueAgorot: agg._sum?.amountAgorot ?? 0, bookingCount }
      }),
    )
    const topBusinesses = businessRevenues.sort((a, b) => b.revenueAgorot - a.revenueAgorot).slice(0, 5)

    const statusMap: Record<string, number> = {}
    for (const s of statusBreakdown) statusMap[s.status] = s._count

    return {
      revenueToday:    revenueToday._sum?.amountAgorot ?? 0,
      revenueThisWeek: revenueWeek._sum?.amountAgorot ?? 0,
      revenueThisMonth:revenueMonth._sum?.amountAgorot ?? 0,
      revenueTotal:    revenueTotal._sum?.amountAgorot ?? 0,
      avgBookingValue: Math.round(avgAgg._avg?.amountAgorot ?? 0),
      topBusinesses,
      recentPayments,
      paymentStatusBreakdown: statusMap,
    }
  }

  // ─── Pending Business Approvals ───────────────────────────────────────────

  async getPendingBusinesses() {
    return this.prisma.business.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        category: true,
        phone: true,
        createdAt: true,
        owner: { select: { id: true, name: true, phone: true, email: true } },
      },
    })
  }

  async approveBusiness(businessId: string) {
    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: 'APPROVED' },
    })
    return { success: true }
  }

  async rejectBusiness(businessId: string) {
    await this.prisma.business.update({
      where: { id: businessId },
      data: { status: 'REJECTED' },
    })
    return { success: true }
  }

  // ─── Block / Unblock User ──────────────────────────────────────────────────

  async deleteUser(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } })
    return { success: true }
  }
}
