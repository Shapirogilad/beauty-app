import { Module } from '@nestjs/common'
import { AdminService } from './admin.service'
import { AdminController } from './admin.controller'
import { ComplaintsModule } from '../complaints/complaints.module'

@Module({
  imports: [ComplaintsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
