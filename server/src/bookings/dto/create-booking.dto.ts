import { IsString, IsISO8601, IsOptional, IsInt, Min } from 'class-validator'

export class CreateBookingDto {
  @IsString() stylistId: string
  @IsString() serviceId: string
  @IsISO8601() slotStart: string

  @IsOptional() @IsString() promoId?: string
  @IsOptional() @IsInt() @Min(0) loyaltyPointsToRedeem?: number
}
