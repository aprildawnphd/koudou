import { CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  profileCompleteness,
  type CompletenessField,
} from '@/lib/profileCompleteness'
import type { Tables } from '@/integrations/supabase/types'

type Profile = Tables<'profiles'>

function barColor(score: number): string {
  if (score >= 80) return 'bg-warmth-referral'
  if (score >= 50) return 'bg-brand-strong'
  return 'bg-priority-high'
}

export function ProfileCompletenessCard({
  profile,
}: {
  profile: Profile | null | undefined
}) {
  const { score, missing } = profileCompleteness(profile)
  const topMissing: CompletenessField[] = missing
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)

  return (
    <div className="rounded-[12px] border border-line bg-elevated p-5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">
          Profile completeness
        </h2>
        <span
          className={cn(
            'font-mono text-[14px] font-bold',
            score >= 80
              ? 'text-warmth-referral'
              : score >= 50
                ? 'text-brand-strong'
                : 'text-priority-high',
          )}
        >
          {score}%
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-hover">
        <div
          className={cn('h-full rounded-full transition-all', barColor(score))}
          style={{ width: `${score}%` }}
        />
      </div>
      {missing.length === 0 ? (
        <p className="text-[12px] text-ink-secondary">
          Everything filled in — your AI matches will be as sharp as we can
          make them.
        </p>
      ) : (
        <>
          <p className="mb-2 text-[12px] text-ink-secondary">
            Top fields to add for better AI matching:
          </p>
          <ul className="space-y-1.5">
            {topMissing.map((f) => (
              <li
                key={f.key}
                className="flex items-start gap-2 text-[12px] text-ink"
              >
                <Circle size={11} className="mt-0.5 shrink-0 text-ink-muted" />
                <span>
                  <strong className="text-ink">{f.label}</strong>{' '}
                  <span className="font-mono text-[11px] text-ink-muted">
                    +{f.weight}%
                  </span>
                  <span className="ml-1.5 text-ink-secondary">— {f.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function ProfileCompletenessBanner({
  profile,
  threshold = 70,
}: {
  profile: Profile | null | undefined
  threshold?: number
}) {
  const { score, missing } = profileCompleteness(profile)
  if (score >= threshold) return null
  const topTwo = missing
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((f) => f.label)
    .join(' and ')

  return (
    <div className="rounded-[10px] border border-[#fcd34d] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] px-4 py-3 text-[13px] text-[#78350f]">
      <div className="mb-1 flex items-center gap-2 font-semibold text-[#451a03]">
        <CheckCircle2 size={14} />
        Your match scores could be higher
      </div>
      <p>
        Your profile is <strong>{score}% complete</strong> — the AI has less
        signal to score against. Filling in <strong>{topTwo}</strong> in your{' '}
        <a
          href="/profile"
          className="underline decoration-[#92400e]/40 underline-offset-2 hover:decoration-[#92400e]"
        >
          Profile
        </a>{' '}
        would close the biggest gaps.
      </p>
    </div>
  )
}
