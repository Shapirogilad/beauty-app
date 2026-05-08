import { Controller, Get, Request, UseGuards } from '@nestjs/common'
import { ReferralsService } from './referrals.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private referrals: ReferralsService) {}

  /** Returns the user's referral code and list of people they referred */
  @Get('me')
  getReferralInfo(@Request() req: any) {
    return this.referrals.getReferralInfo(req.user.id)
  }
}
