import { Controller, Post, Get, Delete, Body, Param, Request, UseGuards } from '@nestjs/common'
import { IsString, IsBoolean, IsOptional, Length, Matches } from 'class-validator'
import { PaymentsService } from './payments.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

class ChargeCardDto {
  @IsString() bookingId: string
  @IsString() @Length(13, 19) ccno: string
  @IsString() @Matches(/^\d{4}$/) expdate: string  // MMYY
  @IsString() @Length(3, 4)    cvv: string
  @IsBoolean() @IsOptional()   saveCard: boolean = false
  @IsBoolean() @IsOptional()   useWallet: boolean = false
}

class ChargeTokenDto {
  @IsString() bookingId: string
  @IsString() savedCardId: string
  @IsBoolean() @IsOptional()   useWallet: boolean = false
}

class PayWalletOnlyDto {
  @IsString() bookingId: string
}

class AddCardDto {
  @IsString() @Length(13, 19) ccno: string
  @IsString() @Matches(/^\d{4}$/) expdate: string
  @IsString() @Length(3, 4)    cvv: string
}

class RefundByOwnerDto {
  @IsString() bookingId: string
}

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post('charge')
  charge(@Request() req: any, @Body() dto: ChargeCardDto) {
    return this.payments.charge(req.user.id, dto)
  }

  @Post('charge-token')
  chargeToken(@Request() req: any, @Body() dto: ChargeTokenDto) {
    return this.payments.chargeWithToken(req.user.id, dto.bookingId, dto.savedCardId, dto.useWallet)
  }

  @Post('pay-wallet-only')
  payWalletOnly(@Request() req: any, @Body() dto: PayWalletOnlyDto) {
    return this.payments.payWithWalletOnly(req.user.id, dto.bookingId)
  }

  @Get('saved-cards')
  getSavedCards(@Request() req: any) {
    return this.payments.getSavedCards(req.user.id)
  }

  @Post('add-card')
  addCard(@Request() req: any, @Body() dto: AddCardDto) {
    return this.payments.addCard(req.user.id, dto)
  }

  @Post('refund-by-owner')
  refundByOwner(@Request() req: any, @Body() dto: RefundByOwnerDto) {
    return this.payments.refundByOwner(req.user.id, dto.bookingId)
  }

  @Delete('saved-cards/:id')
  deleteCard(@Request() req: any, @Param('id') id: string) {
    return this.payments.deleteCard(req.user.id, id)
  }
}
