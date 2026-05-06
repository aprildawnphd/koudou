import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { PipelineFunnelChart, type FunnelData } from './PipelineFunnelChart'
import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>
type Interview = Tables<'interviews'>

type WindowKey = '30d' | '90d' | 'all'

const WINDOW_DAYS: Record<WindowKey, number | null> = {
  '30d': 30,
  '90d': 90,
  all: null,
}

const WINDOW_LABEL: Record<WindowKey, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

// Stalled thresholds — how long a job can sit in a status before flagging.
// Per-status not per-funnel-stage; the funnel stalled badges aggregate
// (e.g. "stalled at apply/screen" lumps applied-stalled + screening-stalled
// into the Applications column's badge).
const STALLED_DAYS = {
  applied: 21,
  screening: 14,
  interview: 10,
  offer: 7,
}

const MS_PER_DAY = 86_400_000

function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (isNaN(t)) return null
  return Math.floor((now - t) / MS_PER_DAY)
}

function inWindow(
  iso: string | null,
  now: number,
  windowDays: number | null,
): boolean {
  if (windowDays === null) return iso != null
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (isNaN(t)) return false
  return now - t <= windowDays * MS_PER_DAY
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

export function FunnelTab() {
  const [windowKey, setWindowKey] = useState<WindowKey>('90d')

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return (data ?? []) as Job[]
    },
  })

  const { data: interviews = [], isLoading: interviewsLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: async () => {
      const { data, error } = await supabase.from('interviews').select('*')
      if (error) throw error
      return (data ?? []) as Interview[]
    },
  })

  const { funnel, medianDaysToInterview, cohortSize } = useMemo(() => {
    const now = Date.now()
    const windowDays = WINDOW_DAYS[windowKey]

    // Cohort = jobs whose applied_date falls in the window.
    const cohort = jobs.filter((j) => inWindow(j.applied_date, now, windowDays))

    // Map job_id → earliest interview scheduled_at (for time-to-interview math)
    const earliestInterviewByJob = new Map<string, number>()
    for (const iv of interviews) {
      const t = new Date(iv.scheduled_at).getTime()
      if (isNaN(t)) continue
      const prev = earliestInterviewByJob.get(iv.job_id)
      if (prev === undefined || t < prev) {
        earliestInterviewByJob.set(iv.job_id, t)
      }
    }

    // A cohort job "reached interview" if it has an interview record OR its
    // status is in [interview, offer] (status acts as fallback if interviews
    // table is sparse).
    const reachedInterview = (j: Job): boolean =>
      earliestInterviewByJob.has(j.id) ||
      j.status === 'interview' ||
      j.status === 'offer'

    const reachedOffer = (j: Job): boolean => j.status === 'offer'

    const interviewJobs = cohort.filter(reachedInterview)
    const offerJobs = cohort.filter(reachedOffer)

    // Stalled detection — only counts jobs CURRENTLY at the relevant status
    // and exceeding threshold. Cohort-bound (won't surface old jobs outside
    // the time window).
    const appliedStalled = cohort.filter((j) => {
      if (j.status === 'applied') {
        const d = daysSince(j.applied_date, now)
        return d != null && d > STALLED_DAYS.applied
      }
      if (j.status === 'screening') {
        const d = daysSince(j.updated_at, now)
        return d != null && d > STALLED_DAYS.screening
      }
      return false
    }).length

    const interviewStalled = cohort.filter((j) => {
      if (j.status !== 'interview') return false
      const d = daysSince(j.updated_at, now)
      return d != null && d > STALLED_DAYS.interview
    }).length

    const offerStalled = cohort.filter((j) => {
      if (j.status !== 'offer') return false
      const d = daysSince(j.updated_at, now)
      return d != null && d > STALLED_DAYS.offer
    }).length

    // Median days from applied_date to first interview.
    const daysToInterview: number[] = []
    for (const j of cohort) {
      const earliest = earliestInterviewByJob.get(j.id)
      if (!earliest || !j.applied_date) continue
      const applied = new Date(j.applied_date).getTime()
      if (isNaN(applied)) continue
      const days = Math.max(0, Math.floor((earliest - applied) / MS_PER_DAY))
      daysToInterview.push(days)
    }

    const f: FunnelData = {
      applications: { count: cohort.length, stalled: appliedStalled },
      interviews: { count: interviewJobs.length, stalled: interviewStalled },
      offers: { count: offerJobs.length, stalled: offerStalled },
    }

    return {
      funnel: f,
      medianDaysToInterview: median(daysToInterview),
      cohortSize: cohort.length,
    }
  }, [jobs, interviews, windowKey])

  const totalStalled =
    funnel.applications.stalled +
    funnel.interviews.stalled +
    funnel.offers.stalled

  const isLoading = jobsLoading || interviewsLoading

  if (isLoading) {
    return (
      <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading…
      </div>
    )
  }

  return (
    <div className="m-7 space-y-4">
      {/* Header: title + window selector */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Pipeline flow</h2>
          <p className="text-[12px] text-ink-secondary">
            {cohortSize === 0
              ? `No applications in ${WINDOW_LABEL[windowKey].toLowerCase()}`
              : `${cohortSize} application${cohortSize === 1 ? '' : 's'} in ${WINDOW_LABEL[windowKey].toLowerCase()}`}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-[6px] border border-line bg-elevated p-0.5">
          {(['30d', '90d', 'all'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setWindowKey(k)}
              className={cn(
                'rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors',
                windowKey === k
                  ? 'bg-accent-strong text-white'
                  : 'text-ink-secondary hover:text-ink',
              )}
            >
              {WINDOW_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      <PipelineFunnelChart data={funnel} />

      {/* Supporting stat cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Median days to first interview"
          value={
            medianDaysToInterview != null
              ? `${medianDaysToInterview}d`
              : '—'
          }
          icon={Clock}
          hint={
            medianDaysToInterview != null
              ? `Across ${funnel.interviews.count} job${funnel.interviews.count === 1 ? '' : 's'} that reached interview`
              : 'No jobs have reached interview in this window'
          }
        />
        <StatCard
          label="Stalled across all stages"
          value={totalStalled}
          tone={totalStalled > 0 ? 'warning' : 'neutral'}
          hint={
            totalStalled === 0
              ? 'Everything moving on cadence'
              : `Apply ${funnel.applications.stalled} · Interview ${funnel.interviews.stalled} · Offer ${funnel.offers.stalled}`
          }
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'neutral' | 'warning'
  icon?: typeof Clock
}) {
  return (
    <div className="rounded-[10px] border border-line bg-elevated p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <div
        className={cn(
          'font-mono text-[24px] font-bold',
          tone === 'warning' ? 'text-priority-high' : 'text-ink',
        )}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-[12px] text-ink-secondary">{hint}</div>
      )}
    </div>
  )
}
