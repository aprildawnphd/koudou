// Action engine — derives ranked "next step" actions from entity state.
// Ported from the Lovable build, adapted to the clean Koudou schema.
//
// Pure function. No side effects. No persistence. Snoozes/AI suggestions are
// passed-in slots, kept wired but unused in v1 of Today.
//
// Skipped vs Lovable (deferred to later sessions):
//   - recommendation_request signals          (Session 4 — Network surface)
//   - stalled-outreach signals                (Session 4 — Network surface)
//   - interview-followup signals              (needs interviews.follow_up_date column)
//   - action_snoozes filtering                (Session 6/7 polish)

import { differenceInCalendarDays, isPast, isToday } from 'date-fns'
import { parseLocalDate } from './localDate'
import { getPrimaryAction } from './outreachTemplates'
import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>
type Contact = Tables<'contacts'>
type Interview = Tables<'interviews'>
type Activity = Tables<'activities'>
type TargetCompany = Tables<'target_companies'>

export type ActionLane = 'networking' | 'referrals' | 'applications'
export type ActionUrgency = 'overdue' | 'today' | 'soon' | 'later'
export type ActionSource = 'signal' | 'nudge' | 'ai'

export interface DerivedAction {
  /** Stable key used for snooze persistence and React reconciliation. */
  signature: string
  lane: ActionLane
  urgency: ActionUrgency
  source: ActionSource
  /** Sort key — lower is more urgent. */
  priorityScore: number
  title: string
  subtitle?: string
  actionLabel: string
  href?: string
  contactId?: string
  jobId?: string
  targetCompanyId?: string
  /** ISO date for display only. */
  dueDate?: string
}

const URGENCY_WEIGHT: Record<ActionUrgency, number> = {
  overdue: 0,
  today: 100,
  soon: 200,
  later: 300,
}

const LANE_WEIGHT: Record<ActionLane, number> = {
  referrals: 0, // referrals first — most leverage
  networking: 1,
  applications: 2,
}

function urgencyFromDate(iso: string | null | undefined): ActionUrgency {
  const d = parseLocalDate(iso)
  if (!d) return 'later'
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  const diff = differenceInCalendarDays(d, new Date())
  if (diff <= 3) return 'soon'
  return 'later'
}

function scoreOf(urgency: ActionUrgency, lane: ActionLane, daysOverdue = 0): number {
  return URGENCY_WEIGHT[urgency] + LANE_WEIGHT[lane] - Math.min(daysOverdue, 30)
}

export interface ActionEngineInput {
  jobs: Job[]
  contacts: Contact[]
  interviews: Interview[]
  activities: Activity[]
  targetCompanies: TargetCompany[]
}

/**
 * Derives all actions from the underlying entity state. Pure.
 * Returns actions sorted by priorityScore ascending (most urgent first).
 */
export function deriveActions(input: ActionEngineInput): DerivedAction[] {
  const actions: DerivedAction[] = []
  const now = new Date()

  // Index target_companies by id for fast lookup
  const tcById = new Map(input.targetCompanies.map((t) => [t.id, t]))

  // ============ LAYER 1: SIGNALS ============

  // Contact follow-ups
  // Lovable filtered out follow-ups whose only linked jobs were rejected/closed
  // via a jobs.contact_id FK that we don't carry in this schema. We'll re-add
  // that filter when we link contacts to jobs in a later session.
  for (const c of input.contacts) {
    if (!c.follow_up) continue
    const urgency = urgencyFromDate(c.follow_up)
    if (urgency === 'later') continue
    const daysOverdue =
      urgency === 'overdue'
        ? Math.max(0, differenceInCalendarDays(now, parseLocalDate(c.follow_up) ?? now))
        : 0
    const company = c.target_company_id ? tcById.get(c.target_company_id)?.name : undefined
    actions.push({
      signature: `followup:contact:${c.id}:${c.follow_up}`,
      lane: 'networking',
      urgency,
      source: 'signal',
      priorityScore: scoreOf(urgency, 'networking', daysOverdue),
      title: `Follow up with ${c.name}`,
      subtitle: company ? `${c.role ?? 'Contact'} at ${company}` : (c.role ?? 'Contact'),
      actionLabel: getPrimaryAction(c.network_role),
      href: `/network?highlight=${c.id}`,
      contactId: c.id,
      dueDate: c.follow_up,
    })
  }

  // Upcoming interviews (within next 7 days, in the future)
  for (const i of input.interviews) {
    const scheduled = parseLocalDate(i.scheduled_at)
    if (!scheduled) continue
    const diffFromNow = differenceInCalendarDays(scheduled, now)
    if (diffFromNow < 0 || diffFromNow > 7) continue
    const job = input.jobs.find((j) => j.id === i.job_id)
    if (!job) continue
    const urgency: ActionUrgency =
      diffFromNow === 0 ? 'today' : diffFromNow <= 3 ? 'soon' : 'later'
    const ivDate = scheduled.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const ivTime = scheduled.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })
    const typeLabel = i.type ? i.type[0]!.toUpperCase() + i.type.slice(1) : 'Interview'
    actions.push({
      signature: `interview:${i.id}`,
      lane: 'applications',
      urgency,
      source: 'signal',
      priorityScore: scoreOf(urgency, 'applications') - 50, // boost interviews
      title: `${typeLabel} interview — ${job.role}`,
      subtitle: `${job.company} · ${ivDate} · ${ivTime}`,
      actionLabel: 'Prep & open',
      href: `/jobs?open=${job.id}`,
      jobId: job.id,
      dueDate: i.scheduled_at,
    })
  }

  // ============ LAYER 2: STATUS-BASED NUDGES ============

  // Jobs in 'saved' status >14 days → apply or archive
  for (const j of input.jobs) {
    if (j.status !== 'saved') continue
    const created = new Date(j.created_at)
    if (isNaN(created.getTime())) continue
    const days = differenceInCalendarDays(now, created)
    if (days < 14) continue
    const urgency: ActionUrgency = days > 30 ? 'overdue' : 'soon'
    actions.push({
      signature: `nudge:apply-or-archive:${j.id}`,
      lane: 'applications',
      urgency,
      source: 'nudge',
      priorityScore: scoreOf(urgency, 'applications', Math.max(0, days - 14)),
      title: `Apply or archive: ${j.role}`,
      subtitle: `${j.company} · saved ${days}d ago`,
      actionLabel: 'Decide',
      href: `/jobs?open=${j.id}`,
      jobId: j.id,
    })
  }

  // Dream target companies with 0 contacts → source prospects
  for (const tc of input.targetCompanies) {
    if (tc.tier !== 'dream') continue
    const hasContacts = input.contacts.some((c) => c.target_company_id === tc.id)
    if (hasContacts) continue
    actions.push({
      signature: `nudge:source-prospects:${tc.id}`,
      lane: 'networking',
      urgency: 'soon',
      source: 'nudge',
      priorityScore: scoreOf('soon', 'networking'),
      title: `Find a Connector or Booster for ${tc.name}`,
      subtitle: 'Dream company · 0 contacts',
      actionLabel: 'Source prospects',
      href: '/targets',
      targetCompanyId: tc.id,
    })
  }

  // Warm contacts with 30+ days of silence → reconnect
  for (const c of input.contacts) {
    if (c.warmth !== 'warm') continue
    // Last touch = max(contacts.last_touch, latest activity for this contact)
    const activityTimes = input.activities
      .filter((a) => a.contact_id === c.id)
      .map((a) => new Date(a.occurred_at).getTime())
      .filter((t) => !isNaN(t))
    const lastActivity = activityTimes.length > 0 ? Math.max(...activityTimes) : null
    const lastTouchTs = c.last_touch ? new Date(c.last_touch).getTime() : null
    const lastTouch = Math.max(lastActivity ?? 0, lastTouchTs ?? 0)
    if (!lastTouch) continue
    const days = differenceInCalendarDays(now, new Date(lastTouch))
    if (days < 30) continue
    actions.push({
      signature: `nudge:reconnect:${c.id}`,
      lane: 'networking',
      urgency: 'soon',
      source: 'nudge',
      priorityScore: scoreOf('soon', 'networking', Math.max(0, days - 30)),
      title: `Reconnect with ${c.name}`,
      subtitle: `Warm contact · last touch ${days}d ago`,
      actionLabel: getPrimaryAction(c.network_role),
      href: `/network?highlight=${c.id}`,
      contactId: c.id,
    })
  }

  // ============ Sort ============
  actions.sort((a, b) => a.priorityScore - b.priorityScore)
  return actions
}

export function groupByUrgency(
  actions: DerivedAction[],
): Record<ActionUrgency, DerivedAction[]> {
  const out: Record<ActionUrgency, DerivedAction[]> = {
    overdue: [],
    today: [],
    soon: [],
    later: [],
  }
  for (const a of actions) out[a.urgency].push(a)
  return out
}
