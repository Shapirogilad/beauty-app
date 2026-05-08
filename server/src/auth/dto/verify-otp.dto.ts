import { IsString, Matches, Length } from 'class-validator'

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+9725\d{8}$/, { message: 'מספר טלפון ישראלי לא תקין' })
  phone: string

  @IsString()
  @Length(6, 6, { message: 'קוד OTP חייב להיות 6 ספרות' })
  otp: string
}
