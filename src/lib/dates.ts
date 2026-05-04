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
