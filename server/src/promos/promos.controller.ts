import {
  Controller, Get, Post, Patch, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common'
import {
  IsString, IsNumber, IsOptional, IsIn, IsDateString, IsBoolean, Min, MaxLength,
} from 'class-validator'
import { PromosService } from './promos.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class CreatePromoDto {
  @IsString() @MaxLength(20) code: string
  @IsIn(['PERCENTAGE', 'FIXED']) discountType: 'PERCENTAGE' | 'FIXED'
  @IsNumber() @Min(1) discountValue: number
  @IsOptional() @IsNumber() @Min(1) maxUses?: number
  @IsOptional() @IsString() serviceId?: string
  @IsOptional() @IsDateString() expiresAt?: string
}

class TogglePromoDto {
  @IsBoolean() isActive: boolean
}

class ValidatePromoDto {
  @IsString() code: string
  @IsString() businessId: string
  @IsString() serviceId: string
  @IsNumber() @Min(0) originalAgorot: number
}

@UseGuards(JwtAuthGuard)
@Controller('promos')
export class PromosController {
  constructor(private promos: PromosService) {}

  // ── Owner endpoints ──────────────────────────────────────────────────────────

  @Get('owner')
  listByOwner(@Request() req: any) {
    return this.promos.listByOwner(req.user.id)
  }

  @Post('owner')
  create(@Request() req: any, @Body() dto: CreatePromoDto) {
    return this.promos.create(req.user.id, dto)
  }

  @Patch('owner/:id/toggle')
  toggle(@Request() req: any, @Param('id') id: string, @Body() dto: TogglePromoDto) {
    return this.promos.toggle(req.user.id, id, dto.isActive)
  }

  // ── Client endpoint ──────────────────────────────────────────────────────────

  @Post('validate')
  validate(@Request() req: any, @Body() dto: ValidatePromoDto) {
    return this.promos.validate(dto.code, dto.businessId, dto.serviceId, req.user.id, dto.originalAgorot)
  }
}
