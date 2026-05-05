import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Search, Users, ArrowRight, Sparkles } from 'lucide-react'
import { differenceInCalendarDays, startOfWeek, addDays } from 'date-fns'
import { useTodayData } from '@/hooks/useTodayData'
import { deriveActions } from '@/lib/actionEngine'
import type { LucideIcon } from 'lucide-react'

type EntryCard = {
  to: string
  glyph: LucideIcon
  tag: string
  title: string
  blurb: string
  cta: string
}

const ENTRY_CARDS: EntryCard[] = [
  {
    to: '/targets',
    glyph: Star,
    tag: 'Company-first',
    title: 'Start with target companies',
    blurb:
      'You know where you want to work. Watch their boards or build promoters before a role even opens.',
    cta: 'Browse targets',
  },
  {
    to: '/search',
    glyph: Search,
    tag: 'Role-first',
    title: 'Search for a specific role',
    blurb:
      'You know the title and seniority you want. Let AI surface matches across boards and your profile.',
    cta: 'Run a search',
  },
  {
    to: '/network',
    glyph: Users,
    tag: 'Connection-first',
    title: 'Activate your network',
    blurb:
      'Lead with relationships. Find Boosters at gap companies and turn warm contacts into referrals.',
    cta: 'Open network',
  },
]

function buildFocusSentence({
  overdueCount,
  interviewsThisWeek,
  offerCount,
}: {
  overdueCount: number
  interviewsThisWeek: number
  offerCount: number
}): string {
  if (overdueCount === 0 && interviewsThisWeek === 0 && offerCount === 0) {
    return "You're all set up. Your dashboard fills in as you build the pipeline."
  }
  const parts: string[] = []
  if (overdueCount > 0)
    parts.push(`${overdueCount} overdue item${overdueCount === 1 ? '' : 's'}`)
  if (interviewsThisWeek > 0)
    parts.push(
      `${interviewsThisWeek} interview${interviewsThisWeek === 1 ? '' : 's'} this week`,
    )
  if (offerCount > 0)
    parts.push(`${offerCount} offer${offerCount === 1 ? '' : 's'} to decide on`)
  return parts.join(' · ') + '.'
}

export function GettingStarted() {
  const navigate = useNavigate()
  const data = useTodayData()
  const now = useMemo(() => new Date(), [])

  const focus = useMemo(() => {
    const actions = deriveActions({
      jobs: data.jobs,
      contacts: data.contacts,
      interviews: data.interviews,
      activities: data.activities,
      targetCompanies: data.targetCompanies,
    })
    const overdueCount = actions.filter((a) => a.urgency === 'overdue').length

    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 7)
    const interviewsThisWeek = data.interviews.filter((iv) => {
      const d = new Date(iv.scheduled_at)
      if (isNaN(d.getTime())) return false
      return d >= weekStart && d < weekEnd
    }).length

    const offerCount = data.jobs.filter((j) => j.status === 'offer').length

    return buildFocusSentence({ overdueCount, interviewsThisWeek, offerCount })
  }, [
    data.jobs,
    data.contacts,
    data.interviews,
    data.activities,
    data.targetCompanies,
    now,
  ])

  // Used to suppress the focus card briefly during initial load.
  const isFirstLoad = data.isLoading && data.jobs.length === 0

  // Helper for daysFromToday count below — kept lazy.
  // (no-op, but keeps the differenceInCalendarDays import used if we add detail)
  void differenceInCalendarDays

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
            Getting Started
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Three ways to drive your search. Pick the one that matches today.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* 3-up entry-card grid */}
        <div className="mx-7 grid grid-cols-3 gap-4">
          {ENTRY_CARDS.map((card) => {
            const Glyph = card.glyph
            return (
              <button
                key={card.to}
                type="button"
                onClick={() => navigate(card.to)}
                className="group rounded-[10px] border border-line bg-elevated p-5 text-left transition-colors hover:border-line-strong"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="grid size-9 place-items-center rounded-[8px] bg-[#fef3c7] text-brand-strong">
                    <Glyph size={18} />
                  </div>
                  <span className="rounded-[4px] bg-hover px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                    {card.tag}
                  </span>
                </div>
                <div className="mb-1.5 text-[16px] font-semibold text-ink">
                  {card.title}
                </div>
                <p className="mb-3.5 text-[13px] leading-[1.55] text-ink-secondary">
                  {card.blurb}
                </p>
                <div className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-strong">
                  {card.cta} <ArrowRight size={12} />
                </div>
              </button>
            )
          })}
        </div>

        {/* This week's focus */}
        {!isFirstLoad && (
          <div className="mx-7 mt-4 rounded-[10px] border border-line bg-elevated p-5">
            <div className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Sparkles size={14} className="text-brand-strong" />
              This week's focus
            </div>
            <div className="mb-3.5 text-[13px] text-ink-secondary">{focus}</div>
            <button
              type="button"
              onClick={() => navigate('/today')}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-strong/90"
            >
              Open Today <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}
