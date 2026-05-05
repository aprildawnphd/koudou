// Date display helpers for Pipeline rows.
// "Soon" = within next 7 days; "Stale" = applied 14+ days ago with no movement.

const DAY_MS = 86_400_000

export type DateClass = '' | 'soon' | 'stale'

export function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS)
}

export function appliedAgoText(appliedDate: string | null): {
  text: string
  cls: DateClass
} {
  if (!appliedDate) return { text: '—', cls: '' }
  const d = new Date(appliedDate)
  const now = new Date()
  const days = daysBetween(d, now)
  if (days >= 14) return { text: `${days}d ago ⚡`, cls: 'stale' }
  if (days >= 0) return { text: `${days}d ago`, cls: '' }
  return { text: shortDate(d), cls: '' }
}

export function shortDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function dueDisplay(dateStr: string | null): {
  text: string
  cls: DateClass
} {
  if (!dateStr) return { text: '—', cls: '' }
  const d = new Date(dateStr)
  const now = new Date()
  const days = daysBetween(now, d)
  if (days < 0) return { text: shortDate(d), cls: 'stale' }
  if (days <= 7) return { text: shortDate(d), cls: 'soon' }
  return { text: shortDate(d), cls: '' }
}

// Conversational "time since" label — used for last-touch on contact rows.
// Tighter than appliedAgoText: weeks/months/years bucket.
export function lastTouchText(ts: string | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  const days = daysBetween(d, new Date())
  if (days < 0) return shortDate(d)
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 28) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
