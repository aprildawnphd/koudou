import { useState } from 'react'
import { AlertCircle, ArrowRight } from 'lucide-react'

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
  { key: 'applications' as const, label: 'Applications', number: 1 },
  { key: 'interviews' as const, label: 'Interviews', number: 2 },
  { key: 'offers' as const, label: 'Offers', number: 3 },
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

  function conversionPct(from: number, to: number): string {
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
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
        <span>Pipeline stages</span>
        <span className="text-ink-muted">·</span>
        <span>3 sequential</span>
      </div>
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

        {/* Conversion labels overlaid as HTML pills above each ribbon. Each
            pill shows both the ratio (5 of 10) and the percentage (50%) so a
            user can read what the slope means without reverse-engineering.
            Uses fr columns + percentage top so it tracks the SVG's responsive
            scaling on narrow screens. */}
        <div
          className="pointer-events-none absolute inset-x-0 grid w-full"
          style={{
            gridTemplateColumns: `${BAR_WIDTH}fr ${RIBBON_GAP}fr ${BAR_WIDTH}fr ${RIBBON_GAP}fr ${BAR_WIDTH}fr`,
            top: `${((BASELINE_Y - BAR_MAX_HEIGHT / 2 - 16) / CHART_HEIGHT) * 100}%`,
          }}
        >
          <div />
          <ConversionPill
            from={data.applications.count}
            to={data.interviews.count}
            sourceLabel="apps"
            pct={conversionPct(data.applications.count, data.interviews.count)}
            highlighted={hoverStage === 'interviews' || hoverStage === 'applications'}
          />
          <div />
          <ConversionPill
            from={data.interviews.count}
            to={data.offers.count}
            sourceLabel="interviews"
            pct={conversionPct(data.interviews.count, data.offers.count)}
            highlighted={hoverStage === 'offers' || hoverStage === 'interviews'}
          />
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
            <div className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-warmth-referral/15 font-mono text-[9px] font-bold text-warmth-referral">
                {STAGES[i].number}
              </span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                {STAGES[i].label}
              </span>
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
      <div className="mt-4 space-y-1 border-t border-line pt-3 text-[11px] text-ink-muted">
        <p>
          <strong className="text-ink-secondary">Bars</strong> = jobs at or
          past each stage.{' '}
          <strong className="text-ink-secondary">Ribbon slope</strong> = how
          much of the cohort dropped off between stages — gentler slope is
          higher conversion.{' '}
          <strong className="text-ink-secondary">Pill on each ribbon</strong>{' '}
          = exact ratio and percentage.
        </p>
        <p>
          Conversion shown only when source stage has{' '}
          {MIN_N_FOR_CONVERSION}+ jobs (smaller samples produce meaningless
          rates).
        </p>
      </div>
    </div>
  )
}

function ConversionPill({
  from,
  to,
  sourceLabel,
  pct,
  highlighted,
}: {
  from: number
  to: number
  sourceLabel: string
  pct: string
  highlighted: boolean
}) {
  const enoughData = from >= MIN_N_FOR_CONVERSION
  return (
    <div className="flex justify-center">
      <div
        className={`pointer-events-auto inline-flex items-center gap-1 rounded-[6px] border px-2 py-1 shadow-sm transition-colors ${
          highlighted
            ? 'border-warmth-referral bg-elevated'
            : 'border-line bg-elevated'
        }`}
        title={
          enoughData
            ? `${to} of ${from} ${sourceLabel} progressed to the next stage`
            : `Only ${from} ${sourceLabel} so far — need ${MIN_N_FOR_CONVERSION}+ to compute a meaningful conversion rate`
        }
      >
        {enoughData ? (
          <>
            <span className="font-mono text-[12px] font-semibold text-ink">
              {to}
            </span>
            <span className="text-[11px] text-ink-muted">of</span>
            <span className="font-mono text-[12px] font-semibold text-ink-secondary">
              {from}
            </span>
            <ArrowRight size={10} className="text-ink-muted" />
            <span className="font-mono text-[12px] font-semibold text-warmth-referral">
              {pct}
            </span>
            <span className="text-[10px] uppercase tracking-[0.04em] text-ink-muted">
              converted
            </span>
          </>
        ) : (
          <span className="text-[11px] text-ink-muted">
            need {MIN_N_FOR_CONVERSION}+ to compute
          </span>
        )}
      </div>
    </div>
  )
}
