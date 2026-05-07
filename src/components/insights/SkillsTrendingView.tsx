import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Filter, Plus } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type Snapshot = Tables<'job_skills_snapshots'>
type Profile = Tables<'profiles'>

type WindowKey = '30d' | '90d' | 'all'

const WINDOW_DAYS: Record<WindowKey, number | null> = {
  '30d': 30,
  '90d': 90,
  all: null,
}

const WINDOW_LABEL: Record<WindowKey, string> = {
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

type FilterKey = 'all' | 'mine' | 'gaps'
const FILTER_LABEL: Record<FilterKey, string> = {
  all: 'All skills',
  mine: 'On my profile',
  gaps: 'Not on my profile',
}

const TOP_N = 25
const MS_PER_DAY = 86_400_000

type Row = { skill: string; count: number; mine: boolean }

export function SkillsTrendingView() {
  const queryClient = useQueryClient()
  const [windowKey, setWindowKey] = useState<WindowKey>('90d')
  const [filterKey, setFilterKey] = useState<FilterKey>('all')

  const { data: profile } = useQuery({
    queryKey: ['profile-skills'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, skills')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data as Pick<Profile, 'id' | 'skills'> | null
    },
  })

  const addSkill = useMutation({
    mutationFn: async (skill: string) => {
      if (!profile) throw new Error('Profile not loaded')
      const next = Array.from(new Set([...(profile.skills ?? []), skill]))
      const { error } = await supabase
        .from('profiles')
        .update({ skills: next })
        .eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-skills'] })
      queryClient.invalidateQueries({ queryKey: ['profile-resume-audit'] })
    },
  })

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['all-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_skills_snapshots')
        .select('skills, captured_at')
      if (error) throw error
      return (data ?? []) as Pick<Snapshot, 'skills' | 'captured_at'>[]
    },
  })

  const { rows, totalSnapshots, oldestCapture } = useMemo(() => {
    const userSkillSet = new Set(
      (profile?.skills ?? []).map((s) => s.toLowerCase().trim()),
    )
    const now = Date.now()
    const windowDays = WINDOW_DAYS[windowKey]

    const inWindow = snapshots.filter((s) => {
      if (windowDays === null) return true
      const t = new Date(s.captured_at).getTime()
      if (isNaN(t)) return false
      return now - t <= windowDays * MS_PER_DAY
    })

    const tally = new Map<string, { count: number; display: string }>()
    for (const snap of inWindow) {
      for (const raw of snap.skills) {
        const skill = raw.trim()
        if (!skill) continue
        const key = skill.toLowerCase()
        const entry = tally.get(key) ?? { count: 0, display: skill }
        entry.count += 1
        tally.set(key, entry)
      }
    }

    const allRows: Row[] = []
    for (const [key, entry] of tally) {
      allRows.push({
        skill: entry.display,
        count: entry.count,
        mine: userSkillSet.has(key),
      })
    }

    allRows.sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))

    let filtered = allRows
    if (filterKey === 'mine') filtered = allRows.filter((r) => r.mine)
    if (filterKey === 'gaps') filtered = allRows.filter((r) => !r.mine)

    const oldest = snapshots.reduce<number | null>((min, s) => {
      const t = new Date(s.captured_at).getTime()
      if (isNaN(t)) return min
      return min == null || t < min ? t : min
    }, null)

    return {
      rows: filtered.slice(0, TOP_N),
      totalSnapshots: inWindow.length,
      oldestCapture: oldest,
    }
  }, [snapshots, profile, windowKey, filterKey])

  if (isLoading) {
    return (
      <div className="rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading snapshots…
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <div className="rounded-[12px] border border-line bg-elevated p-12 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-ink-secondary">
          <TrendingUp size={20} />
        </div>
        <h3 className="mb-1.5 text-[16px] font-semibold text-ink">
          No skill snapshots yet
        </h3>
        <p className="mx-auto max-w-[480px] text-[13px] leading-[1.55] text-ink-secondary">
          Trending requires skills extracted from the jobs you've added.
          Visit Getting Started → Backfill to extract from existing jobs, or
          add new ones with descriptions.
        </p>
      </div>
    )
  }

  const maxCount = rows[0]?.count ?? 1
  const ageDays =
    oldestCapture != null
      ? Math.floor((Date.now() - oldestCapture) / MS_PER_DAY)
      : 0
  const showThinDataNote = ageDays < 14

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[6px] border border-line bg-elevated p-0.5">
          {(['30d', '90d', 'all'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setWindowKey(k)}
              className={cn(
                'rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors',
                windowKey === k
                  ? 'bg-accent-strong text-white'
                  : 'text-ink-secondary hover:text-ink',
              )}
            >
              {WINDOW_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-[6px] border border-line bg-elevated p-0.5">
          <Filter size={11} className="ml-2 text-ink-muted" />
          {(['all', 'mine', 'gaps'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKey(k)}
              className={cn(
                'rounded-[4px] px-2.5 py-1 text-[12px] font-medium transition-colors',
                filterKey === k
                  ? 'bg-ink text-white'
                  : 'text-ink-secondary hover:text-ink',
              )}
            >
              {FILTER_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {showThinDataNote && (
        <div className="rounded-[8px] border border-warmth-referral/30 bg-warmth-referral/5 px-3 py-2 text-[12px] text-ink-secondary">
          Your earliest snapshot is {ageDays} day{ageDays === 1 ? '' : 's'}{' '}
          old. Trends become more meaningful after ~30 days of pipeline
          activity. For now, this is a current-state view.
        </div>
      )}

      <div className="rounded-[10px] border border-line bg-elevated p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
          <span>
            Top {Math.min(TOP_N, rows.length)} skill
            {rows.length === 1 ? '' : 's'}
          </span>
          <span>{totalSnapshots} snapshots in window</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-[12.5px] text-ink-muted">
            {filterKey === 'mine'
              ? 'None of your skills appear in any snapshots in this window.'
              : filterKey === 'gaps'
                ? "Every skill in your snapshots is already on your profile. You're well-covered."
                : 'No skills found in this window.'}
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((row) => (
              <TrendRow
                key={row.skill}
                row={row}
                maxCount={maxCount}
                onAdd={() => addSkill.mutate(row.skill)}
                addPending={addSkill.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TrendRow({
  row,
  maxCount,
  onAdd,
  addPending,
}: {
  row: Row
  maxCount: number
  onAdd: () => void
  addPending: boolean
}) {
  const widthPct = Math.max(4, Math.round((row.count / maxCount) * 100))
  return (
    <div className="flex items-center gap-3 px-1.5 py-1.5">
      <div
        className={cn(
          'shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.04em] uppercase',
          row.mine
            ? 'bg-warmth-referral/15 text-warmth-referral'
            : 'bg-hover text-ink-muted',
        )}
        title={row.mine ? 'On your profile' : 'Not on your profile'}
      >
        {row.mine ? 'mine' : 'gap'}
      </div>
      <div className="min-w-[120px] flex-1 truncate text-[13px] text-ink">
        {row.skill}
      </div>
      <div className="flex w-40 items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
          <div
            className={cn(
              'absolute inset-y-0 left-0',
              row.mine ? 'bg-warmth-referral' : 'bg-ink-muted',
            )}
            style={{ width: `${widthPct}%` }}
          />
        </div>
        <span className="w-8 shrink-0 text-right font-mono text-[11px] text-ink-secondary">
          {row.count}
        </span>
      </div>
      <div className="w-[120px] shrink-0">
        {!row.mine && (
          <button
            type="button"
            onClick={onAdd}
            disabled={addPending}
            className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-app-bg px-2 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-60"
          >
            <Plus size={11} /> Add to profile
          </button>
        )}
      </div>
    </div>
  )
}
