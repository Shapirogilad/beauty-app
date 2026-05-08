import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common'
import { IsString, IsNumber, Min, IsOptional, IsIn } from 'class-validator'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'
import { ComplaintsService } from '../complaints/complaints.service'

class CreditLoyaltyDto {
  @IsString() clientId: string
  @IsString() businessId: string
  @IsNumber() @Min(1) points: number
  @IsOptional() @IsString() note?: string
}

class UpdateComplaintStatusDto {
  @IsString() @IsIn(['OPEN', 'REVIEWED', 'DISMISSED']) status: string
}

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private complaints: ComplaintsService,
  ) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats()
  }

  @Get('clients')
  getClients(@Query('search') search?: string) {
    return this.admin.getClients(search)
  }

  @Get('clients/:id')
  getClient(@Param('id') id: string) {
    return this.admin.getClient(id)
  }

  @Get('businesses')
  getBusinesses(@Query('search') search?: string) {
    return this.admin.getBusinesses(search)
  }

  @Get('businesses/pending')
  getPendingBusinesses() {
    return this.admin.getPendingBusinesses()
  }

  @Get('businesses/:id')
  getBusiness(@Param('id') id: string) {
    return this.admin.getBusiness(id)
  }

  @Get('bookings')
  getRecentBookings(@Query('limit') limit?: string) {
    return this.admin.getRecentBookings(limit ? parseInt(limit, 10) : 20)
  }

  @Post('loyalty/credit')
  creditLoyalty(@Body() dto: CreditLoyaltyDto) {
    return this.admin.creditLoyalty(
      dto.clientId,
      dto.businessId,
      dto.points,
      dto.note ?? 'הענקה ידנית על ידי מנהל מערכת',
    )
  }

  @Get('finance')
  getFinance() {
    return this.admin.getFinance()
  }

  @Patch('businesses/:id/approve')
  approveBusiness(@Param('id') id: string) {
    return this.admin.approveBusiness(id)
  }

  @Patch('businesses/:id/reject')
  rejectBusiness(@Param('id') id: string) {
    return this.admin.rejectBusiness(id)
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id)
  }

  @Get('complaints')
  getComplaints(@Query('status') status?: string) {
    return this.complaints.getComplaints(status)
  }

  @Patch('complaints/:id/status')
  updateComplaintStatus(@Param('id') id: string, @Body() dto: UpdateComplaintStatusDto) {
    return this.complaints.updateStatus(id, dto.status)
  }
}
