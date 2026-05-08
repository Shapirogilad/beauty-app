export type ServiceCategory =
  | 'hair'
  | 'nails'
  | 'manicure'
  | 'laser'
  | 'waxing'
  | 'eyebrows'
  | 'lashes'
  | 'facial'
  | 'massage'
  | 'makeup'

export const CATEGORY_TO_HEBREW: Record<ServiceCategory, string> = {
  hair:     'שיער',
  nails:    'ציפורניים',
  manicure: 'מניקור / פדיקור',
  laser:    'לייזר',
  waxing:   'שעווה / אפילציה',
  eyebrows: 'גבות',
  lashes:   'ריסים',
  facial:   'טיפול פנים',
  massage:  'עיסוי',
  makeup:   'איפור',
}

export interface BusinessSummary {
  id: string
  name: string
  category: ServiceCategory[]
  address: string
  lat: number
  lng: number
  photos: string[]
  rating: number
  reviewCount: number
  distanceKm?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface ServiceItem {
  id: string
  nameHe: string
  price: number        // agorot (ILS cents)
  durationMinutes: number
  bufferMinutes: number
}

export interface StylistSummary {
  id: string
  name: string
  photo?: string
  bio?: string
  specialties: string[]
  instagram?: string
}

export interface ReviewItem {
  id: string
  rating: number
  text?: string
  photos: string[]
  clientName: string
  createdAt: string
}

export interface BusinessDetail extends BusinessSummary {
  description?: string
  phone: string
  workPhotos: string[]
  services: ServiceItem[]
  stylists: StylistSummary[]
  reviews: ReviewItem[]
}
