import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useSession } from '@/hooks/useSession'
import { TagInput } from '@/components/ui/TagInput'
import { Button } from '@/components/ui/Button'
import { ProfileCompletenessCard } from '@/components/ProfileCompleteness'
import { cn } from '@/lib/utils'
import type { Tables, TablesUpdate } from '@/integrations/supabase/types'

type ProfileRow = Tables<'profiles'>
type ProfileUpdate = TablesUpdate<'profiles'>

const REMOTE_OPTIONS: { value: NonNullable<ProfileRow['remote_preference']>; label: string }[] = [
  { value: 'remote', label: 'Remote only' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'flexible', label: 'Flexible' },
]

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
          {label}
        </span>
        {hint && <span className="text-[11px] text-ink-muted">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20'

export function Profile() {
  const { session } = useSession()
  const userId = session?.user.id
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw error
      return data as ProfileRow | null
    },
  })

  const [form, setForm] = useState<ProfileUpdate>({})
  const [saved, setSaved] = useState(false)

  // Hydrate form from server when data lands.
  useEffect(() => {
    if (!data) return
    setForm({
      name: data.name ?? '',
      target_roles: data.target_roles ?? [],
      summary: data.summary ?? '',
      resume_text: data.resume_text ?? '',
      locations: data.locations ?? [],
      remote_preference: data.remote_preference,
      min_base_salary: data.min_base_salary,
      must_haves: data.must_haves ?? [],
      nice_to_haves: data.nice_to_haves ?? [],
      industries: data.industries ?? [],
      skills: data.skills ?? [],
    })
  }, [data])

  const save = useMutation({
    mutationFn: async (patch: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in')
      const { error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setTimeout(() => setSaved(false), 2500)
    },
  })

  function set<K extends keyof ProfileUpdate>(key: K, val: ProfileUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink">
            Profile
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Your search profile. AI features (cover letters, job search) read
            this — fill it in for better results.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-warmth-referral">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}
          <Button
            variant="primary"
            disabled={save.isPending}
            onClick={() => save.mutate(form)}
          >
            <Save size={12} /> {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-12">
        {isLoading && (
          <div className="px-7 py-8 text-[13px] text-ink-muted">
            Loading profile…
          </div>
        )}
        {save.error && (
          <div className="m-7 rounded-[8px] border border-priority-high/30 bg-priority-high/5 px-4 py-3 text-[13px] text-priority-high">
            {(save.error as Error).message}
          </div>
        )}

        <div className="mx-7 grid max-w-[800px] grid-cols-1 gap-5">
          <ProfileCompletenessCard profile={data} />
          <section className="rounded-[12px] border border-line bg-elevated p-5">
            <h2 className="mb-1 text-[15px] font-semibold text-ink">Basics</h2>
            <p className="mb-4 text-[12px] text-ink-secondary">
              Identity and headline information.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  className={inputClass}
                  placeholder="April Dawn"
                />
              </Field>
              <Field label="Professional Summary" hint="One paragraph">
                <textarea
                  value={form.summary ?? ''}
                  onChange={(e) => set('summary', e.target.value)}
                  rows={3}
                  className={cn(inputClass, 'resize-y leading-[1.5]')}
                  placeholder="Senior product leader focused on B2B SaaS, with 12 years across…"
                />
              </Field>
              <Field
                label="Resume"
                hint="Paste plain text — used by AI cover letters and job search"
              >
                <textarea
                  value={form.resume_text ?? ''}
                  onChange={(e) => set('resume_text', e.target.value)}
                  rows={12}
                  className={cn(inputClass, 'resize-y font-mono text-[12px] leading-[1.55]')}
                  placeholder="Paste your full resume text here. Plain text only — no formatting needed."
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[12px] border border-line bg-elevated p-5">
            <h2 className="mb-1 text-[15px] font-semibold text-ink">
              What you're looking for
            </h2>
            <p className="mb-4 text-[12px] text-ink-secondary">
              Drives AI Job Search matches and cover letter framing.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field
                label="Target Roles"
                hint="Press Enter or comma to add"
              >
                <TagInput
                  value={form.target_roles ?? []}
                  onChange={(v) => set('target_roles', v)}
                  placeholder="VP Product, Head of Product, Director of PM…"
                />
              </Field>
              <Field label="Industries">
                <TagInput
                  value={form.industries ?? []}
                  onChange={(v) => set('industries', v)}
                  placeholder="B2B SaaS, Healthtech, Fintech…"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Locations">
                  <TagInput
                    value={form.locations ?? []}
                    onChange={(v) => set('locations', v)}
                    placeholder="SF, NYC, Boston, Any Location…"
                  />
                </Field>
                <Field label="Remote Preference">
                  <select
                    value={form.remote_preference ?? ''}
                    onChange={(e) =>
                      set(
                        'remote_preference',
                        (e.target.value || null) as ProfileRow['remote_preference'],
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {REMOTE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Minimum Base Salary (USD)" hint="Annual">
                <input
                  type="number"
                  value={form.min_base_salary ?? ''}
                  onChange={(e) =>
                    set(
                      'min_base_salary',
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className={inputClass}
                  placeholder="220000"
                  min={0}
                  step={5000}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-[12px] border border-line bg-elevated p-5">
            <h2 className="mb-1 text-[15px] font-semibold text-ink">
              Must-haves and skills
            </h2>
            <p className="mb-4 text-[12px] text-ink-secondary">
              Hard requirements + nice-to-haves shape AI search results.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Must Haves">
                <TagInput
                  value={form.must_haves ?? []}
                  onChange={(v) => set('must_haves', v)}
                  placeholder="Equity, Strong eng partnership, Direct reports…"
                />
              </Field>
              <Field label="Nice to Haves">
                <TagInput
                  value={form.nice_to_haves ?? []}
                  onChange={(v) => set('nice_to_haves', v)}
                  placeholder="Async culture, 4-day week, Mission-driven…"
                />
              </Field>
              <Field label="Key Skills">
                <TagInput
                  value={form.skills ?? []}
                  onChange={(v) => set('skills', v)}
                  placeholder="Strategy, Roadmapping, Pricing, A/B testing…"
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
