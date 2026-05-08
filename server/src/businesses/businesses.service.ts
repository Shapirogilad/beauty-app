import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { QueryBusinessesDto } from './dto/query-businesses.dto'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryBusinessesDto) {
    const { category, lat, lng, search, sort, page = 1, pageSize = 10 } = query

    const businesses = await this.prisma.business.findMany({
      where: {
        isActive: true,
        ...(category && { category: { has: category } }),
        ...(search && {
          name: { contains: search, mode: 'insensitive' },
        }),
      },
      include: {
        _count: { select: { stylists: true } },
        stylists: {
          include: {
            bookings: {
              include: { service: { select: { price: true } } },
            },
          },
          take: 1,
        },
      },
    })

    // Compute rating from reviews for each business
    const withRating = await Promise.all(
      businesses.map(async (b) => {
        const agg = await this.prisma.review.aggregate({
          where: { booking: { service: { businessId: b.id } } },
          _avg: { rating: true },
          _count: { rating: true },
        })

        const distanceKm =
          lat !== undefined && lng !== undefined
            ? haversineKm(lat, lng, b.lat, b.lng)
            : undefined

        return {
          id: b.id,
          name: b.name,
          category: b.category,
          address: b.address,
          lat: b.lat,
          lng: b.lng,
          photos: b.photos,
          rating: agg._avg.rating ?? 0,
          reviewCount: agg._count.rating,
          distanceKm,
        }
      }),
    )

    // Sort
    const sorted = [...withRating].sort((a, b) => {
      if (sort === 'distance' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm
      }
      return b.rating - a.rating
    })

    // Paginate
    const total = sorted.length
    const start = (page - 1) * pageSize
    const data = sorted.slice(start, start + pageSize)

    return { data, total, page, pageSize }
  }

  /** Returns active stylists who can perform a given service.
   *  If no stylist has any service assignments yet, returns all active stylists
   *  (backwards-compatible — a business that hasn't configured assignments gets all). */
  async getStylistsForService(businessId: string, serviceId: string) {
    const assigned = await this.prisma.stylistService.findMany({
      where: { serviceId, stylist: { businessId, isActive: true } },
      select: {
        stylist: { select: { id: true, name: true, photo: true, bio: true, specialties: true, instagram: true } },
      },
    })

    // If nobody is assigned, fall back to all active stylists
    if (assigned.length === 0) {
      return this.prisma.stylist.findMany({
        where: { businessId, isActive: true },
        select: { id: true, name: true, photo: true, bio: true, specialties: true, instagram: true },
      })
    }

    return assigned.map((a) => a.stylist)
  }

  async getService(serviceId: string) {
    return this.prisma.service.findUniqueOrThrow({
      where: { id: serviceId },
      select: { id: true, nameHe: true, price: true, durationMinutes: true },
    })
  }

  async findOne(id: string) {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id },
      include: {
        stylists: {
          where: { isActive: true },
          select: { id: true, name: true, photo: true, bio: true, specialties: true, instagram: true },
        },
        services: {
          where: { isActive: true },
          select: { id: true, nameHe: true, price: true, durationMinutes: true, slotIntervalMinutes: true },
        },
      },
    })

    const [ratingAgg, recentReviews] = await Promise.all([
      this.prisma.review.aggregate({
        where: { booking: { service: { businessId: id } } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.review.findMany({
        where: { booking: { service: { businessId: id } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          rating: true,
          text: true,
          photos: true,
          createdAt: true,
          client: { select: { name: true } },
        },
      }),
    ])

    return {
      id: business.id,
      name: business.name,
      description: business.description,
      category: business.category,
      address: business.address,
      phone: business.phone,
      lat: business.lat,
      lng: business.lng,
      photos: business.photos,
      workPhotos: business.workPhotos,
      rating: ratingAgg._avg.rating ?? 0,
      reviewCount: ratingAgg._count.rating,
      services: business.services,
      stylists: business.stylists,
      reviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        photos: r.photos,
        clientName: r.client.name,
        createdAt: r.createdAt.toISOString(),
      })),
    }
  }
}
