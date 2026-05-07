import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, AlertCircle, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

type Snapshot = Tables<'job_skills_snapshots'>
type Job = Tables<'jobs'>
type Profile = Tables<'profiles'>

const ACTIVE_STATUSES = ['applied', 'screening', 'interview', 'offer']

type SkillRow = { skill: string; count: number; jobIds: string[] }

export function SkillsPipelineView() {
  const queryClient = useQueryClient()

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

  const { data: pipelineJobs = [] } = useQuery({
    queryKey: ['pipeline-active-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, role, company, status')
        .in('status', ACTIVE_STATUSES)
      if (error) throw error
      return (data ?? []) as Pick<Job, 'id' | 'role' | 'company' | 'status'>[]
    },
  })

  const { data: snapshots = [], isLoading: snapsLoading } = useQuery({
    queryKey: ['pipeline-snapshots', pipelineJobs.map((j) => j.id).sort().join(',')],
    enabled: pipelineJobs.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_skills_snapshots')
        .select('id, job_id, skills')
        .in('job_id', pipelineJobs.map((j) => j.id))
      if (error) throw error
      return (data ?? []) as Pick<Snapshot, 'id' | 'job_id' | 'skills'>[]
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

  const { missing, covered, totalPipelineJobs, jobsWithSnapshots } = useMemo(() => {
    const userSkillSet = new Set(
      (profile?.skills ?? []).map((s) => s.toLowerCase().trim()),
    )

    // Tally each skill across pipeline snapshots. Track which jobs each
    // appears in so we can show "5 of 7" framing.
    const tally = new Map<string, { count: number; jobIds: Set<string> }>()
    for (const snap of snapshots) {
      if (!snap.job_id) continue
      for (const raw of snap.skills) {
        const skill = raw.trim()
        if (!skill) continue
        const key = skill.toLowerCase()
        const entry = tally.get(key) ?? { count: 0, jobIds: new Set() }
        entry.count += 1
        entry.jobIds.add(snap.job_id)
        // Preserve the casing of the first occurrence
        if (!tally.has(key)) {
          tally.set(key, entry)
          ;(entry as { displayName?: string }).displayName = skill
        } else {
          tally.set(key, entry)
        }
      }
    }

    const rows: SkillRow[] = []
    for (const [key, entry] of tally) {
      const display =
        (entry as { displayName?: string }).displayName ?? key
      rows.push({
        skill: display,
        count: entry.jobIds.size,
        jobIds: Array.from(entry.jobIds),
      })
    }

    // Sort by frequency desc, then alpha for stable ordering
    rows.sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill))

    const missing: SkillRow[] = []
    const covered: SkillRow[] = []
    for (const row of rows) {
      if (userSkillSet.has(row.skill.toLowerCase())) {
        covered.push(row)
      } else {
        missing.push(row)
      }
    }

    return {
      missing,
      covered,
      totalPipelineJobs: pipelineJobs.length,
      jobsWithSnapshots: new Set(snapshots.map((s) => s.job_id).filter(Boolean))
        .size,
    }
  }, [snapshots, profile, pipelineJobs])

  if (pipelineJobs.length === 0) {
    return (
      <EmptyState
        icon={<Wrench size={20} />}
        title="No active pipeline jobs"
        body="Add jobs (status: applied / screening / interview / offer) to see what skills your pipeline asks for."
      />
    )
  }

  if (snapsLoading) {
    return (
      <div className="rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading snapshots…
      </div>
    )
  }

  if (snapshots.length === 0) {
    return (
      <EmptyState
        icon={<Wrench size={20} />}
        title="No skill snapshots yet"
        body={`You have ${totalPipelineJobs} active pipeline job${totalPipelineJobs === 1 ? '' : 's'} but no skill extractions yet. Run the backfill to extract skills from existing job descriptions.`}
        action={
          <Link
            to="/getting-started"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-strong/90"
          >
            Open Getting Started → Backfill
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <CoverageStrip
        totalPipelineJobs={totalPipelineJobs}
        jobsWithSnapshots={jobsWithSnapshots}
        coveredCount={covered.length}
        missingCount={missing.length}
      />

      <SkillSection
        title="Missing from your profile"
        subtitle="Skills your pipeline asks for that aren't on your list. High-frequency = bigger positioning gap."
        tone="missing"
        rows={missing}
        emptyText="None — every skill your pipeline asks for is already on your profile."
        renderAction={(row) => (
          <button
            type="button"
            onClick={() => addSkill.mutate(row.skill)}
            disabled={addSkill.isPending}
            className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-app-bg px-2 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-60"
          >
            <Plus size={11} /> Add to my skills
          </button>
        )}
        totalJobs={totalPipelineJobs}
      />

      <SkillSection
        title="Covered by your profile"
        subtitle="Skills your pipeline asks for that are on your list. High-frequency = strongest leverage."
        tone="covered"
        rows={covered}
        emptyText="None of the skills extracted from your pipeline are on your profile yet. Use the Add buttons above to update."
        totalJobs={totalPipelineJobs}
      />
    </div>
  )
}

function CoverageStrip({
  totalPipelineJobs,
  jobsWithSnapshots,
  coveredCount,
  missingCount,
}: {
  totalPipelineJobs: number
  jobsWithSnapshots: number
  coveredCount: number
  missingCount: number
}) {
  const totalSkills = coveredCount + missingCount
  const coverage =
    totalSkills === 0 ? 0 : Math.round((coveredCount / totalSkills) * 100)
  return (
    <div className="rounded-[10px] border border-line bg-elevated p-4">
      <div className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
        Pipeline coverage
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat
          value={`${coverage}%`}
          label="Profile coverage"
          hint={`${coveredCount} of ${totalSkills} skills covered`}
        />
        <Stat
          value={missingCount}
          label="Missing skills"
          hint="Asked for in pipeline; not on your profile"
          tone={missingCount > 0 ? 'warning' : 'neutral'}
        />
        <Stat
          value={`${jobsWithSnapshots} / ${totalPipelineJobs}`}
          label="Jobs with snapshots"
          hint={
            jobsWithSnapshots < totalPipelineJobs
              ? 'Some pipeline jobs lack descriptions or extractions'
              : 'All pipeline jobs analyzed'
          }
        />
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  hint,
  tone = 'neutral',
}: {
  value: number | string
  label: string
  hint?: string
  tone?: 'neutral' | 'warning'
}) {
  return (
    <div>
      <div
        className={`font-mono text-[20px] font-bold ${tone === 'warning' ? 'text-priority-high' : 'text-ink'}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
        {label}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-ink-muted">{hint}</div>}
    </div>
  )
}

function SkillSection({
  title,
  subtitle,
  tone,
  rows,
  emptyText,
  renderAction,
  totalJobs,
}: {
  title: string
  subtitle: string
  tone: 'missing' | 'covered'
  rows: SkillRow[]
  emptyText: string
  renderAction?: (row: SkillRow) => React.ReactNode
  totalJobs: number
}) {
  return (
    <div>
      <div className="mb-2.5">
        <h3 className="text-[14px] font-semibold text-ink">
          {title}{' '}
          <span className="font-normal text-ink-muted">({rows.length})</span>
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-secondary">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line bg-elevated px-4 py-5 text-center text-[12.5px] text-ink-muted">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <SkillRowItem
              key={row.skill}
              row={row}
              tone={tone}
              totalJobs={totalJobs}
              action={renderAction?.(row)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SkillRowItem({
  row,
  tone,
  totalJobs,
  action,
}: {
  row: SkillRow
  tone: 'missing' | 'covered'
  totalJobs: number
  action?: React.ReactNode
}) {
  const pct = Math.round((row.count / totalJobs) * 100)
  return (
    <div
      className={`flex items-center gap-3 rounded-[8px] border p-2.5 ${
        tone === 'covered'
          ? 'border-warmth-referral/30 bg-warmth-referral/5'
          : 'border-line bg-elevated'
      }`}
    >
      <div className="flex w-9 shrink-0 justify-center">
        {tone === 'covered' ? (
          <Check size={14} className="text-warmth-referral" />
        ) : (
          <AlertCircle size={14} className="text-ink-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-ink">{row.skill}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex w-24 items-center gap-1.5">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-hover">
            <div
              className={`absolute inset-y-0 left-0 ${
                tone === 'covered' ? 'bg-warmth-referral' : 'bg-ink-muted'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-ink-secondary">
            {row.count}/{totalJobs}
          </span>
        </div>
        {action}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-ink-secondary">
        {icon}
      </div>
      <h3 className="mb-1.5 text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mb-5 max-w-[480px] text-[13px] leading-[1.55] text-ink-secondary">
        {body}
      </p>
      {action}
    </div>
  )
}
