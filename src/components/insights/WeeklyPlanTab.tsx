import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  CalendarDays,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { invokeEdge, EdgeError } from '@/lib/edgeFunctions'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type WeeklyPlanRow = Tables<'weekly_plans'>

type EntityRef = {
  type: 'job' | 'contact' | 'interview'
  id: string
  label: string
}

type Action = {
  title: string
  rationale: string
  category:
    | 'application'
    | 'outreach'
    | 'interview-prep'
    | 'follow-up'
    | 'pipeline-hygiene'
    | 'profile'
  priority: 'high' | 'medium' | 'low'
  entity_ref?: EntityRef
}

type PlanPayload = {
  headline: string
  actions: Action[]
}

type Scoreboard = {
  week_start: string
  applications: { this_week: number; last_week: number; two_weeks_ago: number; three_weeks_ago: number }
  outreach: { this_week: number; last_week: number; two_weeks_ago: number; three_weeks_ago: number }
  interviews: { this_week: number; last_week: number; two_weeks_ago: number; three_weeks_ago: number }
  pipeline_status: Record<string, number>
  contact_warmth: Record<string, number>
}

const CATEGORY_LABEL: Record<Action['category'], string> = {
  application: 'Application',
  outreach: 'Outreach',
  'interview-prep': 'Interview prep',
  'follow-up': 'Follow-up',
  'pipeline-hygiene': 'Pipeline hygiene',
  profile: 'Profile',
}

const PRIORITY_STYLE: Record<Action['priority'], string> = {
  high: 'bg-priority-high/10 text-priority-high border-priority-high/30',
  medium: 'bg-brand-strong/10 text-brand-strong border-brand-strong/30',
  low: 'bg-hover text-ink-secondary border-line',
}

function thisWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return start.toISOString().slice(0, 10)
}

export function WeeklyPlanTab() {
  const qc = useQueryClient()
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['weekly_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .order('week_start', { ascending: false })
      if (error) throw error
      return (data ?? []) as WeeklyPlanRow[]
    },
  })

  const generate = useMutation({
    mutationFn: async () => {
      return await invokeEdge<{ week_start: string; scoreboard: Scoreboard; plan: PlanPayload }>(
        'generate-weekly-plan',
        {},
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly_plans'] })
      setError(null)
    },
    onError: (e) => {
      setError({
        message: e instanceof Error ? e.message : 'Plan generation failed',
        retryable: e instanceof EdgeError && e.retryable,
      })
    },
  })

  const currentWeekStart = thisWeekStart()
  const currentPlan = plans.find((p) => p.week_start === currentWeekStart)
  const priorPlans = plans.filter((p) => p.week_start !== currentWeekStart)

  if (isLoading) {
    return (
      <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading…
      </div>
    )
  }

  if (!currentPlan && !generate.isPending && !error) {
    return (
      <div className="m-7">
        <EmptyState
          hasPriorPlans={priorPlans.length > 0}
          onRun={() => generate.mutate()}
        />
        {priorPlans.length > 0 && <PriorPlansList plans={priorPlans} />}
      </div>
    )
  }

  return (
    <div className="m-7 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">
          Week of{' '}
          {currentPlan
            ? formatWeekLabel(currentPlan.week_start)
            : formatWeekLabel(currentWeekStart)}
        </h2>
        <button
          type="button"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-60"
        >
          {generate.isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" />{' '}
              {currentPlan ? 'Re-generating…' : 'Generating…'}
            </>
          ) : (
            <>
              <RefreshCw size={12} /> {currentPlan ? 'Regenerate' : 'Generate'}
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className={cn(
            'rounded-[8px] border px-4 py-3 text-[13px]',
            error.retryable
              ? 'border-warmth-referral/30 bg-warmth-referral/10 text-ink'
              : 'border-priority-high/30 bg-priority-high/5 text-priority-high',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">{error.message}</div>
            {error.retryable && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  generate.mutate()
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-warmth-referral px-3 py-1.5 text-[12px] font-medium text-white hover:bg-warmth-referral/90"
              >
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      {generate.isPending && !currentPlan && (
        <div className="rounded-[12px] border border-line bg-elevated p-6">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-secondary">
            <Loader2 size={14} className="animate-spin" />
            Computing your scoreboard and drafting next week's plan…
          </div>
        </div>
      )}

      {currentPlan && (
        <>
          <ScoreboardCard scoreboard={currentPlan.scoreboard as unknown as Scoreboard} />
          <PlanCard plan={currentPlan.plan as unknown as PlanPayload} />
        </>
      )}

      {priorPlans.length > 0 && <PriorPlansList plans={priorPlans} />}
    </div>
  )
}

function EmptyState({
  hasPriorPlans,
  onRun,
}: {
  hasPriorPlans: boolean
  onRun: () => void
}) {
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-brand-strong">
        <CalendarDays size={24} />
      </div>
      <h3 className="mb-1.5 text-[18px] font-semibold text-ink">
        {hasPriorPlans ? 'No plan for this week yet' : 'Weekly plan'}
      </h3>
      <p className="mx-auto mb-5 max-w-[480px] text-[13px] leading-[1.55] text-ink-secondary">
        Reads your funnel state (applications, outreach, interviews this week vs.
        the prior 3 weeks) and drafts 3-5 specific actions tied to the right
        jobs, contacts, and interviews. Costs one of your 5 daily AI runs.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-strong/90"
      >
        <Sparkles size={12} /> Generate this week's plan
      </button>
    </div>
  )
}

function ScoreboardCard({ scoreboard }: { scoreboard: Scoreboard }) {
  const stats = [
    {
      label: 'Applications',
      this_week: scoreboard.applications.this_week,
      last_week: scoreboard.applications.last_week,
    },
    {
      label: 'Outreach',
      this_week: scoreboard.outreach.this_week,
      last_week: scoreboard.outreach.last_week,
    },
    {
      label: 'Interviews',
      this_week: scoreboard.interviews.this_week,
      last_week: scoreboard.interviews.last_week,
    },
  ]
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-5">
      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
        <CalendarDays size={12} /> Scoreboard
      </div>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const delta = s.this_week - s.last_week
          const TrendIcon =
            delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
          const trendCls =
            delta > 0
              ? 'text-warmth-referral'
              : delta < 0
                ? 'text-priority-high'
                : 'text-ink-muted'
          return (
            <div key={s.label}>
              <div className="text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
                {s.label}
              </div>
              <div className="font-mono text-[24px] font-bold text-ink">
                {s.this_week}
              </div>
              <div className="text-[11px] text-ink-muted">
                <span className={cn('inline-flex items-center gap-1', trendCls)}>
                  <TrendIcon size={11} />
                  {delta > 0 ? `+${delta}` : delta} vs last week
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PlanCard({ plan }: { plan: PlanPayload }) {
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-5">
      <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
        <Sparkles size={12} className="text-brand-strong" /> This week
      </div>
      <p className="mb-4 text-[14px] leading-[1.55] text-ink">{plan.headline}</p>
      <div className="space-y-2.5">
        {plan.actions.map((a, i) => (
          <ActionRow key={i} action={a} />
        ))}
      </div>
    </div>
  )
}

function ActionRow({ action }: { action: Action }) {
  const navigate = useNavigate()
  const linkable = action.entity_ref
  const target =
    linkable?.type === 'job'
      ? '/jobs'
      : linkable?.type === 'contact'
        ? '/network'
        : linkable?.type === 'interview'
          ? '/interviews'
          : null

  return (
    <div className="rounded-[10px] border border-line bg-app-bg p-3">
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-ink">{action.title}</div>
          <div className="mt-0.5 text-[12.5px] leading-[1.55] text-ink-secondary">
            {action.rationale}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase',
            PRIORITY_STYLE[action.priority],
          )}
        >
          {action.priority}
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
        <span className="rounded-[3px] bg-hover px-1.5 py-0.5 font-medium text-ink-secondary uppercase tracking-[0.04em]">
          {CATEGORY_LABEL[action.category]}
        </span>
        {linkable && target && (
          <button
            type="button"
            onClick={() => navigate(target)}
            className="inline-flex items-center gap-1 text-accent-strong hover:underline"
          >
            {linkable.label} <ChevronRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

function PriorPlansList({ plans }: { plans: WeeklyPlanRow[] }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-[13px] font-semibold text-ink-secondary uppercase tracking-[0.04em]">
        Prior weeks
      </h3>
      <div className="space-y-1.5">
        {plans.slice(0, 8).map((p) => {
          const plan = p.plan as unknown as PlanPayload
          return (
            <details
              key={p.id}
              className="rounded-[8px] border border-line bg-elevated"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-hover">
                <span className="font-medium">
                  {formatWeekLabel(p.week_start)}
                </span>
                <span className="text-[12px] text-ink-secondary">
                  {plan.actions.length} action{plan.actions.length === 1 ? '' : 's'}
                </span>
              </summary>
              <div className="border-t border-line p-3">
                <p className="mb-3 text-[12.5px] text-ink-secondary">
                  {plan.headline}
                </p>
                <div className="space-y-1.5">
                  {plan.actions.map((a, i) => (
                    <div
                      key={i}
                      className="rounded-[6px] border border-line bg-app-bg p-2 text-[12px]"
                    >
                      <div className="font-medium text-ink">{a.title}</div>
                      <div className="text-[11.5px] text-ink-secondary">
                        {a.rationale}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </div>
  )
}

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
