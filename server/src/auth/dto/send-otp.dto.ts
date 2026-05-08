import { IsString, Matches } from 'class-validator'

export class SendOtpDto {
  @IsString()
  @Matches(/^\+9725\d{8}$/, { message: 'מספר טלפון ישראלי לא תקין' })
  phone: string
}
