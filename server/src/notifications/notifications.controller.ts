import { Controller, Post, Get, Delete, Body, Param, Request, UseGuards } from '@nestjs/common'
import { IsString, IsDateString, IsOptional } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { WaitlistService } from './waitlist.service'
import { PrismaService } from '../common/prisma.service'

class RegisterTokenDto {
  @IsString() token: string
}

class JoinWaitlistDto {
  @IsString()              serviceId: string
  @IsDateString()          dateFrom: string
  @IsOptional()
  @IsDateString()          dateTo?: string
}

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private waitlist: WaitlistService,
    private prisma: PrismaService,
  ) {}

  /** App calls this on every launch to keep the device token fresh */
  @Post('register-token')
  async registerToken(@Request() req: any, @Body() dto: RegisterTokenDto) {
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { deviceToken: dto.token },
    })
    return { ok: true }
  }

  @Post('waitlist')
  async joinWaitlist(@Request() req: any, @Body() dto: JoinWaitlistDto) {
    await this.waitlist.join(
      req.user.id,
      dto.serviceId,
      new Date(dto.dateFrom),
      dto.dateTo ? new Date(dto.dateTo) : undefined,
    )
    return { ok: true }
  }

  @Get('waitlist')
  getWaitlist(@Request() req: any) {
    return this.waitlist.getWaitlist(req.user.id)
  }

  @Delete('waitlist/:id')
  async leaveWaitlist(@Request() req: any, @Param('id') id: string) {
    await this.prisma.waitlistEntry.deleteMany({
      where: { id, clientId: req.user.id },
    })
    return { ok: true }
  }
}
