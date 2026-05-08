import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { BusinessesService } from './businesses.service'
import { QueryBusinessesDto } from './dto/query-businesses.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private businesses: BusinessesService) {}

  @Get()
  findAll(@Query() query: QueryBusinessesDto) {
    return this.businesses.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businesses.findOne(id)
  }

  @Get(':id/stylists-for-service/:serviceId')
  getStylistsForService(@Param('id') id: string, @Param('serviceId') serviceId: string) {
    return this.businesses.getStylistsForService(id, serviceId)
  }

  @Get('service/:serviceId')
  getService(@Param('serviceId') serviceId: string) {
    return this.businesses.getService(serviceId)
  }
}
