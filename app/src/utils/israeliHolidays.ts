import { HebrewCalendar, flags } from '@hebcal/core'

export type HolidayType = 'full' | 'semi'

export interface IsraeliHoliday {
  date: string    // "YYYY-MM-DD"
  nameHe: string
  type: HolidayType
}

// ─── Hebrew name + type for each recognised event ────────────────────────────

/** Exact-match descriptions */
const EXACT: Record<string, { nameHe: string; type: HolidayType }> = {
  'Pesach I':                    { nameHe: 'פסח (יום א׳)',            type: 'full' },
  'Pesach VII':                  { nameHe: 'שביעי של פסח',            type: 'full' },
  'Shavuot':                     { nameHe: 'שבועות',                  type: 'full' },
  'Rosh Hashana II':             { nameHe: 'ראש השנה (יום ב׳)',       type: 'full' },
  'Yom Kippur':                  { nameHe: 'יום כיפור',               type: 'full' },
  'Sukkot I':                    { nameHe: 'סוכות (יום א׳)',          type: 'full' },
  'Shmini Atzeret':              { nameHe: 'שמיני עצרת / שמחת תורה', type: 'full' },
  "Yom HaAtzma'ut":             { nameHe: 'יום העצמאות',             type: 'full' },
  'Purim':                       { nameHe: 'פורים',                   type: 'semi' },
  'Sukkot VII (Hoshana Raba)':  { nameHe: 'הושענא רבא',             type: 'semi' },
  'Yom HaZikaron':              { nameHe: 'יום הזיכרון',             type: 'semi' },
}

function classifyEvent(desc: string): { nameHe: string; type: HolidayType } | null {
  if (EXACT[desc]) return EXACT[desc]

  // "Rosh Hashana 5786" etc (not Rosh Hashana II or LaBehemot — handled above/excluded)
  if (desc.startsWith('Rosh Hashana ') && !desc.endsWith('II') && !desc.includes('LaBehemot')) {
    return { nameHe: 'ראש השנה', type: 'full' }
  }

  // Chol HaMoed — library uses "CH''M" in the description
  if (desc.includes("CH''M")) {
    if (desc.startsWith('Pesach'))  return { nameHe: 'חול המועד פסח',   type: 'semi' }
    if (desc.startsWith('Sukkot')) return { nameHe: 'חול המועד סוכות', type: 'semi' }
  }

  return null
}

// ─── Generate for a rolling window ───────────────────────────────────────────

const MASK = flags.CHAG | flags.CHOL_HAMOED | flags.MODERN_HOLIDAY | flags.MINOR_HOLIDAY

/**
 * Returns Israeli public holidays for the given Gregorian year.
 * Uses @hebcal/core, so it works for any future year automatically.
 */
export function getHolidaysForYear(year: number): IsraeliHoliday[] {
  const events = HebrewCalendar.calendar({
    year,
    isHebrewYear: false,
    il: true,         // Israel mode — 1-day Yom Tov, correct Yom Ha'atzmaut postponement rules
    mask: MASK,
  })

  const results: IsraeliHoliday[] = []
  for (const ev of events) {
    const info = classifyEvent(ev.getDesc())
    if (!info) continue
    const greg = ev.getDate().greg()
    const mm   = String(greg.getMonth() + 1).padStart(2, '0')
    const dd   = String(greg.getDate()).padStart(2, '0')
    results.push({ date: `${greg.getFullYear()}-${mm}-${dd}`, ...info })
  }
  return results
}

// ─── Pre-build a Map covering current year − 1 through current year + 5 ─────

function buildHolidayMap(): Map<string, IsraeliHoliday> {
  const currentYear = new Date().getFullYear()
  const map = new Map<string, IsraeliHoliday>()
  for (let y = currentYear - 1; y <= currentYear + 5; y++) {
    for (const h of getHolidaysForYear(y)) {
      map.set(h.date, h)
    }
  }
  return map
}

/**
 * O(1) lookup by date string "YYYY-MM-DD".
 * Covers current year − 1 through current year + 5 automatically.
 */
export const HOLIDAY_MAP: Map<string, IsraeliHoliday> = buildHolidayMap()

/** Flat array of all holidays in the map, sorted by date. */
export const ISRAELI_HOLIDAYS: IsraeliHoliday[] = Array.from(HOLIDAY_MAP.values())
  .sort((a, b) => a.date.localeCompare(b.date))
