import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common'
import { IsNumberString, IsDateString, IsOptional } from 'class-validator'
import { EarningsService } from './earnings.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class MonthlyQueryDto {
  @IsNumberString() year: string
}

class RangeQueryDto {
  @IsDateString() from: string
  @IsDateString() to: string
}

@UseGuards(JwtAuthGuard)
@Controller('earnings')
export class EarningsController {
  constructor(private earnings: EarningsService) {}

  @Get('monthly')
  getMonthly(@Request() req: any, @Query() q: MonthlyQueryDto) {
    return this.earnings.getMonthly(req.user.id, +q.year)
  }

  @Get('by-service')
  getByService(@Request() req: any, @Query() q: RangeQueryDto) {
    return this.earnings.getByService(req.user.id, q.from, q.to)
  }

  @Get('by-stylist')
  getByStylist(@Request() req: any, @Query() q: RangeQueryDto) {
    return this.earnings.getByStylist(req.user.id, q.from, q.to)
  }
}
