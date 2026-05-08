import {
  Controller, Get, Post, Patch, Put, Delete, Body, Param, Query,
  Request, UseGuards, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { IsString, IsNumber, IsBoolean, IsOptional, IsArray, IsIn,
  ValidateNested, Min, Matches } from 'class-validator'
import { Type } from 'class-transformer'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import { BusinessesOwnerService } from './businesses.owner.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

const photoStorage = diskStorage({
  destination: join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname)}`)
  },
})

class UpdateBusinessProfileDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsString() address?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[]
}

class UpdateOwnerInfoDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() email?: string
}

class RemovePhotoDto {
  @IsIn(['business', 'work']) type: 'business' | 'work'
  @IsString() url: string
}

class CreateStylistDto {
  @IsString() name: string
  @IsOptional() @IsString() bio?: string
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[]
  @IsOptional() @IsString() instagram?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

class SetStylistServicesDto {
  @IsArray() @IsString({ each: true }) serviceIds: string[]
}

class UpdateStylistDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() bio?: string
  @IsOptional() @IsArray() @IsString({ each: true }) specialties?: string[]
  @IsOptional() @IsString() instagram?: string
  @IsOptional() @IsBoolean() isActive?: boolean
}

class CreateServiceDto {
  @IsString() nameHe: string
  @IsNumber() @Min(1) price: number
  @IsNumber() @Min(1) durationMinutes: number
  @IsNumber() @IsIn([15, 30, 60]) slotIntervalMinutes: number
}

class UpdateServiceDto {
  @IsOptional() @IsString() nameHe?: string
  @IsOptional() @IsNumber() @Min(1) price?: number
  @IsOptional() @IsNumber() @Min(1) durationMinutes?: number
  @IsOptional() @IsNumber() @IsIn([15, 30, 60]) slotIntervalMinutes?: number
  @IsOptional() @IsBoolean() isActive?: boolean
}

class BreakDto {
  @IsString() start: string
  @IsString() end: string
}

class WorkingHoursEntryDto {
  @IsNumber() @IsIn([0,1,2,3,4,5,6]) dayOfWeek: number
  @IsString() @Matches(/^\d{2}:\d{2}$/) openTime: string
  @IsString() @Matches(/^\d{2}:\d{2}$/) closeTime: string
  @IsBoolean() isClosed: boolean
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BreakDto) breaks?: BreakDto[]
}

class SaveWorkingHoursDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursEntryDto)
  hours: WorkingHoursEntryDto[]
}

class ScheduleQueryDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string
}

class UpsertDateExceptionDto {
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string
  @IsBoolean() isClosed: boolean
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) openTime?: string
  @IsOptional() @IsString() @Matches(/^\d{2}:\d{2}$/) closeTime?: string
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BreakDto) breaks?: BreakDto[]
  @IsOptional() @IsString() note?: string
}

@UseGuards(JwtAuthGuard)
@Controller('businesses/owner')
export class BusinessesOwnerController {
  constructor(private owner: BusinessesOwnerService) {}

  // ─── Business Profile ───────────────────────────────────────────────────────

  @Get('business')
  getBusinessProfile(@Request() req: any) {
    return this.owner.getBusinessProfile(req.user.id)
  }

  @Patch('business')
  updateBusinessProfile(@Request() req: any, @Body() dto: UpdateBusinessProfileDto) {
    return this.owner.updateBusinessProfile(req.user.id, dto)
  }

  @Patch('owner-info')
  updateOwnerInfo(@Request() req: any, @Body() dto: UpdateOwnerInfoDto) {
    return this.owner.updateOwnerInfo(req.user.id, dto)
  }

  @Post('photos')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  async uploadPhoto(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('type') type: string,
  ) {
    if (!file) throw new BadRequestException('לא נשלח קובץ')
    if (type !== 'business' && type !== 'work') throw new BadRequestException('type חייב להיות business או work')
    // Build public URL — same host but without /api/v1 prefix
    const host = req.headers.host || 'localhost:3000'
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const url = `${protocol}://${host}/uploads/${file.filename}`
    return this.owner.addPhoto(req.user.id, type, url)
  }

  @Delete('photos')
  removePhoto(@Request() req: any, @Body() dto: RemovePhotoDto) {
    return this.owner.removePhoto(req.user.id, dto.type, dto.url)
  }

  // ─── Stylists ───────────────────────────────────────────────────────────────

  @Get('stylists')
  getStylists(@Request() req: any) {
    return this.owner.getStylists(req.user.id)
  }

  @Post('stylists')
  createStylist(@Request() req: any, @Body() dto: CreateStylistDto) {
    return this.owner.createStylist(req.user.id, dto)
  }

  @Patch('stylists/:id')
  updateStylist(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateStylistDto) {
    return this.owner.updateStylist(req.user.id, id, dto)
  }

  @Get('stylists/:id/services')
  getStylistServices(@Request() req: any, @Param('id') id: string) {
    return this.owner.getStylistServices(req.user.id, id)
  }

  @Put('stylists/:id/services')
  setStylistServices(@Request() req: any, @Param('id') id: string, @Body() dto: SetStylistServicesDto) {
    return this.owner.setStylistServices(req.user.id, id, dto.serviceIds)
  }

  @Post('stylists/:id/photo')
  @UseInterceptors(FileInterceptor('photo', { storage: photoStorage }))
  async uploadStylistPhoto(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('לא נשלח קובץ')
    const host = req.headers.host || 'localhost:3000'
    const protocol = req.headers['x-forwarded-proto'] || 'http'
    const url = `${protocol}://${host}/uploads/${file.filename}`
    return this.owner.updateStylistPhoto(req.user.id, id, url)
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  @Get('stats')
  getStats(@Request() req: any) {
    return this.owner.getStats(req.user.id)
  }

  @Get('schedule')
  getSchedule(@Request() req: any, @Query() q: ScheduleQueryDto) {
    return this.owner.getSchedule(req.user.id, q.date)
  }

  @Get('waitlist')
  getWaitlist(@Request() req: any, @Query() q: ScheduleQueryDto) {
    return this.owner.getWaitlist(req.user.id, q.date)
  }

  @Get('services')
  getServices(@Request() req: any) {
    return this.owner.getServices(req.user.id)
  }

  @Post('services')
  createService(@Request() req: any, @Body() dto: CreateServiceDto) {
    return this.owner.createService(req.user.id, dto)
  }

  @Patch('services/:id')
  updateService(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.owner.updateService(req.user.id, id, dto)
  }

  @Get('working-hours')
  getWorkingHours(@Request() req: any) {
    return this.owner.getWorkingHours(req.user.id)
  }

  @Put('working-hours')
  saveWorkingHours(@Request() req: any, @Body() dto: SaveWorkingHoursDto) {
    return this.owner.saveWorkingHours(req.user.id, dto.hours)
  }

  // ─── Date Exceptions ───────────────────────────────────────────────────────

  @Get('date-exceptions')
  getDateExceptions(@Request() req: any) {
    return this.owner.getDateExceptions(req.user.id)
  }

  @Put('date-exceptions')
  upsertDateException(@Request() req: any, @Body() dto: UpsertDateExceptionDto) {
    const { date, ...data } = dto
    return this.owner.upsertDateException(req.user.id, date, data)
  }

  @Delete('date-exceptions/:date')
  deleteDateException(@Request() req: any, @Param('date') date: string) {
    return this.owner.deleteDateException(req.user.id, date)
  }
}
