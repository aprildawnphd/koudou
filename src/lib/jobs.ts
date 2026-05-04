// Status grouping for the Pipeline view.
// jobs.status is a typed enum at the DB layer; this collapses it to the
// 4 buckets the Pipeline groups by. saved/rejected/withdrawn/closed → 'other'
// (and Pipeline filters those out by default).

import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>

export type StatusBucket = 'interview' | 'screening' | 'applied' | 'offer' | 'other'

export const STATUS_ORDER: StatusBucket[] = [
  'interview',
  'screening',
  'applied',
  'offer',
]

export const STATUS_LABEL: Record<StatusBucket, string> = {
  interview: 'Interviewing',
  screening: 'Screening',
  applied: 'Applied — awaiting response',
  offer: 'Offer / Negotiation',
  other: 'Other',
}

export const STATUS_COLOR: Record<StatusBucket, string> = {
  interview: 'var(--status-interview)',
  screening: 'var(--status-screening)',
  applied: 'var(--status-applied)',
  offer: 'var(--status-offer)',
  other: 'var(--text-muted)',
}

export function statusBucket(status: Job['status']): StatusBucket {
  if (
    status === 'interview' ||
    status === 'screening' ||
    status === 'applied' ||
    status === 'offer'
  ) {
    return status
  }
  return 'other'
}
