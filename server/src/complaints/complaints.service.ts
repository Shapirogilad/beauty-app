import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class ComplaintsService {
  constructor(private prisma: PrismaService) {}

  async submitComplaint(clientId: string, businessId: string, reason: string, description?: string) {
    await this.prisma.business.findUniqueOrThrow({ where: { id: businessId }, select: { id: true } })
    return this.prisma.complaint.create({
      data: { clientId, businessId, reason, description },
    })
  }

  async getComplaints(status?: string) {
    return this.prisma.complaint.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        client:   { select: { id: true, name: true, phone: true } },
      },
    })
  }

  async updateStatus(id: string, status: string) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } })
    if (!complaint) throw new NotFoundException()
    return this.prisma.complaint.update({ where: { id }, data: { status } })
  }
}
