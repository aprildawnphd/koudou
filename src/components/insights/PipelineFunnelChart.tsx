import { cn } from '@/lib/utils'

type Stage = 'applied' | 'screening' | 'interview' | 'offer'

const STAGES: { key: Stage; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
]

export type FunnelData = Record<Stage, { warm: number; cold: number }>

// Pure-SVG stacked bar chart of pipeline state.
// Two lanes (warm/cold) stacked per stage. Numbers labeled on each segment.
// Bar heights scale to the max stage count so the visual emphasizes shape, not magnitude.
export function PipelineFunnelChart({ data }: { data: FunnelData }) {
  const totals = STAGES.map(
    (s) => data[s.key].warm + data[s.key].cold,
  )
  const max = Math.max(1, ...totals)

  const overall = totals.reduce((a, b) => a + b, 0)

  if (overall === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-line bg-elevated px-6 py-12 text-center">
        <p className="text-[14px] text-ink-secondary">
          No active jobs in your pipeline yet.
        </p>
        <p className="mt-1.5 text-[12px] text-ink-muted">
          Add jobs to see your funnel shape here.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[12px] border border-line bg-elevated p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">Current pipeline</h3>
          <p className="text-[12px] text-ink-secondary">
            {overall} job{overall === 1 ? '' : 's'} across active stages
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-warmth-referral" />
            Warm
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-line-strong" />
            Cold
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {STAGES.map((s, i) => {
          const stage = data[s.key]
          const total = stage.warm + stage.cold
          const pct = total / max
          // Ensure visible bar even at low counts
          const heightPx = Math.max(total > 0 ? 36 : 4, Math.round(180 * pct))
          const warmPx = total > 0 ? Math.round(heightPx * (stage.warm / total)) : 0
          const coldPx = heightPx - warmPx

          return (
            <div key={s.key} className="flex flex-col items-stretch">
              <div className="mb-2 text-center text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                {s.label}
              </div>

              <div className="relative mb-1 flex flex-col justify-end" style={{ height: 200 }}>
                <div
                  className={cn(
                    'rounded-t-[4px] bg-warmth-referral transition-all',
                    stage.warm === 0 && 'opacity-0',
                  )}
                  style={{ height: warmPx }}
                  title={`${stage.warm} warm ${s.label.toLowerCase()}`}
                >
                  {stage.warm > 0 && (
                    <div className="px-1 pt-0.5 text-center font-mono text-[11px] font-semibold text-white">
                      {stage.warm}
                    </div>
                  )}
                </div>
                <div
                  className={cn(
                    'bg-line-strong transition-all',
                    stage.cold === 0 && 'opacity-0',
                    i === STAGES.length - 1 ? 'rounded-b-[4px]' : 'rounded-b-[4px]',
                    stage.warm === 0 && 'rounded-t-[4px]',
                  )}
                  style={{ height: coldPx }}
                  title={`${stage.cold} cold ${s.label.toLowerCase()}`}
                >
                  {stage.cold > 0 && (
                    <div className="px-1 pt-0.5 text-center font-mono text-[11px] font-semibold text-ink">
                      {stage.cold}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center font-mono text-[14px] font-bold text-ink">
                {total}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
