import { useMemo } from 'react'
import { ChevronDown, Plus, Eye, Users as UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CompanyFavicon } from '@/components/CompanyFavicon'
import { EntryCallout } from '@/components/EntryCallout'
import { useTargetsData } from '@/hooks/useTargetsData'
import type { Tables } from '@/integrations/supabase/types'

type TargetCompany = Tables<'target_companies'>
type Job = Tables<'jobs'>

type Tier = 'dream' | 'strong' | 'interested'

const TIER_ORDER: Tier[] = ['dream', 'strong', 'interested']

const TIER_LABEL: Record<Tier, string> = {
  dream: 'Tier 1 — Dream',
  strong: 'Tier 2 — Strong fit',
  interested: 'Tier 3 — Interested',
}

const TIER_COLOR: Record<Tier, string> = {
  dream: '#1e3a8a', // navy
  strong: '#f59e0b', // gold
  interested: '#94a3b8', // grey
}

const INACTIVE_JOB_STATUSES = new Set(['rejected', 'withdrawn', 'closed'])

type CompanyAggregates = {
  jobsTracked: number
  contactsCount: number
  activeApps: number
}

function computeAggregates(
  tcId: string,
  jobs: Job[],
  contacts: { target_company_id: string | null }[],
): CompanyAggregates {
  const jobsAtCompany = jobs.filter((j) => j.target_company_id === tcId)
  const contactsAtCompany = contacts.filter((c) => c.target_company_id === tcId)
  const activeApps = jobsAtCompany.filter((j) => !INACTIVE_JOB_STATUSES.has(j.status)).length
  return {
    jobsTracked: jobsAtCompany.length,
    contactsCount: contactsAtCompany.length,
    activeApps,
  }
}

function GroupHeader({ tier, count }: { tier: Tier; count: number }) {
  return (
    <div className="sticky top-0 z-[2] flex cursor-pointer items-center gap-2.5 border-b border-line bg-app-bg px-7 py-2.5">
      <ChevronDown size={10} className="text-ink-muted" />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: TIER_COLOR[tier] }}
      />
      <span className="text-[13px] font-semibold text-ink">{TIER_LABEL[tier]}</span>
      <span className="rounded-[10px] bg-hover px-1.5 py-px font-mono text-[11px] text-ink-muted">
        {count}
      </span>
    </div>
  )
}

function CompanyRow({
  company,
  aggregates,
}: {
  company: TargetCompany
  aggregates: CompanyAggregates
}) {
  return (
    <div className="grid cursor-pointer grid-cols-[1fr_80px_90px_80px_auto] items-center gap-3.5 border-b border-line bg-elevated px-7 py-3 text-[13px] hover:bg-hover">
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyFavicon name={company.name} />
        <span className="truncate font-medium text-ink">{company.name}</span>
      </div>
      <span className="font-mono text-[12px] text-ink-muted">
        {aggregates.jobsTracked} job{aggregates.jobsTracked === 1 ? '' : 's'}
      </span>
      <span className="font-mono text-[12px] text-ink-muted">
        {aggregates.contactsCount} contact{aggregates.contactsCount === 1 ? '' : 's'}
      </span>
      <span className="font-mono text-[12px] text-ink-muted">
        {aggregates.activeApps} active
      </span>
      <div className="flex gap-1.5">
        {/* Visual-only stubs — wiring deferred to Session 6/7. */}
        <button
          type="button"
          title="Coming in a future session"
          className="inline-flex items-center gap-1 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:border-brand hover:text-brand-strong"
        >
          <Eye size={11} /> Watch board
        </button>
        <button
          type="button"
          title="Coming in a future session"
          className="inline-flex items-center gap-1 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[11px] font-medium text-ink-secondary hover:border-brand hover:text-brand-strong"
        >
          <UsersIcon size={11} /> Build promoters
        </button>
      </div>
    </div>
  )
}

function isTier(value: string | null): value is Tier {
  return value === 'dream' || value === 'strong' || value === 'interested'
}

export function Targets() {
  const { targetCompanies, jobs, contacts, isLoading, error } = useTargetsData()

  const grouped = useMemo(() => {
    const buckets = new Map<Tier, TargetCompany[]>()
    for (const tc of targetCompanies) {
      const t: Tier = isTier(tc.tier) ? tc.tier : 'interested'
      if (!buckets.has(t)) buckets.set(t, [])
      buckets.get(t)!.push(tc)
    }
    return TIER_ORDER.filter((t) => (buckets.get(t)?.length ?? 0) > 0).map((t) => ({
      tier: t,
      companies: buckets.get(t)!,
    }))
  }, [targetCompanies])

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
            Target Companies
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {targetCompanies.length} compan{targetCompanies.length === 1 ? 'y' : 'ies'}{' '}
            tracked across three tiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" title="Coming in a future session">
            <Plus size={12} /> Add target
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <EntryCallout
          head="COMPANY-FIRST ENTRY"
          body={
            <>
              For each target, choose your lane:{' '}
              <strong>watch their job board</strong> for new postings, or{' '}
              <strong>build promoters now</strong> so you have a warm intro when a role
              opens.
            </>
          }
        />

        {isLoading && (
          <div className="px-7 py-8 text-[13px] text-ink-muted">
            Loading target companies…
          </div>
        )}
        {error && (
          <div className="m-7 rounded-[8px] border border-priority-high/30 bg-priority-high/5 px-4 py-3 text-[13px] text-priority-high">
            Failed to load: {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && targetCompanies.length === 0 && (
          <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-2xl text-ink-muted">
              ★
            </div>
            <div className="mb-1.5 text-[18px] font-semibold text-ink">
              No target companies yet
            </div>
            <p className="mx-auto mb-4 max-w-[460px] text-[13px] text-ink-secondary">
              Add a Dream / Strong-fit / Interested company to start tracking.
            </p>
          </div>
        )}

        {grouped.map((g) => (
          <div key={g.tier}>
            <GroupHeader tier={g.tier} count={g.companies.length} />
            {g.companies.map((tc) => (
              <CompanyRow
                key={tc.id}
                company={tc}
                aggregates={computeAggregates(tc.id, jobs, contacts)}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
