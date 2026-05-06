import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Save, Trash2, Copy, CheckCircle2, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { invokeEdge, EdgeError } from '@/lib/edgeFunctions'
import { Button } from '@/components/ui/Button'
import { CompanyFavicon } from '@/components/CompanyFavicon'
import { Sheet } from '@/components/ui/Sheet'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>
type CoverLetter = Tables<'cover_letters'>

type LetterWithJob = CoverLetter & { job: Job | null }

export function Letters() {
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState<LetterWithJob | null>(null)
  const [editText, setEditText] = useState('')
  const [generating, setGenerating] = useState<string | null>(null) // job_id being generated
  const [error, setError] = useState<{ message: string; retryable: boolean; jobId: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: letters = [] } = useQuery({
    queryKey: ['cover_letters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cover_letters')
        .select('*')
        .order('generated_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CoverLetter[]
    },
  })

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*')
      if (error) throw error
      return (data ?? []) as Job[]
    },
  })

  const jobById = new Map(jobs.map((j) => [j.id, j]))
  const lettersWithJob: LetterWithJob[] = letters.map((l) => ({
    ...l,
    job: l.job_id ? (jobById.get(l.job_id) ?? null) : null,
  }))

  // Jobs that don't yet have a cover letter — eligible for "Generate".
  const jobIdsWithLetter = new Set(letters.map((l) => l.job_id).filter(Boolean))
  const ungeneratedJobs = jobs.filter((j) => !jobIdsWithLetter.has(j.id))

  async function generate(jobId: string) {
    setError(null)
    setGenerating(jobId)
    try {
      const job = jobById.get(jobId)
      if (!job) throw new Error('Job not found')
      const payload = await invokeEdge<{ coverLetter?: string }>(
        'generate-cover-letter',
        {
          jobTitle: job.role,
          company: job.company,
          jobDescription: job.description ?? job.role,
        },
      )
      const content = payload.coverLetter ?? ''
      // Persist immediately
      const { data: inserted, error: insertErr } = await supabase
        .from('cover_letters')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user!.id,
          job_id: jobId,
          content,
        })
        .select('*')
        .single()
      if (insertErr) throw insertErr
      queryClient.invalidateQueries({ queryKey: ['cover_letters'] })
      setPickerOpen(false)
      const letter = inserted as CoverLetter
      setEditing({ ...letter, job })
      setEditText(content)
    } catch (e) {
      const retryable = e instanceof EdgeError && e.retryable
      setError({
        message: e instanceof Error ? e.message : 'Generation failed',
        retryable,
        jobId,
      })
    } finally {
      setGenerating(null)
    }
  }

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return
      const { error } = await supabase
        .from('cover_letters')
        .update({ content: editText })
        .eq('id', editing.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover_letters'] })
    },
  })

  const deleteLetter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cover_letters').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cover_letters'] })
      setEditing(null)
    },
  })

  function copyToClipboard() {
    navigator.clipboard.writeText(editText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink">
            Cover Letters
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            AI-generated cover letters tied to jobs in your pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={() => setPickerOpen(true)}
            disabled={ungeneratedJobs.length === 0}
          >
            <Sparkles size={12} /> Generate new
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        {error && (
          <div
            className={cn(
              'mx-7 mb-3 rounded-[8px] border px-4 py-3 text-[13px]',
              error.retryable
                ? 'border-warmth-referral/30 bg-warmth-referral/10 text-ink'
                : 'border-priority-high/30 bg-priority-high/5 text-priority-high',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">{error.message}</div>
              {error.retryable && error.jobId && (
                <button
                  type="button"
                  onClick={() => {
                    const id = error.jobId!
                    setError(null)
                    generate(id)
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[6px] bg-warmth-referral px-3 py-1.5 text-[12px] font-medium text-white hover:bg-warmth-referral/90"
                >
                  <RefreshCw size={12} /> Retry
                </button>
              )}
            </div>
          </div>
        )}

        {letters.length === 0 && (
          <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-2xl text-brand-strong">
              <Sparkles size={24} />
            </div>
            <div className="mb-1.5 text-[18px] font-semibold text-ink">
              No cover letters yet
            </div>
            <p className="mx-auto mb-4 max-w-[460px] text-[13px] text-ink-secondary">
              Click <strong>Generate new</strong> to draft your first cover
              letter. Make sure your Profile resume is filled in first.
            </p>
          </div>
        )}

        {letters.length > 0 && (
          <div className="mx-7">
            {lettersWithJob.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setEditing(l)
                  setEditText(l.content ?? '')
                }}
                className="mb-2 flex w-full cursor-pointer items-start gap-3 rounded-[10px] border border-line bg-elevated p-4 text-left hover:border-line-strong"
              >
                <CompanyFavicon name={l.job?.company ?? null} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-semibold text-ink">
                      {l.job?.role ?? 'Untitled role'}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {l.job?.company ?? '—'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-secondary">
                    {l.content?.slice(0, 220) ?? ''}
                  </p>
                  <div className="mt-2 font-mono text-[11px] text-ink-muted">
                    Generated{' '}
                    {new Date(l.generated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Picker — pick a job to generate for */}
      <Sheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Pick a job"
        headerLeft="GENERATE"
      >
        <div className="mb-4 text-[13px] text-ink-secondary">
          AI uses your profile resume + the job's description. Make sure both
          exist for a useful result.
        </div>

        {generating && (
          <div className="mb-4 rounded-[10px] border border-line bg-elevated p-4">
            <div className="mb-2 flex items-center gap-2.5">
              <Sparkles
                size={14}
                className="animate-pulse text-brand-strong"
              />
              <span className="text-[13px] font-semibold text-ink">
                Generating cover letter…
              </span>
            </div>
            <p className="text-[12px] text-ink-secondary">
              This typically takes 5–15 seconds. Claude is tailoring the letter
              to the job description using your resume.
            </p>
          </div>
        )}

        {ungeneratedJobs.length === 0 && (
          <div className="text-[13px] text-ink-muted">
            Every job in your pipeline already has a cover letter.
          </div>
        )}
        {ungeneratedJobs.map((j) => (
          <button
            key={j.id}
            type="button"
            disabled={generating !== null}
            onClick={() => generate(j.id)}
            className={cn(
              'mb-2 flex w-full items-center gap-3 rounded-[8px] border border-line bg-elevated p-3 text-left hover:border-accent-strong',
              generating !== null && generating !== j.id && 'opacity-40',
              generating === j.id && 'border-accent-strong opacity-80',
            )}
          >
            <CompanyFavicon name={j.company} />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-ink">{j.role}</div>
              <div className="text-[12px] text-ink-muted">{j.company}</div>
            </div>
            <span className="text-[12px] font-medium text-accent-strong">
              {generating === j.id
                ? 'Generating…'
                : generating !== null
                  ? '—'
                  : 'Generate →'}
            </span>
          </button>
        ))}
      </Sheet>

      {/* Editor — view/edit a saved letter */}
      <Sheet
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null)
        }}
        title={editing?.job?.role ?? 'Cover letter'}
        headerLeft={
          editing?.job
            ? `${editing.job.role} · ${editing.job.company}`
            : 'COVER LETTER'
        }
      >
        {editing && (
          <>
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-muted">
              <CheckCircle2 size={11} className="text-warmth-referral" />
              Saved automatically. Edit and click Save to update.
            </div>
            <div className="mb-3 flex items-center gap-2">
              <Button onClick={copyToClipboard}>
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                variant="primary"
                disabled={saveEdit.isPending || editText === editing.content}
                onClick={() => saveEdit.mutate()}
              >
                <Save size={12} />
                {saveEdit.isPending
                  ? 'Saving…'
                  : editText === editing.content
                    ? 'Up to date'
                    : 'Save'}
              </Button>
              <button
                type="button"
                onClick={() => deleteLetter.mutate(editing.id)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] font-medium text-priority-high hover:border-priority-high/40"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={26}
              className="w-full resize-y rounded-[6px] border border-line bg-elevated p-3 font-sans text-[13px] leading-[1.6] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </>
        )}
      </Sheet>
    </>
  )
}
