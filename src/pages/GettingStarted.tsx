import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Star,
  Search,
  Users,
  ArrowRight,
  Sparkles,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { differenceInCalendarDays, startOfWeek, addDays } from 'date-fns'
import { useTodayData } from '@/hooks/useTodayData'
import { useSession } from '@/hooks/useSession'
import { deriveActions } from '@/lib/actionEngine'
import { runDemoSeed } from '@/lib/demoSeed'
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

function DemoCard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { session } = useSession()
  const [confirming, setConfirming] = useState(false)

  const seed = useMutation({
    mutationFn: async () => {
      if (!session?.user.id) throw new Error('Not signed in')
      const result = await runDemoSeed(session.user.id)
      if (!result.ok) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      qc.invalidateQueries()
      setTimeout(() => navigate('/today'), 1200)
    },
  })

  const isLoading = seed.isPending
  const isDone = seed.isSuccess
  const error = seed.error instanceof Error ? seed.error.message : null

  return (
    <div className="mx-7 mt-4 rounded-[10px] border border-[#fcd34d] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] p-5 text-[#451a03]">
      <div className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
        <Wand2 size={14} />
        Try the demo
      </div>
      <p className="mb-3.5 text-[13px] leading-[1.55] text-[#78350f]">
        Populate your account with the synthetic Riley Aldridge profile —
        12 years of B2B SaaS product leadership, 8 target companies, 9
        contacts, 10 jobs across all four pipeline stages, plus interviews
        scheduled this week. Lets you exercise every page and try the AI
        features (Cover Letters, Job Search) end-to-end.
      </p>

      {!confirming && !isLoading && !isDone && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#92400e] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#78350f]"
        >
          Run demo seed <ArrowRight size={12} />
        </button>
      )}

      {confirming && !isLoading && !isDone && (
        <div className="rounded-[8px] border border-[#92400e]/30 bg-white/60 p-3 text-[12px]">
          <div className="mb-2 flex items-start gap-1.5 font-medium text-[#451a03]">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>
              This will <strong>wipe</strong> your existing jobs, contacts,
              target companies, activities, interviews, milestones, and
              cover letters, then replace them with the synthetic dataset.
              Your sign-in stays intact.
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => seed.mutate()}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#92400e] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#78350f]"
            >
              Yes, wipe & seed
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-[6px] border border-[#92400e]/30 px-3 py-1.5 text-[12px] font-medium text-[#451a03] hover:bg-white/50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="inline-flex items-center gap-2 rounded-[6px] bg-white/60 px-3 py-1.5 text-[13px] text-[#451a03]">
          <Loader2 size={13} className="animate-spin" />
          Seeding demo data…
        </div>
      )}

      {isDone && (
        <div className="inline-flex items-center gap-2 rounded-[6px] bg-white/70 px-3 py-1.5 text-[13px] font-medium text-[#14532d]">
          <CheckCircle2 size={13} />
          Demo seeded — opening Today…
        </div>
      )}

      {error && (
        <div className="mt-2 rounded-[6px] border border-priority-high bg-white/60 p-2 text-[12px] text-priority-high">
          Seed failed: {error}
        </div>
      )}
    </div>
  )
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

  const isFirstLoad = data.isLoading && data.jobs.length === 0
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

        <DemoCard />

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

        {/* About the demo */}
        <div className="mx-7 mt-4 rounded-[10px] border border-line bg-elevated p-5 text-[13px] text-ink-secondary">
          <h2 className="mb-2 text-[15px] font-semibold text-ink">
            About this demo
          </h2>
          <p className="mb-2 leading-[1.55]">
            Koudou is a job-search CRM I (April Dawn) am building publicly.
            This deployment at{' '}
            <code className="rounded bg-hover px-1 py-0.5 text-[12px]">
              koudou.pages.dev
            </code>{' '}
            is a private demo — sign-in is invite-only via a shared code
            while the project stays in personal-tool scope.
          </p>
          <p className="mb-2 leading-[1.55]">
            <strong>AI features are rate-limited per user</strong> — 5
            cover letters and 10 AI job searches per day — to keep costs
            predictable. Click <strong>Run demo seed</strong> above to
            populate your account so every page has data to explore.
          </p>
          <p className="leading-[1.55]">
            Source is on{' '}
            <a
              href="https://github.com/aprildawnphd/koudou"
              target="_blank"
              rel="noreferrer"
              className="text-accent-strong underline decoration-accent-strong/30 underline-offset-2 hover:decoration-accent-strong"
            >
              GitHub
            </a>{' '}
            (PolyForm Noncommercial). See{' '}
            <code className="rounded bg-hover px-1 py-0.5 text-[12px]">
              DEMO.md
            </code>{' '}
            for fork-and-host instructions.
          </p>
        </div>
      </div>
    </>
  )
}
