import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id } })
  }

  updateMe(id: string, data: { name?: string; photo?: string }) {
    return this.prisma.user.update({ where: { id }, data })
  }
}
