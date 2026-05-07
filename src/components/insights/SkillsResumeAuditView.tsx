import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, FileText, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import type { Tables } from '@/integrations/supabase/types'

type Profile = Tables<'profiles'>

type Row = { skill: string; substantiated: boolean }

// v1: case-insensitive substring match against resume_text. A skill is
// considered "substantiated" if its name appears anywhere in the resume
// text. Imperfect (false positives on short skill names like "C" or "R"),
// but a reasonable starting point. AI-assisted version is logged in
// UX_BACKLOG.md for future revisit.

const SHORT_SKILL_THRESHOLD = 3 // skills <3 chars get a flag because false-positive risk is high

export function SkillsResumeAuditView() {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile-resume-audit'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, skills, resume_text')
        .eq('id', user.id)
        .maybeSingle()
      if (error) throw error
      return data as Pick<Profile, 'id' | 'skills' | 'resume_text'> | null
    },
  })

  const removeSkill = useMutation({
    mutationFn: async (skill: string) => {
      if (!profile) throw new Error('Profile not loaded')
      const next = (profile.skills ?? []).filter(
        (s) => s.toLowerCase().trim() !== skill.toLowerCase().trim(),
      )
      const { error } = await supabase
        .from('profiles')
        .update({ skills: next })
        .eq('id', profile.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-resume-audit'] })
      queryClient.invalidateQueries({ queryKey: ['profile-skills'] })
    },
  })

  const { rows, hasResume, hasSkills, shortSkills } = useMemo(() => {
    const skills = profile?.skills ?? []
    const resume = (profile?.resume_text ?? '').toLowerCase()
    const allRows: Row[] = skills.map((skill) => ({
      skill,
      substantiated:
        resume.length > 0 &&
        resume.includes(skill.toLowerCase().trim()),
    }))
    return {
      rows: allRows,
      hasResume: (profile?.resume_text ?? '').trim().length > 0,
      hasSkills: skills.length > 0,
      shortSkills: skills.filter((s) => s.trim().length < SHORT_SKILL_THRESHOLD),
    }
  }, [profile])

  if (isLoading) {
    return (
      <div className="rounded-[12px] border border-line bg-elevated p-12 text-center text-[13px] text-ink-secondary">
        Loading profile…
      </div>
    )
  }

  if (!hasSkills) {
    return (
      <EmptyState
        title="No skills on your profile"
        body="Add skills to your profile to enable the resume audit."
        action={
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-strong/90"
          >
            Open Profile
          </Link>
        }
      />
    )
  }

  if (!hasResume) {
    return (
      <EmptyState
        title="No resume text on file"
        body="Paste your resume into your Profile to enable the resume audit."
        action={
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-strong/90"
          >
            Open Profile
          </Link>
        }
      />
    )
  }

  const substantiated = rows.filter((r) => r.substantiated)
  const unsubstantiated = rows.filter((r) => !r.substantiated)

  return (
    <div className="space-y-5">
      <div className="rounded-[10px] border border-line bg-elevated p-4">
        <div className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
          Resume substantiation
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Stat
            value={substantiated.length}
            label="Substantiated"
            hint="Skill name appears in your resume text"
            tone="positive"
          />
          <Stat
            value={unsubstantiated.length}
            label="Not in resume"
            hint="On your profile but not found in your resume text"
            tone={unsubstantiated.length > 0 ? 'warning' : 'neutral'}
          />
          <Stat
            value={rows.length}
            label="Total skills"
            hint={`${Math.round((substantiated.length / rows.length) * 100)}% substantiated`}
          />
        </div>
        <div className="mt-3 rounded-[6px] border border-dashed border-line bg-app-bg p-2.5 text-[11.5px] leading-[1.55] text-ink-muted">
          <strong className="text-ink-secondary">v1 caveat:</strong>{' '}
          Substantiation = case-insensitive substring match. False positives
          on short skill names are possible (e.g., "R" matching any word
          containing R). Treat this as a starting point for review, not a
          verdict.
        </div>
      </div>

      {shortSkills.length > 0 && (
        <div className="rounded-[8px] border border-warmth-referral/30 bg-warmth-referral/5 px-3 py-2 text-[12px] text-ink-secondary">
          Heads up: you have {shortSkills.length} short skill name
          {shortSkills.length === 1 ? '' : 's'} ({shortSkills.join(', ')}).
          The substring match is unreliable on these — please verify
          manually.
        </div>
      )}

      <SkillSection
        title="Not in your resume"
        subtitle="On your profile but the skill name doesn't appear in your resume text. Either add evidence to your resume, or remove from your skill list if it's no longer accurate."
        tone="missing"
        rows={unsubstantiated}
        emptyText="Every skill on your profile appears somewhere in your resume."
        renderAction={(row) => (
          <button
            type="button"
            onClick={() => removeSkill.mutate(row.skill)}
            disabled={removeSkill.isPending}
            className="inline-flex items-center gap-1 rounded-[5px] border border-line bg-app-bg px-2 py-1 text-[11px] font-medium text-ink-secondary transition-colors hover:border-priority-high hover:text-priority-high disabled:opacity-60"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
      />

      <SkillSection
        title="Substantiated"
        subtitle="Skill name appears in your resume text — these are safe to claim."
        tone="covered"
        rows={substantiated}
        emptyText="None of your profile skills appear in your resume text."
      />
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
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  const colorClass =
    tone === 'positive'
      ? 'text-warmth-referral'
      : tone === 'warning'
        ? 'text-priority-high'
        : 'text-ink'
  return (
    <div>
      <div className={`font-mono text-[20px] font-bold ${colorClass}`}>
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
}: {
  title: string
  subtitle: string
  tone: 'missing' | 'covered'
  rows: Row[]
  emptyText: string
  renderAction?: (row: Row) => React.ReactNode
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
            <div
              key={row.skill}
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
                  <X size={14} className="text-ink-muted" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
                {row.skill}
              </div>
              {renderAction && (
                <div className="shrink-0">{renderAction(row)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[12px] border border-line bg-elevated p-12 text-center">
      <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-ink-secondary">
        <FileText size={20} />
      </div>
      <h3 className="mb-1.5 text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mb-5 max-w-[480px] text-[13px] leading-[1.55] text-ink-secondary">
        {body}
      </p>
      {action}
    </div>
  )
}
