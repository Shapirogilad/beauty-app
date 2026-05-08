import {
  Controller, Get, Post, Body, Query, Request, UseGuards,
} from '@nestjs/common'
import { IsString, IsNumber, IsOptional, Min, MaxLength } from 'class-validator'
import { LoyaltyService } from './loyalty.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class GetAccountDto {
  @IsString() businessId: string
}

class PreviewRedemptionDto {
  @IsString() businessId: string
  @IsNumber() @Min(1) pointsToRedeem: number
}

class ManualGrantDto {
  @IsString() clientId: string
  @IsString() businessId: string
  @IsNumber() @Min(1) points: number
  @IsOptional() @IsString() @MaxLength(100) note?: string
}

@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyalty: LoyaltyService) {}

  /** Client: get their loyalty balance + recent transactions for a business */
  @Get('account')
  getAccount(@Request() req: any, @Query() q: GetAccountDto) {
    return this.loyalty.getAccount(req.user.id, q.businessId)
  }

  /** Client: get all loyalty accounts across all businesses */
  @Get('all')
  getAllAccounts(@Request() req: any) {
    return this.loyalty.getAllAccounts(req.user.id)
  }

  /** Client: preview discount before redeeming */
  @Post('preview')
  previewRedemption(@Request() req: any, @Body() dto: PreviewRedemptionDto) {
    return this.loyalty.previewRedemption(req.user.id, dto.businessId, dto.pointsToRedeem)
  }

  /** Owner: grant points manually to a client */
  @Post('grant')
  manualGrant(@Request() req: any, @Body() dto: ManualGrantDto) {
    return this.loyalty.manualGrant(req.user.id, dto.clientId, dto.businessId, dto.points, dto.note ?? '')
  }
}
