import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInCalendarDays, startOfWeek, addDays } from 'date-fns'
import { Users, Flag, Briefcase, X } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useTodayData } from '@/hooks/useTodayData'
import { deriveActions, type ActionLane, type DerivedAction } from '@/lib/actionEngine'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const LANE_ICON: Record<ActionLane, LucideIcon> = {
  networking: Users,
  referrals: Flag,
  applications: Briefcase,
}

const LANE_TINT: Record<ActionLane, string> = {
  networking: 'bg-[#dbeafe] text-[#1e40af]',
  referrals: 'bg-[#d1fae5] text-[#065f46]',
  applications: 'bg-[#fef3c7] text-brand-strong',
}

const MILESTONE_COPY: Record<string, string> = {
  first_app: 'First application sent. The hardest part is the first.',
  first_interview: 'First interview booked. Real momentum.',
  first_offer: "First offer received. Take a moment — that's a real one.",
}

function greetingFor(d: Date) {
  const h = d.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function firstName(profileName: string | null | undefined, email?: string | null) {
  const raw = (profileName ?? '').trim() || (email ?? '').split('@')[0] || ''
  if (!raw) return null
  const first = raw.split(/[\s.]+/)[0] ?? raw
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
}

type RecapNumbers = { outreaches: number; applications: number; interviews: number }

function buildRecap({
  activities,
  jobs,
  interviews,
  now,
}: {
  activities: { occurred_at: string; type: string }[]
  jobs: { applied_date: string | null }[]
  interviews: { created_at: string }[]
  now: Date
}): RecapNumbers {
  const outreaches = activities.filter((a) => {
    const d = new Date(a.occurred_at)
    if (isNaN(d.getTime())) return false
    return differenceInCalendarDays(now, d) <= 7 && differenceInCalendarDays(now, d) >= 0
  }).length

  const applications = jobs.filter((j) => {
    if (!j.applied_date) return false
    const d = new Date(j.applied_date)
    if (isNaN(d.getTime())) return false
    return differenceInCalendarDays(now, d) <= 7 && differenceInCalendarDays(now, d) >= 0
  }).length

  const interviewsBooked = interviews.filter((i) => {
    const d = new Date(i.created_at)
    if (isNaN(d.getTime())) return false
    return differenceInCalendarDays(now, d) <= 7 && differenceInCalendarDays(now, d) >= 0
  }).length

  return { outreaches, applications, interviews: interviewsBooked }
}

function recapSentence(r: RecapNumbers): string {
  const allZero = r.outreaches === 0 && r.applications === 0 && r.interviews === 0
  if (allZero) return 'Nothing logged in the last seven days. Quiet weeks happen — pick one thing today.'
  const parts: string[] = []
  if (r.outreaches > 0) parts.push(`${r.outreaches} outreach${r.outreaches === 1 ? '' : 'es'}`)
  if (r.applications > 0)
    parts.push(`${r.applications} application${r.applications === 1 ? '' : 's'}`)
  if (r.interviews > 0)
    parts.push(`${r.interviews} interview${r.interviews === 1 ? '' : 's'} booked`)
  return `Last seven days: ${parts.join(' · ')}.`
}

type WeekEvent = {
  day: number
  time: string
  label: string
  kind: 'interview' | 'decision' | 'screening'
  jobId: string
}

function buildWeekEvents({
  interviews,
  jobs,
  weekStart,
}: {
  interviews: { id: string; job_id: string; scheduled_at: string; type: string | null }[]
  jobs: { id: string; role: string; company: string; due_date: string | null }[]
  weekStart: Date
}): WeekEvent[] {
  const out: WeekEvent[] = []
  const jobById = new Map(jobs.map((j) => [j.id, j]))
  for (const iv of interviews) {
    const d = new Date(iv.scheduled_at)
    if (isNaN(d.getTime())) continue
    const dayIdx = differenceInCalendarDays(d, weekStart)
    if (dayIdx < 0 || dayIdx > 6) continue
    const job = jobById.get(iv.job_id)
    if (!job) continue
    const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    out.push({
      day: dayIdx,
      time,
      label: `${job.company} ${iv.type ?? 'interview'}`,
      kind: 'interview',
      jobId: iv.job_id,
    })
  }
  for (const j of jobs) {
    if (!j.due_date) continue
    const d = new Date(j.due_date)
    if (isNaN(d.getTime())) continue
    const dayIdx = differenceInCalendarDays(d, weekStart)
    if (dayIdx < 0 || dayIdx > 6) continue
    out.push({
      day: dayIdx,
      time: 'EOD',
      label: `${j.role} decision`,
      kind: 'decision',
      jobId: j.id,
    })
  }
  return out
}

function StepRow({ action, onOpen }: { action: DerivedAction; onOpen: (href: string) => void }) {
  const Icon = LANE_ICON[action.lane]
  return (
    <div
      onClick={() => action.href && onOpen(action.href)}
      className="mb-1.5 grid cursor-pointer grid-cols-[32px_1fr_auto_22px] items-center gap-3.5 rounded-[8px] border border-line bg-elevated p-3 hover:border-line-strong"
    >
      <div
        className={cn(
          'grid size-8 place-items-center rounded-[8px]',
          LANE_TINT[action.lane],
        )}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-ink">{action.title}</div>
        <div className="mt-0.5 truncate text-[12px] text-ink-muted">
          {action.urgency === 'overdue' && (
            <span className="font-semibold text-priority-high">Overdue · </span>
          )}
          {action.subtitle}
        </div>
      </div>
      <div className="text-[12px] font-medium text-accent-strong">
        {action.actionLabel} →
      </div>
      <button
        type="button"
        aria-label="Mark done"
        onClick={(e) => {
          e.stopPropagation()
          // Stub for v1 — wiring "complete" to a mutation is a polish-round item.
        }}
        className="size-5 rounded-full border-[1.5px] border-line-strong hover:border-accent-strong"
      />
    </div>
  )
}

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Today() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const data = useTodayData()
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const todayIdx = differenceInCalendarDays(now, weekStart)

  const dismissMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('milestones')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })

  const actions = useMemo(
    () =>
      deriveActions({
        jobs: data.jobs,
        contacts: data.contacts,
        interviews: data.interviews,
        activities: data.activities,
        targetCompanies: data.targetCompanies,
      }),
    [
      data.jobs,
      data.contacts,
      data.interviews,
      data.activities,
      data.targetCompanies,
    ],
  )

  const queue = useMemo(
    () => actions.filter((a) => a.urgency !== 'later').slice(0, 6),
    [actions],
  )
  const overdueCount = queue.filter((a) => a.urgency === 'overdue').length
  const todayCount = queue.filter((a) => a.urgency === 'today').length

  const recap = useMemo(
    () =>
      buildRecap({
        activities: data.activities,
        jobs: data.jobs,
        interviews: data.interviews,
        now,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.activities, data.jobs, data.interviews],
  )

  const weekEvents = useMemo(
    () =>
      buildWeekEvents({
        interviews: data.interviews,
        jobs: data.jobs,
        weekStart,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.interviews, data.jobs],
  )

  const name = firstName(data.profile?.name, null)
  const greeting = name ? `${greetingFor(now)}, ${name}.` : `${greetingFor(now)}.`

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
            Today
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Your session home. What's pressing, what's this week.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Acknowledgment card */}
        <div className="mx-7 mb-5 rounded-[12px] border border-line bg-elevated px-6 py-5">
          <div className="mb-1.5 text-[22px] font-bold tracking-[-0.01em] text-ink">
            {greeting}
          </div>
          <div className="text-[14px] leading-[1.6] text-ink-secondary">
            {recapSentence(recap)}
          </div>
          {data.milestone && (
            <div className="mt-4 flex items-center gap-2.5 rounded-[8px] border border-[#fcd34d] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] px-3.5 py-3 text-[13px] text-[#78350f]">
              <span className="text-[16px]">🎉</span>
              <span className="flex-1">
                <strong className="font-semibold text-[#451a03]">
                  {MILESTONE_COPY[data.milestone.kind] ?? 'Milestone reached.'}
                </strong>
              </span>
              <button
                type="button"
                aria-label="Dismiss milestone"
                onClick={() => data.milestone && dismissMilestone.mutate(data.milestone.id)}
                disabled={dismissMilestone.isPending}
                className="rounded-[4px] px-2 py-1 text-[#92400e] hover:bg-black/[0.06] disabled:opacity-60"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Up next */}
        <section className="mx-7 mb-6">
          <div className="mb-2 flex items-baseline gap-3 py-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              Up next
            </span>
            {overdueCount > 0 && (
              <span className="text-[11px] font-semibold text-priority-high">
                ⚠ {overdueCount} overdue
              </span>
            )}
            <span className="text-[11px] text-ink-muted">{todayCount} today</span>
          </div>
          {data.isLoading && (
            <div className="py-6 text-[13px] text-ink-muted">Loading…</div>
          )}
          {!data.isLoading && queue.length === 0 && (
            <div className="rounded-[10px] border border-line bg-elevated p-6 text-center text-[13px] text-ink-secondary">
              Nothing pressing right now. Take a breath, then queue tomorrow from{' '}
              <Link to="/jobs" className="font-medium text-accent-strong hover:underline">
                Jobs
              </Link>
              .
            </div>
          )}
          {queue.map((a) => (
            <StepRow key={a.signature} action={a} onOpen={(href) => navigate(href)} />
          ))}
        </section>

        {/* This week */}
        <section className="mx-7">
          <div className="mb-2 flex items-baseline gap-3 py-2">
            <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              This week
            </span>
            <span className="text-[11px] text-ink-muted">
              {weekEvents.length} event{weekEvents.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {WEEK_LABELS.map((label, i) => {
              const dayDate = addDays(weekStart, i)
              const events = weekEvents.filter((e) => e.day === i)
              const isToday = i === todayIdx
              return (
                <div
                  key={label}
                  className={cn(
                    'flex min-h-[92px] flex-col rounded-[8px] border border-line bg-elevated px-2.5 pt-2.5 pb-3',
                    isToday && 'border-accent-strong shadow-[0_0_0_1px_var(--accent)_inset]',
                  )}
                >
                  <div
                    className={cn(
                      'mb-2 text-[10px] font-semibold tracking-[0.06em] uppercase',
                      isToday ? 'text-accent-strong' : 'text-ink-muted',
                    )}
                  >
                    {label} {dayDate.getDate()}
                  </div>
                  {events.length === 0 ? (
                    <div className="text-[12px] text-ink-muted opacity-50">—</div>
                  ) : (
                    <div className="mt-auto flex flex-col gap-1.5">
                      {events.map((ev, idx) => (
                        <div
                          key={`${ev.jobId}-${idx}`}
                          onClick={() => navigate(`/jobs?open=${ev.jobId}`)}
                          className={cn(
                            'cursor-pointer rounded-[5px] border-l-[3px] px-2 py-1.5',
                            ev.kind === 'interview' &&
                              'border-status-interview bg-[#fef3c7] hover:bg-[#fde68a]',
                            ev.kind === 'decision' &&
                              'border-priority-high bg-[#fee2e2] hover:bg-[#fecaca]',
                            ev.kind === 'screening' &&
                              'border-status-screening bg-[#dbeafe] hover:bg-[#bfdbfe]',
                          )}
                        >
                          <div className="font-mono text-[10px] font-semibold text-ink-muted">
                            {ev.time}
                          </div>
                          <div className="mt-px text-[12px] leading-[1.3] font-semibold text-ink">
                            {ev.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}
