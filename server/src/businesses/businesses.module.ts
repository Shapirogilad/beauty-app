import { Module } from '@nestjs/common'
import { BusinessesController } from './businesses.controller'
import { BusinessesService } from './businesses.service'
import { BusinessesOwnerController } from './businesses.owner.controller'
import { BusinessesOwnerService } from './businesses.owner.service'

@Module({
  controllers: [BusinessesController, BusinessesOwnerController],
  providers: [BusinessesService, BusinessesOwnerService],
  exports: [BusinessesService],
})
export class BusinessesModule {}
