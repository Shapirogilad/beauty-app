import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { IsString, Matches } from 'class-validator'
import { SlotsService } from './slots.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class GetSlotsQuery {
  @IsString() stylistId: string
  @IsString() serviceId: string
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string // YYYY-MM-DD
}

@UseGuards(JwtAuthGuard)
@Controller('slots')
export class SlotsController {
  constructor(private slots: SlotsService) {}

  @Get()
  getAvailable(@Query() q: GetSlotsQuery) {
    return this.slots.getAvailableSlots(q.stylistId, q.serviceId, q.date)
  }
}
