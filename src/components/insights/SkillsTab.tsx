import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Star,
} from 'lucide-react'
import { invokeEdge, EdgeError } from '@/lib/edgeFunctions'
import { cn } from '@/lib/utils'

type Importance = 'critical' | 'important' | 'nice-to-have'

type Gap = {
  skill: string
  importance: Importance
  reason: string
  learning_suggestion: string
  example_jobs?: string[]
}

type Strength = {
  skill: string
  leverage_tip: string
}

type SkillAnalysis = {
  summary: string
  gaps: Gap[]
  strengths: Strength[]
}

const IMPORTANCE_STYLE: Record<Importance, { label: string; cls: string }> = {
  critical: {
    label: 'Critical',
    cls: 'bg-priority-high/10 text-priority-high border-priority-high/30',
  },
  important: {
    label: 'Important',
    cls: 'bg-brand-strong/10 text-brand-strong border-brand-strong/30',
  },
  'nice-to-have': {
    label: 'Nice to have',
    cls: 'bg-hover text-ink-secondary border-line',
  },
}

export function SkillsTab() {
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [result, setResult] = useState<SkillAnalysis | null>(null)

  const analyze = useMutation({
    mutationFn: async () => {
      return await invokeEdge<SkillAnalysis>('analyze-skill-gap', {})
    },
    onSuccess: (data) => {
      setResult(data)
      setError(null)
    },
    onError: (e) => {
      setError({
        message: e instanceof Error ? e.message : 'Skill analysis failed',
        retryable: e instanceof EdgeError && e.retryable,
      })
    },
  })

  if (!result && !analyze.isPending && !error) {
    return (
      <div className="m-7">
        <EmptyState onRun={() => analyze.mutate()} />
      </div>
    )
  }

  return (
    <div className="m-7 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-ink">
          Skill alignment vs. your pipeline
        </h2>
        <button
          type="button"
          onClick={() => analyze.mutate()}
          disabled={analyze.isPending}
          className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-line-strong disabled:opacity-60"
        >
          {analyze.isPending ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <RefreshCw size={12} /> Re-run
            </>
          )}
        </button>
      </div>

      {error && (
        <div
          className={cn(
            'rounded-[8px] border px-4 py-3 text-[13px]',
            error.retryable
              ? 'border-warmth-referral/30 bg-warmth-referral/10 text-ink'
              : 'border-priority-high/30 bg-priority-high/5 text-priority-high',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">{error.message}</div>
            {error.retryable && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  analyze.mutate()
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-warmth-referral px-3 py-1.5 text-[12px] font-medium text-white hover:bg-warmth-referral/90"
              >
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>
        </div>
      )}

      {analyze.isPending && !result && (
        <div className="rounded-[12px] border border-line bg-elevated p-6">
          <div className="mb-3 flex items-center gap-2 text-[13px] text-ink-secondary">
            <Loader2 size={14} className="animate-spin" /> Analyzing your profile against the pipeline…
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-20 rounded bg-hover" />
                <div className="h-3 flex-1 rounded bg-hover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <>
          {/* Summary card */}
          <div className="rounded-[12px] border border-line bg-elevated p-5">
            <div className="mb-1 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
              <Sparkles size={12} className="text-brand-strong" /> Summary
            </div>
            <p className="text-[14px] leading-[1.55] text-ink">{result.summary}</p>
          </div>

          {/* Gaps */}
          <div>
            <h3 className="mb-2 text-[14px] font-semibold text-ink">
              Gaps to close{' '}
              <span className="text-ink-muted font-normal">
                ({result.gaps.length})
              </span>
            </h3>
            <div className="space-y-2.5">
              {result.gaps.map((gap, i) => (
                <GapRow key={i} gap={gap} />
              ))}
            </div>
          </div>

          {/* Strengths */}
          <div>
            <h3 className="mb-2 text-[14px] font-semibold text-ink">
              Strengths to leverage{' '}
              <span className="text-ink-muted font-normal">
                ({result.strengths.length})
              </span>
            </h3>
            <div className="space-y-2.5">
              {result.strengths.map((s, i) => (
                <StrengthRow key={i} strength={s} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ onRun }: { onRun: () => void }) {
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-brand-strong">
        <Sparkles size={24} />
      </div>
      <h3 className="mb-1.5 text-[18px] font-semibold text-ink">
        Skill gap analysis
      </h3>
      <p className="mx-auto mb-5 max-w-[480px] text-[13px] leading-[1.55] text-ink-secondary">
        Compares your profile (skills, target roles, resume) against the active
        pipeline to identify the most actionable gaps and your strongest leverage
        points. Costs one of your 5 daily AI runs.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-strong/90"
      >
        <Sparkles size={12} /> Run analysis
      </button>
      <p className="mt-3 text-[11px] text-ink-muted">
        Requires at least 1 target role + 1 active job in your pipeline.
      </p>
    </div>
  )
}

function GapRow({ gap }: { gap: Gap }) {
  const sty = IMPORTANCE_STYLE[gap.importance]
  return (
    <div className="rounded-[10px] border border-line bg-elevated p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-[14px] font-semibold text-ink">{gap.skill}</div>
          <div className="mt-0.5 text-[12.5px] leading-[1.55] text-ink-secondary">
            {gap.reason}
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-[4px] border px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase',
            sty.cls,
          )}
        >
          {sty.label}
        </span>
      </div>
      <div className="rounded-[6px] border border-dashed border-line bg-app-bg p-2.5 text-[12.5px] leading-[1.55] text-ink">
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
          <ArrowRight size={11} /> Next step
        </div>
        {gap.learning_suggestion}
      </div>
      {gap.example_jobs && gap.example_jobs.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <AlertCircle size={11} />
          Seen in: {gap.example_jobs.join(' · ')}
        </div>
      )}
    </div>
  )
}

function StrengthRow({ strength }: { strength: Strength }) {
  return (
    <div className="rounded-[10px] border border-warmth-referral/30 bg-warmth-referral/5 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Star size={13} className="text-warmth-referral" />
        <div className="text-[14px] font-semibold text-ink">
          {strength.skill}
        </div>
      </div>
      <div className="text-[12.5px] leading-[1.55] text-ink-secondary">
        {strength.leverage_tip}
      </div>
    </div>
  )
}
