import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../common/prisma.service'

const ADMIN_PHONE = '+972599999999'

function generateOtp(phone: string): string {
  const lastDigit = phone.replace(/\D/g, '').slice(-1) || '0'
  return lastDigit.repeat(6)
}

// phone → { code, expiresAt }
const otpStore = new Map<string, { code: string; expiresAt: number }>()

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=il`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DuraServer/1.0' },
    })
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* fall through */ }
  return { lat: 0, lng: 0 }
}

export interface RegisterDto {
  name: string
  phone: string
  email: string
  dateOfBirth: string   // ISO date string e.g. "1995-03-14"
  sex: 'FEMALE' | 'MALE' | 'OTHER'
  city: string
}

export interface WorkingHoursInput {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
  breaks?: { start: string; end: string }[]
}

const DEFAULT_WORKING_HOURS: WorkingHoursInput[] = [
  { dayOfWeek: 0, openTime: '09:00', closeTime: '20:00', isClosed: false },
  { dayOfWeek: 1, openTime: '09:00', closeTime: '20:00', isClosed: false },
  { dayOfWeek: 2, openTime: '09:00', closeTime: '20:00', isClosed: false },
  { dayOfWeek: 3, openTime: '09:00', closeTime: '20:00', isClosed: false },
  { dayOfWeek: 4, openTime: '09:00', closeTime: '20:00', isClosed: false },
  { dayOfWeek: 5, openTime: '09:00', closeTime: '14:00', isClosed: false },
  { dayOfWeek: 6, openTime: '09:00', closeTime: '20:00', isClosed: true  },
]

export interface RegisterBusinessDto {
  // owner
  name: string
  phone: string
  email: string
  // business
  businessName: string
  businessPhone: string
  address: string
  city: string
  categories: string[]
  workingHours?: WorkingHoursInput[]
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (existing) throw new ConflictException('מספר טלפון זה כבר רשום במערכת')

    const user = await this.prisma.user.create({
      data: {
        phone:       dto.phone,
        name:        dto.name,
        email:       dto.email,
        dateOfBirth: new Date(dto.dateOfBirth),
        sex:         dto.sex,
        city:        dto.city,
        role:        'CLIENT',
        referralCode: this.generateReferralCode(dto.name),
      },
    })

    const token = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role })
    return { user, token }
  }

  async registerBusiness(dto: RegisterBusinessDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } })
    if (existing) throw new ConflictException('מספר טלפון זה כבר רשום במערכת')

    const fullAddress = `${dto.address}, ${dto.city}`
    const coords = await geocodeAddress(fullAddress)

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        name: dto.name,
        email: dto.email,
        role: 'BUSINESS',
        referralCode: this.generateReferralCode(dto.name),
        business: {
          create: {
            name: dto.businessName,
            phone: dto.businessPhone,
            address: fullAddress,
            lat: coords.lat,
            lng: coords.lng,
            category: dto.categories,
          },
        },
      },
    })

    const token = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role })
    return { user, token }
  }

  async login(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } })
    if (!user) throw new UnauthorizedException('מספר טלפון לא קיים במערכת')

    const token = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role })
    return { user, token }
  }

  async sendOtp(phone: string) {
    if (phone !== ADMIN_PHONE) {
      const exists = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } })
      if (!exists) throw new UnauthorizedException('מספר הטלפון אינו רשום במערכת, אנא נסי שוב')
    }
    const code = generateOtp(phone)
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60_000 })
    console.log(`[OTP] ${phone} → ${code}`)
    // TODO: send real SMS via Twilio in production
  }

  async verifyOtp(phone: string, code: string) {
    const entry = otpStore.get(phone)
    if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
      throw new UnauthorizedException('קוד שגוי או פג תוקף')
    }
    otpStore.delete(phone)

    if (phone === ADMIN_PHONE) {
      let user = await this.prisma.user.findUnique({ where: { phone } })
      if (!user) {
        user = await this.prisma.user.create({
          data: { phone, name: 'מנהל מערכת', role: 'ADMIN', referralCode: 'ADMIN0000' },
        })
      }
      const token = this.jwt.sign({ sub: user.id, phone: user.phone, role: 'ADMIN' })
      return { user: { ...user, role: 'ADMIN' as const }, token, isNewUser: false }
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: { business: { select: { status: true } } },
    })

    if (!user) {
      throw new UnauthorizedException('מספר הטלפון אינו רשום במערכת, אנא נסי שוב')
    }

    const businessStatus = (user as any).business?.status ?? null
    const token = this.jwt.sign({ sub: user.id, phone: user.phone, role: user.role })
    return { user, token, isNewUser: false, businessStatus }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true, phone: true, name: true, email: true,
        city: true, photo: true, role: true, walletBalance: true,
        business: { select: { status: true } },
      },
    })
    return {
      ...user,
      businessStatus: (user as any).business?.status ?? null,
    }
  }

  private generateReferralCode(name: string): string {
    const prefix = name.slice(0, 3).toUpperCase().replace(/\s/g, '')
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
    return `${prefix}${suffix}`
  }
}
