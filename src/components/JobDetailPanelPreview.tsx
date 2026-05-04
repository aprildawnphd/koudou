// Dev-only preview variant of JobDetailPanel — reads from MOCK_ACTIVITIES
// instead of Supabase so /preview/jobs works without auth.
import { Sheet } from './ui/Sheet'
import { Pill } from './ui/Pill'
import { CompanyFavicon } from './CompanyFavicon'
import { statusBucket, STATUS_COLOR, STATUS_LABEL } from '@/lib/jobs'
import { MOCK_ACTIVITIES } from '@/lib/mockJobs'
import type { Tables } from '@/integrations/supabase/types'
import type { Priority } from './PriorityBars'

type Job = Tables<'jobs'>

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Urgent',
  medium: 'High',
  low: 'Med',
}

function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
        {label}
      </span>
      <span className="text-[13px] text-ink">{children}</span>
    </div>
  )
}

function MatchStars({ score }: { score: number | null }) {
  const n = Math.max(0, Math.min(5, score ?? 0))
  return (
    <span className="text-brand-strong">
      {'★'.repeat(n)}
      <span className="text-line-strong">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

export function JobDetailPanelPreview({
  job,
  onClose,
}: {
  job: Job | null
  onClose: () => void
}) {
  const activities = job ? MOCK_ACTIVITIES[job.id] ?? [] : []
  const bucket = job ? statusBucket(job.status) : 'other'

  return (
    <Sheet
      open={!!job}
      onOpenChange={(o) => !o && onClose()}
      title={job?.role ?? 'Job detail'}
      headerLeft={job?.id ? `JOB-${job.id.slice(0, 6).toUpperCase()}` : ''}
    >
      {!job ? null : (
        <>
          <div className="mb-5 flex items-start gap-3">
            <CompanyFavicon name={job.company} size={28} />
            <div>
              <div className="text-[18px] font-bold tracking-[-0.01em] text-ink">
                {job.role}
              </div>
              <div className="mt-0.5 text-[13px] text-ink-muted">
                {job.company}
                {job.location && (
                  <span className="ml-2 text-ink-muted">· {job.location}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3.5 rounded-[8px] border border-line bg-app-bg p-3.5">
            <MetaCell label="Status">
              <Pill dotColor={STATUS_COLOR[bucket]}>{STATUS_LABEL[bucket]}</Pill>
            </MetaCell>
            <MetaCell label="Priority">{PRIORITY_LABEL[job.priority]}</MetaCell>
            <MetaCell label="Match">
              <MatchStars score={job.match_score} />
            </MetaCell>
            <MetaCell label="Signal">
              <span
                className={
                  job.warm
                    ? 'inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-warmth-referral'
                    : 'inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-ink-muted'
                }
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background: job.warm
                      ? 'var(--warmth-referral)'
                      : 'var(--text-muted)',
                  }}
                />
                {job.warm ? 'WARM' : 'COLD'}
              </span>
            </MetaCell>
          </div>

          <section className="mb-6">
            <div className="mb-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Activity
            </div>
            {activities.length === 0 ? (
              <div className="py-3 text-[12px] text-ink-muted">
                No activity logged yet.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {activities.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-[60px_80px_1fr] items-center gap-2.5 py-2 text-[12px]"
                  >
                    <span className="font-mono text-ink-muted">
                      {new Date(a.occurred_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="w-fit rounded-[3px] bg-hover px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                      {a.type}
                    </span>
                    <span className="text-ink">{a.text ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </Sheet>
  )
}
