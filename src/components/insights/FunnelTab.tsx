import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { PipelineFunnelChart, type FunnelData } from './PipelineFunnelChart'
import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>

const ACTIVE_STATUSES = ['applied', 'screening', 'interview', 'offer'] as const

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  start.setHours(0, 0, 0, 0)
  return start
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}

function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

export function FunnelTab() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return (data ?? []) as Job[]
    },
  })

  const funnel: FunnelData = useMemo(() => {
    const empty = (): FunnelData => ({
      applied: { warm: 0, cold: 0 },
      screening: { warm: 0, cold: 0 },
      interview: { warm: 0, cold: 0 },
      offer: { warm: 0, cold: 0 },
    })
    const f = empty()
    for (const j of jobs) {
      if (!ACTIVE_STATUSES.includes(j.status as (typeof ACTIVE_STATUSES)[number]))
        continue
      const stage = j.status as keyof FunnelData
      if (j.warm) f[stage].warm += 1
      else f[stage].cold += 1
    }
    return f
  }, [jobs])

  const trends = useMemo(() => {
    const weekStart = startOfWeekMonday(new Date())
    const weekEnd = addDays(weekStart, 7)
    const lastWeekStart = addDays(weekStart, -7)

    const appliedThis = jobs.filter((j) =>
      inRange(j.applied_date, weekStart, weekEnd),
    ).length
    const appliedLast = jobs.filter((j) =>
      inRange(j.applied_date, lastWeekStart, weekStart),
    ).length

    return { appliedThis, appliedLast }
  }, [jobs])

  const totalActive =
    funnel.applied.warm +
    funnel.applied.cold +
    funnel.screening.warm +
    funnel.screening.cold +
    funnel.interview.warm +
    funnel.interview.cold +
    funnel.offer.warm +
    funnel.offer.cold
  const totalWarm =
    funnel.applied.warm +
    funnel.screening.warm +
    funnel.interview.warm +
    funnel.offer.warm
  const warmPct = totalActive > 0
    ? Math.round((totalWarm / totalActive) * 100)
    : 0

  const interviewCount = funnel.interview.warm + funnel.interview.cold
  const offerCount = funnel.offer.warm + funnel.offer.cold

  if (isLoading) {
    return (
      <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading…
      </div>
    )
  }

  return (
    <div className="m-7 space-y-4">
      <PipelineFunnelChart data={funnel} />

      {/* Side-by-side stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Applied this week"
          value={trends.appliedThis}
          delta={trends.appliedThis - trends.appliedLast}
          deltaSuffix={`vs last week`}
        />
        <StatCard
          label="Warm pipeline"
          value={`${warmPct}%`}
          hint={
            totalActive === 0
              ? 'no active jobs'
              : `${totalWarm} warm of ${totalActive} active`
          }
        />
        <StatCard
          label="Interview / offer"
          value={interviewCount + offerCount}
          hint={`${interviewCount} interviewing · ${offerCount} offer${offerCount === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
  deltaSuffix,
  hint,
}: {
  label: string
  value: number | string
  delta?: number
  deltaSuffix?: string
  hint?: string
}) {
  const TrendIcon = delta == null ? null : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendClass =
    delta == null
      ? ''
      : delta > 0
        ? 'text-warmth-referral'
        : delta < 0
          ? 'text-priority-high'
          : 'text-ink-muted'

  return (
    <div className="rounded-[10px] border border-line bg-elevated p-4">
      <div className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
        {label}
      </div>
      <div className="font-mono text-[24px] font-bold text-ink">{value}</div>
      {(TrendIcon || hint) && (
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-secondary">
          {TrendIcon && (
            <span className={cn('inline-flex items-center gap-1', trendClass)}>
              <TrendIcon size={12} />
              {delta != null && (delta > 0 ? `+${delta}` : delta)}
            </span>
          )}
          {hint && <span>{hint}</span>}
          {deltaSuffix && <span>{deltaSuffix}</span>}
        </div>
      )}
    </div>
  )
}
