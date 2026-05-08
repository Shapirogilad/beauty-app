import { Controller, Post, Get, Patch, Body, Param, Query, Request, UseGuards } from '@nestjs/common'
import { IsIn, IsString, IsOptional, IsDateString } from 'class-validator'
import { BookingsService } from './bookings.service'
import { CreateBookingDto } from './dto/create-booking.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class ListBookingsQuery {
  @IsIn(['upcoming', 'past']) status: 'upcoming' | 'past' = 'upcoming'
}

class ChangeRequestDto {
  @IsIn(['CANCEL_REFUND', 'RESCHEDULE']) type: 'CANCEL_REFUND' | 'RESCHEDULE'
  @IsDateString() @IsOptional() proposedStart?: string
  @IsString()    @IsOptional() note?: string
}

@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookings.create(req.user.id, dto)
  }

  @Get('mine')
  findMine(@Request() req: any, @Query() q: ListBookingsQuery) {
    return this.bookings.findMyBookings(req.user.id, q.status)
  }

  @Patch(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.bookings.cancel(id, req.user.id)
  }

  @Patch(':id/cancel-by-owner')
  cancelByOwner(@Request() req: any, @Param('id') id: string) {
    return this.bookings.cancelByOwner(id, req.user.id)
  }

  @Patch(':id/confirm')
  confirm(@Request() req: any, @Param('id') id: string) {
    return this.bookings.confirmByOwner(id, req.user.id)
  }

  @Patch(':id/no-show')
  noShow(@Request() req: any, @Param('id') id: string) {
    return this.bookings.markNoShow(id, req.user.id)
  }

  @Post(':id/change-request')
  createChangeRequest(@Request() req: any, @Param('id') id: string, @Body() dto: ChangeRequestDto) {
    return this.bookings.createChangeRequest(req.user.id, id, dto.type, dto.proposedStart, dto.note)
  }

  @Get('change-requests')
  getChangeRequests(@Request() req: any) {
    return this.bookings.getChangeRequestsForOwner(req.user.id)
  }

  @Patch('change-requests/:requestId/approve')
  approveChangeRequest(@Request() req: any, @Param('requestId') requestId: string) {
    return this.bookings.approveChangeRequest(req.user.id, requestId)
  }

  @Patch('change-requests/:requestId/decline')
  declineChangeRequest(@Request() req: any, @Param('requestId') requestId: string) {
    return this.bookings.declineChangeRequest(req.user.id, requestId)
  }
}
