// Timezone-safe date helpers.
//
// Why this exists: `new Date("2026-04-22")` parses as UTC midnight, which is
// "yesterday" for any user west of UTC. Date-only strings should always render
// as the user's *local* day. Datetimes that already carry a timezone are passed
// through to the native parser since they're unambiguous.
//
// Use these any time we read a date string from the database before comparing,
// formatting, or bucketing it. Never call `new Date(str)` directly on a value
// that might be a date-only string.

import { differenceInCalendarDays, isToday as dfIsToday, isPast as dfIsPast } from 'date-fns'

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseLocalDate(input: string | null | undefined): Date | null {
  if (!input) return null
  const s = input.trim()
  if (!s) return null

  if (DATE_ONLY_RE.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    const local = new Date(y!, m! - 1, d!)
    return isNaN(local.getTime()) ? null : local
  }

  const parsed = new Date(s)
  return isNaN(parsed.getTime()) ? null : parsed
}

export function isLocalToday(input: string | null | undefined): boolean {
  const d = parseLocalDate(input)
  return d ? dfIsToday(d) : false
}

export function isLocalPast(input: string | null | undefined): boolean {
  const d = parseLocalDate(input)
  if (!d) return false
  return dfIsPast(d) && !dfIsToday(d)
}

export function daysFromNowLocal(input: string | null | undefined): number | null {
  const d = parseLocalDate(input)
  if (!d) return null
  return differenceInCalendarDays(new Date(), d)
}
