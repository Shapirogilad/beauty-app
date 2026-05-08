export interface DashboardStats {
  todayCount: number
  todayRevenue: number       // agorot
  weekCount: number
  weekRevenue: number        // agorot
  pendingCount: number
}

export interface ScheduleBooking {
  id: string
  startAt: string
  endAt: string
  status: string
  client: { name: string; phone: string }
  service: { nameHe: string; price: number }
  stylist: { id: string; name: string }
  payment: { id: string; status: string; amountAgorot: number; cardLast4: string | null } | null
}

export interface DayBreak {
  start: string  // "13:00"
  end: string    // "14:00"
}

export interface WorkingHoursEntry {
  dayOfWeek: number  // 0=Sun … 6=Sat
  openTime: string   // "09:00"
  closeTime: string  // "18:00"
  isClosed: boolean
  breaks: DayBreak[]
}

export interface DateException {
  id: string
  date: string        // "YYYY-MM-DD"
  openTime: string | null
  closeTime: string | null
  isClosed: boolean
  breaks: DayBreak[]
  note: string | null
}

export interface ManagedService {
  id: string
  nameHe: string
  price: number
  durationMinutes: number
  slotIntervalMinutes: number
  isActive: boolean
}
