import { Controller, Post, Get, Body, HttpCode, HttpStatus, Request, UseGuards } from '@nestjs/common'
import { IsString, IsEmail, IsDateString, IsIn, MinLength, IsArray, IsOptional, ValidateNested, IsNumber, IsBoolean } from 'class-validator'
import { Type } from 'class-transformer'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'

class RegisterDto {
  @IsString() @MinLength(2) name: string
  @IsString() phone: string
  @IsEmail() email: string
  @IsDateString() dateOfBirth: string
  @IsIn(['FEMALE', 'MALE', 'OTHER']) sex: 'FEMALE' | 'MALE' | 'OTHER'
  @IsString() @MinLength(2) city: string
  @IsOptional() @IsString() address?: string
}

class BreakDto {
  @IsString() start: string
  @IsString() end: string
}

class WorkingHoursEntryDto {
  @IsNumber() dayOfWeek: number
  @IsString() openTime: string
  @IsString() closeTime: string
  @IsBoolean() isClosed: boolean
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BreakDto) breaks?: BreakDto[]
}

class RegisterBusinessDto {
  @IsString() @MinLength(2) name: string
  @IsString() phone: string
  @IsEmail() email: string
  @IsString() @MinLength(2) businessName: string
  @IsString() businessPhone: string
  @IsString() @MinLength(2) address: string
  @IsString() @MinLength(2) city: string
  @IsArray() @IsString({ each: true }) categories: string[]
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => WorkingHoursEntryDto) workingHours?: WorkingHoursEntryDto[]
}

class LoginDto {
  @IsString() phone: string
}

class SendOtpDto {
  @IsString() phone: string
}

class VerifyOtpDto {
  @IsString() phone: string
  @IsString() code: string
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Post('register-business')
  registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.auth.registerBusiness(dto)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone)
  }

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: any) {
    return this.auth.getMe(req.user.id)
  }
}
