import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

// 3-stage Pendo-style flow funnel. Bars sized proportional to applications
// count (the largest); sloped trapezoid ribbons between stages encode the
// drop-off visually. Hover any stage column to highlight the inbound ribbon
// and reveal the conversion % into that stage.
//
// Min-N gating: when the source stage's count is below MIN_N_FOR_CONVERSION,
// the conversion % renders as "—" — small samples produce meaningless rates
// (1/1 = 100% is not insight). Lovable used 5; we follow.

export type FunnelStage = {
  count: number
  stalled: number
}

export type FunnelData = {
  applications: FunnelStage
  interviews: FunnelStage
  offers: FunnelStage
}

const MIN_N_FOR_CONVERSION = 5

const STAGES = [
  { key: 'applications' as const, label: 'Applications' },
  { key: 'interviews' as const, label: 'Interviews' },
  { key: 'offers' as const, label: 'Offers' },
]

const STALLED_LABEL: Record<keyof FunnelData, string> = {
  applications: 'stalled at apply/screen',
  interviews: 'stalled at interview',
  offers: 'stalled at offer',
}

const CHART_WIDTH = 720
const CHART_HEIGHT = 240
const BAR_WIDTH = 96
const BAR_MAX_HEIGHT = 180
const BAR_MIN_HEIGHT = 6
const BAR_TOP_PADDING = 24 // room above the tallest bar for labels
const BASELINE_Y = BAR_TOP_PADDING + BAR_MAX_HEIGHT
const RIBBON_GAP = (CHART_WIDTH - BAR_WIDTH * 3) / 2
const COL_X = [
  0,
  BAR_WIDTH + RIBBON_GAP,
  (BAR_WIDTH + RIBBON_GAP) * 2,
]

export function PipelineFunnelChart({ data }: { data: FunnelData }) {
  const [hoverStage, setHoverStage] = useState<keyof FunnelData | null>(null)

  const apps = data.applications.count

  if (apps === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-line bg-elevated px-6 py-12 text-center">
        <p className="text-[14px] text-ink-secondary">
          No applications in the selected time window.
        </p>
        <p className="mt-1.5 text-[12px] text-ink-muted">
          Add jobs and apply to roles to see your funnel shape here.
        </p>
      </div>
    )
  }

  // Bar heights scale to the application count so the visual shape IS the
  // funnel. A stage with 0 still gets a thin sliver so the column is visible.
  function barHeight(count: number): number {
    if (count === 0) return BAR_MIN_HEIGHT
    return Math.max(BAR_MIN_HEIGHT, Math.round((count / apps) * BAR_MAX_HEIGHT))
  }

  function barTop(count: number): number {
    return BASELINE_Y - barHeight(count)
  }

  function conversion(from: number, to: number): string {
    if (from < MIN_N_FOR_CONVERSION) return '—'
    if (from === 0) return '—'
    return `${Math.round((to / from) * 100)}%`
  }

  // Build ribbon (trapezoid) path from stage A's right edge to stage B's left.
  function ribbonPath(
    leftX: number,
    leftTop: number,
    rightX: number,
    rightTop: number,
  ): string {
    return `M ${leftX} ${leftTop} L ${rightX} ${rightTop} L ${rightX} ${BASELINE_Y} L ${leftX} ${BASELINE_Y} Z`
  }

  const stageData = [
    {
      key: 'applications' as const,
      label: 'Applications',
      count: data.applications.count,
      stalled: data.applications.stalled,
      stalledLabel: STALLED_LABEL.applications,
      top: barTop(data.applications.count),
      h: barHeight(data.applications.count),
    },
    {
      key: 'interviews' as const,
      label: 'Interviews',
      count: data.interviews.count,
      stalled: data.interviews.stalled,
      stalledLabel: STALLED_LABEL.interviews,
      top: barTop(data.interviews.count),
      h: barHeight(data.interviews.count),
    },
    {
      key: 'offers' as const,
      label: 'Offers',
      count: data.offers.count,
      stalled: data.offers.stalled,
      stalledLabel: STALLED_LABEL.offers,
      top: barTop(data.offers.count),
      h: barHeight(data.offers.count),
    },
  ]

  return (
    <div className="rounded-[12px] border border-line bg-elevated p-6">
      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Baseline */}
          <line
            x1={0}
            x2={CHART_WIDTH}
            y1={BASELINE_Y}
            y2={BASELINE_Y}
            stroke="var(--color-line)"
            strokeWidth="1"
          />

          {/* Ribbon 1: applications → interviews */}
          <path
            d={ribbonPath(
              COL_X[0] + BAR_WIDTH,
              stageData[0].top,
              COL_X[1],
              stageData[1].top,
            )}
            className={
              hoverStage === 'interviews'
                ? 'fill-warmth-referral/40'
                : 'fill-warmth-referral/20'
            }
          />

          {/* Ribbon 2: interviews → offers */}
          <path
            d={ribbonPath(
              COL_X[1] + BAR_WIDTH,
              stageData[1].top,
              COL_X[2],
              stageData[2].top,
            )}
            className={
              hoverStage === 'offers'
                ? 'fill-warmth-referral/40'
                : 'fill-warmth-referral/20'
            }
          />

          {/* Bars */}
          {stageData.map((s, i) => (
            <rect
              key={s.key}
              x={COL_X[i]}
              y={s.top}
              width={BAR_WIDTH}
              height={s.h}
              rx={4}
              className={
                hoverStage === s.key
                  ? 'fill-warmth-referral'
                  : 'fill-warmth-referral/80'
              }
              onMouseEnter={() => setHoverStage(s.key)}
              onMouseLeave={() => setHoverStage(null)}
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* Stage totals on top of each bar */}
          {stageData.map((s, i) => (
            <text
              key={`total-${s.key}`}
              x={COL_X[i] + BAR_WIDTH / 2}
              y={s.top - 8}
              textAnchor="middle"
              className="font-mono text-[16px] font-bold fill-ink"
            >
              {s.count}
            </text>
          ))}
        </svg>

        {/* Conversion % labels overlaid as HTML (easier styling than SVG <text>) */}
        <div
          className="pointer-events-none absolute top-0 grid w-full"
          style={{
            gridTemplateColumns: `${BAR_WIDTH}px ${RIBBON_GAP}px ${BAR_WIDTH}px ${RIBBON_GAP}px ${BAR_WIDTH}px`,
            paddingTop: `${BASELINE_Y - 14}px`,
          }}
        >
          <div />
          <div className="text-center">
            <span
              className={
                data.applications.count >= MIN_N_FOR_CONVERSION
                  ? 'rounded-[4px] bg-elevated px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary shadow-sm'
                  : 'rounded-[4px] bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted shadow-sm'
              }
            >
              {conversion(data.applications.count, data.interviews.count)}
            </span>
          </div>
          <div />
          <div className="text-center">
            <span
              className={
                data.interviews.count >= MIN_N_FOR_CONVERSION
                  ? 'rounded-[4px] bg-elevated px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary shadow-sm'
                  : 'rounded-[4px] bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-ink-muted shadow-sm'
              }
            >
              {conversion(data.interviews.count, data.offers.count)}
            </span>
          </div>
          <div />
        </div>
      </div>

      {/* Stage labels + stalled badges below the chart */}
      <div
        className="mt-3 grid gap-0"
        style={{
          gridTemplateColumns: `${BAR_WIDTH}px ${RIBBON_GAP}px ${BAR_WIDTH}px ${RIBBON_GAP}px ${BAR_WIDTH}px`,
        }}
      >
        {stageData.map((s, i) => (
          <div
            key={`label-${s.key}`}
            style={{ gridColumn: `${i * 2 + 1}` }}
            className="flex flex-col items-center gap-1"
          >
            <div className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
              {STAGES[i].label}
            </div>
            {s.stalled > 0 && (
              <div
                className="inline-flex items-center gap-1 rounded-[4px] bg-priority-high/10 px-1.5 py-0.5 text-[10px] font-medium text-priority-high"
                title={`${s.stalled} ${s.stalledLabel}`}
              >
                <AlertCircle size={10} />
                {s.stalled} stalled
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-[11px] text-ink-muted">
        <span>
          <strong className="text-ink-secondary">Conversion %</strong> shown
          when stage has {MIN_N_FOR_CONVERSION}+ jobs. Below that, sample is
          too small to interpret.
        </span>
      </div>
    </div>
  )
}
