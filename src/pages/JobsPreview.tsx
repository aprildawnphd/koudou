// Dev-only preview of the Jobs view with mocked data.
// Mounted at /preview/jobs so the layout can be inspected without a Supabase session.
import { useState } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { CompanyFavicon } from '@/components/CompanyFavicon'
import { PriorityBars } from '@/components/PriorityBars'
import { JobDetailPanelPreview } from '@/components/JobDetailPanelPreview'
import { ChevronDown, Filter, Plus, ArrowUpDown, LayoutGrid, Zap } from 'lucide-react'
import { MOCK_JOBS } from '@/lib/mockJobs'
import {
  STATUS_ORDER,
  STATUS_LABEL,
  STATUS_COLOR,
  statusBucket,
  type StatusBucket,
} from '@/lib/jobs'
import { appliedAgoText } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>

function JobRow({ job, onOpen }: { job: Job; onOpen: (j: Job) => void }) {
  const bucket = statusBucket(job.status)
  const date = appliedAgoText(job.applied_date)
  const shortId = `JOB-${job.id.slice(0, 6).toUpperCase()}`

  return (
    <div
      onClick={() => onOpen(job)}
      className="grid cursor-pointer grid-cols-[90px_1fr_150px_100px_110px_90px_32px] items-center gap-3.5 border-b border-line bg-elevated px-7 py-3 text-[13px] hover:bg-hover"
    >
      <span className="font-mono text-[11px] text-ink-muted">{shortId}</span>
      <div className="flex min-w-0 items-center gap-2.5">
        <CompanyFavicon name={job.company} />
        <div className="min-w-0 truncate">
          <span className="font-medium text-ink">{job.role}</span>
          <span className="ml-1.5 text-[12px] text-ink-muted">
            {job.company}
          </span>
        </div>
      </div>
      <Pill dotColor={STATUS_COLOR[bucket]}>
        {job.sub_status ?? STATUS_LABEL[bucket]}
      </Pill>
      <PriorityBars level={job.priority} />
      <span
        className={cn(
          'font-mono text-[12px]',
          date.cls === 'stale' && 'font-semibold text-priority-high',
          date.cls === 'soon' && 'font-semibold text-brand-strong',
          date.cls === '' && 'text-ink-secondary',
        )}
      >
        {date.text}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold',
          job.warm ? 'text-warmth-referral' : 'text-ink-muted',
        )}
      >
        <span
          className="size-1.5 rounded-full"
          style={{
            background: job.warm ? 'var(--warmth-referral)' : 'var(--text-muted)',
          }}
        />
        {job.warm ? 'WARM' : 'COLD'}
      </span>
      <div className="grid size-[22px] place-items-center rounded-full bg-accent-strong text-[10px] font-semibold text-white">
        AD
      </div>
    </div>
  )
}

function GroupHeader({
  bucket,
  count,
}: {
  bucket: StatusBucket
  count: number
}) {
  return (
    <div className="sticky top-0 z-[2] flex cursor-pointer items-center gap-2.5 border-b border-line bg-app-bg px-7 py-2.5">
      <ChevronDown size={10} className="text-ink-muted" />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: STATUS_COLOR[bucket] }}
      />
      <span className="text-[13px] font-semibold text-ink">
        {STATUS_LABEL[bucket]}
      </span>
      <span className="rounded-[10px] bg-hover px-1.5 py-px font-mono text-[11px] text-ink-muted">
        {count}
      </span>
    </div>
  )
}

export function JobsPreview() {
  const [openJob, setOpenJob] = useState<Job | null>(null)

  const buckets = new Map<StatusBucket, Job[]>()
  for (const j of MOCK_JOBS) {
    const b = statusBucket(j.status)
    if (!buckets.has(b)) buckets.set(b, [])
    buckets.get(b)!.push(j)
  }
  const grouped = STATUS_ORDER.filter(
    (b) => (buckets.get(b)?.length ?? 0) > 0,
  ).map((b) => ({ bucket: b, jobs: buckets.get(b)! }))

  const staleCount = MOCK_JOBS.filter((j) => {
    if (!j.applied_date) return false
    return (Date.now() - new Date(j.applied_date).getTime()) / 86_400_000 >= 14
  }).length

  return (
    <div className="grid h-screen grid-cols-[232px_1fr] overflow-hidden">
      <Sidebar />
      <main className="flex flex-col overflow-hidden bg-app-bg">
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-300 bg-amber-50 px-7 py-1.5 text-[11px] font-semibold tracking-[0.04em] text-amber-700 uppercase">
          Preview mode · mock data · /preview/jobs
        </div>
        <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
          <div className="flex-1">
            <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
              Jobs
            </h1>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Your active pipeline — every job, grouped by stage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button>
              <LayoutGrid size={12} /> Display
            </Button>
            <Button>
              <ArrowUpDown size={12} /> Sort
            </Button>
            <Button variant="primary">
              <Plus size={12} /> New Job
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-line px-7 py-2.5">
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-accent-strong bg-accent-strong px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-white">
            All <span className="font-mono">{MOCK_JOBS.length}</span>
          </button>
          <span className="mx-1 h-4 w-px shrink-0 bg-line" />
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-ink-secondary hover:border-line-strong hover:text-ink">
            <Filter size={11} /> Filter
          </button>
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-ink-secondary hover:border-line-strong hover:text-ink">
            Status: Active
          </button>
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-ink-secondary hover:border-line-strong hover:text-ink">
            Tier: Any
          </button>
          <button className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-ink-secondary hover:border-line-strong hover:text-ink">
            Owner: Me
          </button>
          {staleCount > 0 && (
            <button className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-[6px] border border-[#fca5a5] bg-elevated px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-priority-high">
              <Zap size={11} /> Stale 14d+ <span className="font-mono">{staleCount}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {grouped.map((g) => (
            <div key={g.bucket}>
              <GroupHeader bucket={g.bucket} count={g.jobs.length} />
              {g.jobs.map((j) => (
                <JobRow key={j.id} job={j} onOpen={setOpenJob} />
              ))}
            </div>
          ))}
        </div>

        <JobDetailPanelPreview job={openJob} onClose={() => setOpenJob(null)} />
      </main>
    </div>
  )
}
