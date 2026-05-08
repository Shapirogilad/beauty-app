import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { CreateReviewDto } from './dto/create-review.dto'

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(clientId: string, dto: CreateReviewDto) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { review: { select: { id: true } } },
    })
    if (!booking) throw new NotFoundException('הזמנה לא נמצאה')
    if (booking.clientId !== clientId) throw new ForbiddenException()
    if (booking.review) throw new ConflictException('כבר נתת ביקורת על הזמנה זו')

    return this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        clientId,
        rating: dto.rating,
        text: dto.text,
      },
    })
  }
}
