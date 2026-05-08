import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common'
import { IsString, IsOptional, MaxLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { ComplaintsService } from './complaints.service'

class SubmitComplaintDto {
  @IsString() businessId: string
  @IsString() reason: string
  @IsOptional() @IsString() @MaxLength(1000) description?: string
}

@UseGuards(JwtAuthGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private complaints: ComplaintsService) {}

  @Post()
  submit(@Request() req: any, @Body() dto: SubmitComplaintDto) {
    return this.complaints.submitComplaint(req.user.id, dto.businessId, dto.reason, dto.description)
  }
}
