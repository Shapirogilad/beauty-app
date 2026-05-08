import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class PromosService {
  constructor(private prisma: PrismaService) {}

  private async getBusinessId(ownerId: string) {
    const biz = await this.prisma.business.findUnique({ where: { ownerId }, select: { id: true } })
    if (!biz) throw new NotFoundException()
    return biz.id
  }

  // ── Owner operations ──────────────────────────────────────────────────────

  listByOwner(ownerId: string) {
    return this.getBusinessId(ownerId).then((businessId) =>
      this.prisma.promo.findMany({ where: { businessId }, orderBy: { createdAt: 'desc' } }),
    )
  }

  async create(ownerId: string, data: {
    code: string
    discountType: 'PERCENTAGE' | 'FIXED'
    discountValue: number
    maxUses?: number
    serviceId?: string
    expiresAt?: string
  }) {
    const businessId = await this.getBusinessId(ownerId)
    const code = data.code.toUpperCase().trim()

    const exists = await this.prisma.promo.findUnique({ where: { businessId_code: { businessId, code } } })
    if (exists) throw new BadRequestException('קוד זה כבר קיים')

    return this.prisma.promo.create({
      data: {
        businessId,
        code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses ?? null,
        serviceId: data.serviceId ?? null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      },
    })
  }

  async toggle(ownerId: string, promoId: string, isActive: boolean) {
    const businessId = await this.getBusinessId(ownerId)
    return this.prisma.promo.update({ where: { id: promoId, businessId }, data: { isActive } })
  }

  // ── Client — validate a code before payment ───────────────────────────────

  async validate(code: string, businessId: string, serviceId: string, clientId: string, originalAgorot: number) {
    const promo = await this.prisma.promo.findUnique({
      where: { businessId_code: { businessId, code: code.toUpperCase() } },
    })

    if (!promo || !promo.isActive) throw new BadRequestException('קוד הנחה לא תקין')
    if (promo.expiresAt && promo.expiresAt < new Date()) throw new BadRequestException('קוד ההנחה פג תוקף')
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) throw new BadRequestException('קוד ההנחה מוצה')
    if (promo.serviceId && promo.serviceId !== serviceId) throw new BadRequestException('קוד זה אינו תקף לשירות זה')

    // Check client hasn't used this promo before
    const alreadyUsed = await this.prisma.booking.findFirst({
      where: { clientId, promoId: promo.id },
    })
    if (alreadyUsed) throw new BadRequestException('כבר השתמשת בקוד זה')

    const discountAgorot = promo.discountType === 'PERCENTAGE'
      ? Math.round(originalAgorot * promo.discountValue / 100)
      : Math.min(promo.discountValue, originalAgorot)

    return {
      promoId: promo.id,
      code: promo.code,
      discountAgorot,
      finalAgorot: Math.max(0, originalAgorot - discountAgorot),
      discountType: promo.discountType,
      discountValue: promo.discountValue,
    }
  }

  /** Called after payment succeeds — increments usage counter */
  async recordUse(promoId: string) {
    await this.prisma.promo.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    })
  }
}
