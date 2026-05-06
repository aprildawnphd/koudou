import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search as SearchIcon, Sparkles, ExternalLink, HelpCircle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { invokeEdge } from '@/lib/edgeFunctions'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
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
  job_source: string
  skills: string[]
}

const inputClass =
  'w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20'

const CREATIVITY_TOOLTIP =
  'Three different instructions sent to the AI:\n\n' +
  '• Conservative — only near-perfect matches to your stated targets.\n' +
  '• Balanced — close matches plus a few stretches that leverage transferable skills.\n' +
  '• Exploratory — adjacent roles, unexpected industries, and lateral moves.\n\n' +
  'Not an algorithm — these literally change the prompt the AI follows.'

const MATCH_SCORE_TOOLTIP =
  "The AI's subjective fit score (0–100) for this suggestion against your profile.\n\n" +
  '• 80+ green = strong fit\n' +
  '• 60–79 gold = moderate fit, usually with a stretch dimension\n' +
  '• <60 grey = weak / exploratory\n\n' +
  "Not deterministic — same search may shift ±5 points across runs. Compare scores within a single search, not across runs."

function InfoIcon({ tooltip }: { tooltip: string }) {
  return (
    <span
      className="inline-flex cursor-help align-middle text-ink-muted hover:text-ink-secondary"
      title={tooltip}
      aria-label={tooltip}
    >
      <HelpCircle size={11} />
    </span>
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
  const [error, setError] = useState<string | null>(null)

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
    try {
      const payload = await invokeEdge<{
        success?: boolean
        data?: SuggestedJob[]
      }>('ai-job-search', {
        searchParams: {
          resultCount,
          remoteOnly,
          creativityLevel,
          focusKeywords: focusKeywords.trim(),
        },
      })
      setResults(payload.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setRunning(false)
    }
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

        {/* Search form */}
        <section className="mx-7 mb-5 rounded-[12px] border border-line bg-elevated p-5">
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
                <InfoIcon tooltip={CREATIVITY_TOOLTIP} />
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
            <div className="mt-3 rounded-[6px] border border-priority-high/30 bg-priority-high/5 px-3 py-2 text-[12px] text-priority-high">
              {error}
            </div>
          )}
        </section>

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
            <div className="mb-2 flex items-baseline gap-3 py-2">
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
                Results
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                {results.length} match{results.length === 1 ? '' : 'es'}, ranked
                by match score
                <InfoIcon tooltip={MATCH_SCORE_TOOLTIP} />
              </span>
            </div>
            {results.map((r, idx) => (
              <div
                key={`${r.company}-${r.title}-${idx}`}
                className="mb-2 rounded-[10px] border border-line bg-elevated p-4"
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
                        Careers <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
