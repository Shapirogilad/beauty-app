import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HealthController } from './health.controller'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { BusinessesModule } from './businesses/businesses.module'
import { StylistsModule } from './stylists/stylists.module'
import { ServicesCatalogModule } from './services-catalog/services-catalog.module'
import { SlotsModule } from './slots/slots.module'
import { BookingsModule } from './bookings/bookings.module'
import { PaymentsModule } from './payments/payments.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './common/prisma.module'
import { EarningsModule } from './earnings/earnings.module'
import { PromosModule } from './promos/promos.module'
import { LoyaltyModule } from './loyalty/loyalty.module'
import { ReferralsModule } from './referrals/referrals.module'
import { ReviewsModule } from './reviews/reviews.module'
import { MessagesModule } from './messages/messages.module'
import { AdminModule } from './admin/admin.module'
import { ComplaintsModule } from './complaints/complaints.module'

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    StylistsModule,
    ServicesCatalogModule,
    SlotsModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    EarningsModule,
    PromosModule,
    LoyaltyModule,
    ReferralsModule,
    ReviewsModule,
    MessagesModule,
    AdminModule,
    ComplaintsModule,
  ],
})
export class AppModule {}
