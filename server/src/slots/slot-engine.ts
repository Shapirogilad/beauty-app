/**
 * Slot Engine — core scheduling logic.
 * Pure function, no DB dependencies — easy to unit test with /project:slot-engine-tester
 */

export interface ExistingBooking {
  startAt: Date
  endAt: Date
}

export interface BreakPeriod {
  start: string  // "13:00"
  end: string    // "14:00"
}

export interface WorkingHoursInput {
  openTime: string    // "09:00"
  closeTime: string   // "18:00"
  isClosed: boolean
  breaks?: BreakPeriod[]
}

export interface SlotEngineInput {
  date: Date
  workingHours: WorkingHoursInput | null
  serviceDurationMinutes: number
  slotIntervalMinutes: number
  existingBookings: ExistingBooking[]
}

function parseTime(date: Date, timeStr: string): Date {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

function slotOverlapsBooking(slotStart: Date, slotEnd: Date, booking: ExistingBooking): boolean {
  return slotStart < booking.endAt && slotEnd > booking.startAt
}

export function generateSlots(input: SlotEngineInput): Date[] {
  const { date, workingHours, serviceDurationMinutes, slotIntervalMinutes, existingBookings } = input

  if (!workingHours || workingHours.isClosed) return []

  const openAt = parseTime(date, workingHours.openTime)
  const closeAt = parseTime(date, workingHours.closeTime)
  const serviceDurationMs = serviceDurationMinutes * 60_000
  const intervalMs = slotIntervalMinutes * 60_000

  const breakPeriods = (workingHours.breaks ?? []).map((b) => ({
    start: parseTime(date, b.start),
    end:   parseTime(date, b.end),
  }))

  const slots: Date[] = []
  let cursor = new Date(openAt)

  while (true) {
    const slotEnd = new Date(cursor.getTime() + serviceDurationMs)
    if (slotEnd > closeAt) break

    const overlapsBooking = existingBookings.some((b) =>
      slotOverlapsBooking(cursor, slotEnd, b),
    )

    const overlapsBreak = breakPeriods.some((b) =>
      cursor < b.end && slotEnd > b.start,
    )

    if (!overlapsBooking && !overlapsBreak) slots.push(new Date(cursor))
    cursor = new Date(cursor.getTime() + intervalMs)
  }

  return slots
}
