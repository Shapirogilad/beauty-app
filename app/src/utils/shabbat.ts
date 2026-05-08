/**
 * Returns true if the given date is Saturday (Shabbat).
 * Full Jewish holiday support should use a dedicated library (e.g. `jewish-date`)
 * or an API. This is the baseline guard.
 */
export function isShabbat(date: Date): boolean {
  return date.getDay() === 6
}

/**
 * Formats a price from agorot (ILS cents) to a display string.
 * e.g. 25000 → "250 ₪"
 */
export function formatPrice(agorot: number): string {
  return `${Math.round(agorot / 100).toLocaleString('he-IL')} ₪`
}

/**
 * Formats a duration in minutes to a Hebrew display string.
 * e.g. 90 → "שעה וחצי" or "90 דקות"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (remainder === 0) return hours === 1 ? 'שעה' : `${hours} שעות`
  return `${hours}:${String(remainder).padStart(2, '0')} שעות`
}
