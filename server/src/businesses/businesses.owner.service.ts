import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import * as fs from 'fs'
import { join } from 'path'

@Injectable()
export class BusinessesOwnerService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(ownerId: string): Promise<string> {
    const biz = await this.prisma.business.findUnique({ where: { ownerId }, select: { id: true } })
    if (!biz) throw new NotFoundException('לא נמצא עסק עבור משתמש זה')
    return biz.id
  }

  async getStats(ownerId: string) {
    const businessId = await this.getBusinessId(ownerId)
    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

    const [todayBookings, weekBookings, pending] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          service: { businessId },
          startAt: { gte: todayStart, lte: todayEnd },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        include: { payment: { select: { amountAgorot: true } } },
      }),
      this.prisma.booking.findMany({
        where: {
          service: { businessId },
          startAt: { gte: weekStart, lte: weekEnd },
          status: { in: ['CONFIRMED', 'COMPLETED'] },
        },
        include: { payment: { select: { amountAgorot: true } } },
      }),
      this.prisma.booking.count({
        where: { service: { businessId }, status: 'PENDING' },
      }),
    ])

    return {
      todayCount: todayBookings.length,
      todayRevenue: todayBookings.reduce((s, b) => s + (b.payment?.amountAgorot ?? 0), 0),
      weekCount: weekBookings.length,
      weekRevenue: weekBookings.reduce((s, b) => s + (b.payment?.amountAgorot ?? 0), 0),
      pendingCount: pending,
    }
  }

  async getSchedule(ownerId: string, dateStr: string) {
    const businessId = await this.getBusinessId(ownerId)
    const date = new Date(dateStr)
    return this.prisma.booking.findMany({
      where: {
        service: { businessId },
        startAt: { gte: startOfDay(date), lte: endOfDay(date) },
      },
      include: {
        client: { select: { name: true, phone: true } },
        service: { select: { nameHe: true, price: true } },
        stylist: { select: { id: true, name: true } },
        payment: { select: { id: true, status: true, amountAgorot: true, cardLast4: true } },
      },
      orderBy: { startAt: 'asc' },
    })
  }

  async getWaitlist(ownerId: string, dateStr: string) {
    const businessId = await this.getBusinessId(ownerId)
    const date = new Date(dateStr)
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
    const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999)
    return this.prisma.waitlistEntry.findMany({
      where: {
        service: { businessId },
        date: { gte: dayStart, lte: dayEnd },
        notifiedAt: null,
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        service: { select: { id: true, nameHe: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async getServices(ownerId: string) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.service.findMany({ where: { businessId } })
  }

  async createService(ownerId: string, data: {
    nameHe: string; price: number; durationMinutes: number; slotIntervalMinutes: number
  }) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.service.create({ data: { ...data, businessId } })
  }

  async updateService(ownerId: string, serviceId: string, data: Partial<{
    nameHe: string; price: number; durationMinutes: number; slotIntervalMinutes: number; isActive: boolean
  }>) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.service.update({
      where: { id: serviceId, businessId },
      data,
    })
  }

  async getWorkingHours(ownerId: string) {
    const businessId = await this.getBusinessId(ownerId)
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: { stylists: { where: { isActive: true }, include: { workingHours: true }, take: 1 } },
    })
    return biz?.stylists[0]?.workingHours ?? []
  }

  // ─── Business Profile ─────────────────────────────────────────────────────

  async getBusinessProfile(ownerId: string) {
    const biz = await this.prisma.business.findUnique({
      where: { ownerId },
      select: {
        id: true, name: true, description: true, phone: true,
        address: true, category: true, photos: true, workPhotos: true,
        owner: { select: { name: true, email: true, phone: true } },
      },
    })
    if (!biz) throw new NotFoundException('לא נמצא עסק')
    return biz
  }

  async updateBusinessProfile(ownerId: string, data: {
    name?: string; description?: string; phone?: string
    address?: string; city?: string; categories?: string[]
  }) {
    const businessId = await this.getBusinessId(ownerId)
    const update: any = {}
    if (data.name !== undefined)        update.name = data.name
    if (data.description !== undefined) update.description = data.description
    if (data.phone !== undefined)       update.phone = data.phone
    if (data.categories !== undefined)  update.category = data.categories
    if (data.address !== undefined || data.city !== undefined) {
      const existing = await this.prisma.business.findUnique({
        where: { id: businessId }, select: { address: true },
      })
      const parts = (existing?.address ?? '').split(', ')
      const currentStreet = parts.slice(0, -1).join(', ')
      const currentCity   = parts[parts.length - 1] ?? ''
      const newStreet = data.address ?? currentStreet
      const newCity   = data.city   ?? currentCity
      update.address = `${newStreet}, ${newCity}`
      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(update.address)}&format=json&limit=1&countrycodes=il`
        const res = await fetch(url, { headers: { 'User-Agent': 'DuraServer/1.0' } })
        const json = await res.json()
        if (json?.[0]) { update.lat = parseFloat(json[0].lat); update.lng = parseFloat(json[0].lon) }
      } catch { /* keep existing coords */ }
    }
    return this.prisma.business.update({ where: { id: businessId }, data: update })
  }

  async updateOwnerInfo(ownerId: string, data: { name?: string; email?: string }) {
    return this.prisma.user.update({ where: { id: ownerId }, data })
  }

  async addPhoto(ownerId: string, type: 'business' | 'work', url: string) {
    const businessId = await this.getBusinessId(ownerId)
    const field = type === 'business' ? 'photos' : 'workPhotos'
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId }, select: { [field]: true },
    }) as any
    const current: string[] = biz[field] ?? []
    return this.prisma.business.update({
      where: { id: businessId },
      data: { [field]: [...current, url] },
      select: { photos: true, workPhotos: true },
    })
  }

  async removePhoto(ownerId: string, type: 'business' | 'work', url: string) {
    const businessId = await this.getBusinessId(ownerId)
    const field = type === 'business' ? 'photos' : 'workPhotos'
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId }, select: { [field]: true },
    }) as any
    const current: string[] = biz[field] ?? []
    const updated = current.filter((u) => u !== url)
    // Delete file from disk if it's a local upload
    try {
      const filename = url.split('/uploads/')[1]
      if (filename) {
        const filePath = join(process.cwd(), 'uploads', filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
    } catch { /* ignore */ }
    return this.prisma.business.update({
      where: { id: businessId },
      data: { [field]: updated },
      select: { photos: true, workPhotos: true },
    })
  }

  // ─── Stylists ─────────────────────────────────────────────────────────────

  async getStylists(ownerId: string) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.stylist.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createStylist(ownerId: string, data: {
    name: string; bio?: string; specialties?: string[]; instagram?: string
  }) {
    const businessId = await this.getBusinessId(ownerId)
    const stylist = await this.prisma.stylist.create({
      data: {
        businessId,
        name: data.name,
        bio: data.bio,
        specialties: data.specialties ?? [],
        instagram: data.instagram,
      },
    })
    // Create default working hours for new stylist
    const DEFAULT_HOURS = [0,1,2,3,4,5,6].map((d) => ({
      stylistId: stylist.id,
      dayOfWeek: d,
      openTime: '09:00',
      closeTime: d === 5 ? '14:00' : '20:00',
      isClosed: d === 6,
      breaks: [],
    }))
    await this.prisma.workingHours.createMany({ data: DEFAULT_HOURS })
    return stylist
  }

  async updateStylist(ownerId: string, stylistId: string, data: {
    name?: string; bio?: string; specialties?: string[]; instagram?: string; isActive?: boolean
  }) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.stylist.update({
      where: { id: stylistId, businessId },
      data,
    })
  }

  async getStylistServices(ownerId: string, stylistId: string) {
    const businessId = await this.getBusinessId(ownerId)
    const [allServices, offered] = await Promise.all([
      this.prisma.service.findMany({
        where: { businessId, isActive: true },
        select: { id: true, nameHe: true, price: true, durationMinutes: true },
        orderBy: { nameHe: 'asc' },
      }),
      this.prisma.stylistService.findMany({
        where: { stylistId, service: { businessId } },
        select: { serviceId: true },
      }),
    ])
    const offeredIds = new Set(offered.map((o) => o.serviceId))
    return allServices.map((s) => ({ ...s, offered: offeredIds.has(s.id) }))
  }

  async setStylistServices(ownerId: string, stylistId: string, serviceIds: string[]) {
    const businessId = await this.getBusinessId(ownerId)
    // Verify stylist belongs to this business
    const stylist = await this.prisma.stylist.findUnique({
      where: { id: stylistId, businessId }, select: { id: true },
    })
    if (!stylist) throw new Error('מעצבת לא נמצאה')

    // Replace all assignments atomically
    await this.prisma.$transaction([
      this.prisma.stylistService.deleteMany({ where: { stylistId } }),
      ...(serviceIds.length > 0
        ? [this.prisma.stylistService.createMany({
            data: serviceIds.map((serviceId) => ({ stylistId, serviceId })),
            skipDuplicates: true,
          })]
        : []),
    ])
    return this.getStylistServices(ownerId, stylistId)
  }

  async updateStylistPhoto(ownerId: string, stylistId: string, photoUrl: string) {
    const businessId = await this.getBusinessId(ownerId)
    // Delete old photo from disk if local
    const existing = await this.prisma.stylist.findUnique({
      where: { id: stylistId, businessId }, select: { photo: true },
    })
    if (existing?.photo) {
      try {
        const filename = existing.photo.split('/uploads/')[1]
        if (filename) {
          const filePath = join(process.cwd(), 'uploads', filename)
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
        }
      } catch { /* ignore */ }
    }
    return this.prisma.stylist.update({
      where: { id: stylistId, businessId },
      data: { photo: photoUrl },
    })
  }

  // ─── Date Exceptions ──────────────────────────────────────────────────────

  async getDateExceptions(ownerId: string) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.businessDateException.findMany({
      where: { businessId },
      orderBy: { date: 'asc' },
    })
  }

  async upsertDateException(ownerId: string, date: string, data: {
    isClosed: boolean; openTime?: string; closeTime?: string
    breaks?: { start: string; end: string }[]; note?: string
  }) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.businessDateException.upsert({
      where: { businessId_date: { businessId, date } },
      create: { businessId, date, ...data },
      update: data,
    })
  }

  async deleteDateException(ownerId: string, date: string) {
    const businessId = await this.getBusinessId(ownerId)
    await this.prisma.businessDateException.deleteMany({ where: { businessId, date } })
  }

  async saveWorkingHours(ownerId: string, hours: Array<{
    dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean
    breaks?: { start: string; end: string }[]
  }>) {
    const businessId = await this.getBusinessId(ownerId)
    const stylist = await this.prisma.stylist.findFirst({ where: { businessId, isActive: true } })
    if (!stylist) throw new NotFoundException('לא נמצאה מעצבת לעסק זה')

    await this.prisma.$transaction(
      hours.map((h) =>
        this.prisma.workingHours.upsert({
          where: { stylistId_dayOfWeek: { stylistId: stylist.id, dayOfWeek: h.dayOfWeek } },
          create: { stylistId: stylist.id, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed, breaks: h.breaks ?? [] },
          update: { openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed, breaks: h.breaks ?? [] },
        }),
      ),
    )
  }
}
