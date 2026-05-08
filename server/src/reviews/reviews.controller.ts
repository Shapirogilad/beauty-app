import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { CreateReviewDto } from './dto/create-review.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.reviews.create(req.user.id, dto)
  }
}
