import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Sparkles, ExternalLink, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { invokeEdge, EdgeError } from '@/lib/edgeFunctions'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { InfoPopover } from '@/components/ui/InfoPopover'
import { CompanyFavicon } from '@/components/CompanyFavicon'
import { ProfileCompletenessBanner } from '@/components/ProfileCompleteness'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type SuggestedJob = {
  company: string
  title: string
  location: string
  type: 'remote' | 'hybrid' | 'onsite'
  salary: string
  match_score: number
  match_reason: string
  url: string
  posted_ago?: string
  hiring_contact?: string
  job_source: 'web' | 'ai-suggestion' | string // tolerate older shape during rollout
  skills: string[]
}

type SearchMeta = {
  webResults?: number
  aiSuggestions?: number
  totalResults?: number
}

const inputClass =
  'w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20'

function CreativityHelp() {
  return (
    <InfoPopover title="What Creativity does">
      <p>Three different instructions sent to the AI — not an algorithm:</p>
      <ul className="space-y-1 pl-3">
        <li>
          <strong className="text-ink">Conservative</strong> — only
          near-perfect matches to your stated targets.
        </li>
        <li>
          <strong className="text-ink">Balanced</strong> — close matches plus a
          few stretches that leverage transferable skills.
        </li>
        <li>
          <strong className="text-ink">Exploratory</strong> — adjacent roles,
          unexpected industries, lateral moves.
        </li>
      </ul>
      <p>These literally change the prompt the AI follows.</p>
    </InfoPopover>
  )
}

function MatchScoreHelp() {
  return (
    <InfoPopover title="What match score means">
      <p>
        The AI's subjective fit score (0–100) for this suggestion against your
        profile. Not a formula.
      </p>
      <ul className="space-y-1 pl-3">
        <li>
          <strong className="text-warmth-referral">80+</strong> — strong fit
        </li>
        <li>
          <strong className="text-brand-strong">60–79</strong> — moderate fit,
          usually with a stretch dimension
        </li>
        <li>
          <strong className="text-ink-muted">&lt;60</strong> — weak /
          exploratory
        </li>
      </ul>
      <p>
        Not deterministic — same search may shift ±5 points across runs.
        Compare scores within a single search, not across runs.
      </p>
    </InfoPopover>
  )
}

export function Search() {
  const [focusKeywords, setFocusKeywords] = useState('')
  const [creativityLevel, setCreativityLevel] = useState<
    'conservative' | 'balanced' | 'exploratory'
  >('balanced')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [resultCount, setResultCount] = useState(10)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<SuggestedJob[] | null>(null)
  const [meta, setMeta] = useState<SearchMeta | null>(null)
  const [error, setError] = useState<{ message: string; retryable: boolean } | null>(null)
  const [formExpanded, setFormExpanded] = useState(true)

  // Profile completeness check — drives the inline banner + a friendly
  // guard so the user gets a clear nudge before the edge function rejects.
  const { data: profile } = useQuery({
    queryKey: ['profile', 'self'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .maybeSingle()
      return data as Tables<'profiles'> | null
    },
  })
  const profileMissingTargetRoles =
    !!profile && (profile.target_roles ?? []).length === 0

  async function run() {
    setError(null)
    setRunning(true)
    setResults(null)
    setMeta(null)
    try {
      const payload = await invokeEdge<{
        success?: boolean
        data?: SuggestedJob[]
        meta?: SearchMeta
      }>('ai-job-search', {
        searchParams: {
          resultCount,
          remoteOnly,
          creativityLevel,
          focusKeywords: focusKeywords.trim(),
        },
      })
      setResults(payload.data ?? [])
      setMeta(payload.meta ?? null)
      // Collapse the form once results land — gives the results list more
      // vertical room. User can re-expand via the chip's Edit button.
      setFormExpanded(false)
    } catch (e) {
      setError({
        message: e instanceof Error ? e.message : 'Search failed',
        retryable: e instanceof EdgeError && e.retryable,
      })
    } finally {
      setRunning(false)
    }
  }

  const creativityLabel: Record<typeof creativityLevel, string> = {
    conservative: 'Conservative',
    balanced: 'Balanced',
    exploratory: 'Exploratory',
  }

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink">
            Job Search
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            AI-suggested companies and roles to research, ranked against your
            profile.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-12">
        {profileMissingTargetRoles ? (
          <div className="mx-7 mb-4 rounded-[10px] border border-[#fcd34d] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] px-4 py-3 text-[13px] text-[#78350f]">
            Add target roles to your <strong>Profile</strong> first — AI Job
            Search uses them as the starting point for matches.
          </div>
        ) : (
          <div className="mx-7 mb-4">
            <ProfileCompletenessBanner profile={profile} />
          </div>
        )}

        {/* Collapsed summary chip — shown after a search has run, when the
            form is collapsed to give the results list more vertical space. */}
        {!formExpanded && results && (
          <section className="mx-7 mb-4">
            <div className="flex items-center gap-3 rounded-[10px] border border-line bg-elevated px-4 py-2.5">
              <SearchIcon size={14} className="text-ink-muted" />
              <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-secondary">
                {focusKeywords && (
                  <span>
                    <span className="text-ink-muted">Keywords:</span>{' '}
                    <strong className="text-ink">{focusKeywords}</strong>
                  </span>
                )}
                <span>
                  <span className="text-ink-muted">Creativity:</span>{' '}
                  <strong className="text-ink">
                    {creativityLabel[creativityLevel]}
                  </strong>
                </span>
                <span>
                  <span className="text-ink-muted">Count:</span>{' '}
                  <strong className="text-ink">{resultCount}</strong>
                </span>
                {remoteOnly && (
                  <span className="rounded-[4px] bg-hover px-1.5 py-0.5 font-mono text-[10px] text-ink-secondary">
                    REMOTE ONLY
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFormExpanded(true)}
                className="inline-flex items-center gap-1 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium text-ink-secondary hover:border-line-strong hover:text-ink"
              >
                Edit <ChevronDown size={11} />
              </button>
            </div>
          </section>
        )}

        {/* Search form — full state, shown when not collapsed */}
        {formExpanded && (
        <section className="mx-7 mb-5 rounded-[12px] border border-line bg-elevated p-5">
          {results && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => setFormExpanded(false)}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-muted hover:text-ink-secondary"
              >
                Collapse <ChevronUp size={11} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
                Focus keywords{' '}
                <span className="text-ink-muted">(optional)</span>
              </div>
              <input
                type="text"
                value={focusKeywords}
                onChange={(e) => setFocusKeywords(e.target.value)}
                className={inputClass}
                placeholder="platform, AI/ML, marketplace, B2B SaaS…"
              />
            </label>
            <label className="block">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
                Creativity
                <CreativityHelp />
              </div>
              <select
                value={creativityLevel}
                onChange={(e) =>
                  setCreativityLevel(e.target.value as typeof creativityLevel)
                }
                className={inputClass}
              >
                <option value="conservative">Conservative — close matches</option>
                <option value="balanced">Balanced — close + stretch</option>
                <option value="exploratory">Exploratory — wide net</option>
              </select>
            </label>
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
                Number of results
              </div>
              <input
                type="number"
                value={resultCount}
                onChange={(e) =>
                  setResultCount(
                    Math.max(1, Math.min(20, Number(e.target.value) || 10)),
                  )
                }
                min={1}
                max={20}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="size-4 accent-accent-strong"
              />
              <span className="text-[13px] text-ink">Remote only</span>
            </label>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="primary"
              onClick={run}
              disabled={running || profileMissingTargetRoles}
            >
              {running ? (
                <>
                  <SearchIcon size={12} className="animate-pulse" /> Searching…
                </>
              ) : (
                <>
                  <Sparkles size={12} /> Run search
                </>
              )}
            </Button>
            <span className="text-[12px] text-ink-muted">
              Rate-limited to 5 searches per hour.
            </span>
          </div>

          {error && (
            <ErrorBanner
              error={error}
              onRetry={() => {
                setError(null)
                run()
              }}
              compact
            />
          )}
        </section>
        )}

        {/* Show error in collapsed mode too — outside the section block. */}
        {!formExpanded && error && (
          <div className="mx-7 mb-4">
            <ErrorBanner
              error={error}
              onRetry={() => {
                setError(null)
                run()
              }}
            />
          </div>
        )}

        {/* Progress state — shown while AI is generating */}
        {running && (
          <section className="mx-7 mb-5">
            <div className="rounded-[12px] border border-line bg-elevated p-6">
              <div className="mb-3 flex items-center gap-2.5">
                <Sparkles
                  size={16}
                  className="animate-pulse text-brand-strong"
                />
                <span className="text-[14px] font-semibold text-ink">
                  AI is matching your profile against companies and roles…
                </span>
              </div>
              <p className="mb-4 text-[12px] text-ink-secondary">
                This typically takes 15–25 seconds. Claude is reading your
                resume + target roles and generating ranked suggestions.
              </p>
              {/* Skeleton rows */}
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-[8px] border border-line bg-app-bg p-3"
                  >
                    <div className="size-8 shrink-0 animate-pulse rounded-[5px] bg-hover" />
                    <div className="flex-1">
                      <div
                        className="h-3 animate-pulse rounded bg-hover"
                        style={{ width: `${60 + i * 10}%` }}
                      />
                      <div
                        className="mt-2 h-2 animate-pulse rounded bg-hover"
                        style={{ width: `${40 + i * 8}%` }}
                      />
                    </div>
                    <div className="size-10 animate-pulse rounded-[6px] bg-hover" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <section className="mx-7">
            <div className="mb-2 flex flex-wrap items-baseline gap-3 py-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                Results
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                {results.length} match{results.length === 1 ? '' : 'es'}, ranked
                by match score
                <MatchScoreHelp />
              </span>
              {meta && (meta.webResults ?? 0) + (meta.aiSuggestions ?? 0) > 0 && (
                <span className="ml-auto inline-flex items-center gap-2 text-[11px] text-ink-muted">
                  {(meta.webResults ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-warmth-referral/15 px-1.5 py-0.5 font-medium text-warmth-referral">
                      ◉ {meta.webResults} from web
                    </span>
                  )}
                  {(meta.aiSuggestions ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-hover px-1.5 py-0.5 font-medium text-ink-secondary">
                      ◌ {meta.aiSuggestions} AI suggestion
                      {meta.aiSuggestions === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
              )}
            </div>
            {results.map((r, idx) => {
              const isAiSuggestion = r.job_source === 'ai-suggestion'
              return (
              <div
                key={`${r.company}-${r.title}-${idx}`}
                className={cn(
                  'mb-2 rounded-[10px] border p-4',
                  isAiSuggestion
                    ? 'border-dashed border-line bg-app-bg'
                    : 'border-line bg-elevated',
                )}
              >
                <div className="flex items-start gap-3">
                  <CompanyFavicon name={r.company} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[14px] font-semibold text-ink">
                        {r.title}
                      </span>
                      <span className="text-[13px] text-ink-muted">
                        {r.company}
                      </span>
                      <span
                        className={cn(
                          'ml-1 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase',
                          isAiSuggestion
                            ? 'bg-hover text-ink-muted'
                            : 'bg-warmth-referral/15 text-warmth-referral',
                        )}
                      >
                        {isAiSuggestion ? 'AI Suggestion' : 'Web result'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-secondary">
                      <span>{r.location}</span>
                      <span className="text-ink-muted">·</span>
                      <Pill className="!py-px !text-[10px]">{r.type}</Pill>
                      {r.salary && (
                        <>
                          <span className="text-ink-muted">·</span>
                          <span className="font-mono">{r.salary}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-[13px] text-ink-secondary">
                      {r.match_reason}
                    </p>
                    {r.skills && r.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.skills.slice(0, 8).map((s) => (
                          <span
                            key={s}
                            className="rounded-[4px] bg-hover px-1.5 py-0.5 text-[10px] font-medium text-ink-secondary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={cn(
                        'rounded-[6px] px-2 py-1 text-center font-mono text-[12px] font-semibold',
                        r.match_score >= 80
                          ? 'bg-warmth-referral/15 text-warmth-referral'
                          : r.match_score >= 60
                            ? 'bg-status-interview/15 text-brand-strong'
                            : 'bg-hover text-ink-muted',
                      )}
                    >
                      {Math.round(r.match_score)}%
                    </div>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-accent-strong hover:underline"
                      >
                        {isAiSuggestion ? 'Careers page' : 'Open posting'}{' '}
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </section>
        )}

        {results && results.length === 0 && (
          <div className="mx-7 rounded-[10px] border border-line bg-elevated p-8 text-center text-[13px] text-ink-secondary">
            No matches above your match-score threshold. Loosen your filters or
            switch creativity to "Exploratory".
          </div>
        )}
      </div>
    </>
  )
}

function ErrorBanner({
  error,
  onRetry,
  compact = false,
}: {
  error: { message: string; retryable: boolean }
  onRetry: () => void
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[8px] border',
        compact ? 'mt-3 px-3 py-2 text-[12px]' : 'px-4 py-3 text-[13px]',
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
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-warmth-referral px-3 py-1.5 text-[12px] font-medium text-white hover:bg-warmth-referral/90"
          >
            <RefreshCw size={12} /> Retry
          </button>
        )}
      </div>
    </div>
  )
}
