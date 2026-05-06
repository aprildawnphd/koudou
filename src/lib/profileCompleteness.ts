// Profile completeness — drives the indicator on /profile and the
// nudge banner on /search. Weights reflect AI feature impact:
// target_roles + resume_text are required (20% each), industry/skills/
// summary/must_haves are high-impact (10% each), the rest are tiebreakers.

import type { Tables } from '@/integrations/supabase/types'

type Profile = Tables<'profiles'>

export type CompletenessField = {
  key: keyof Profile
  label: string
  weight: number
  hint: string
  has: (p: Profile) => boolean
}

const FIELDS: CompletenessField[] = [
  {
    key: 'target_roles',
    label: 'Target roles',
    weight: 20,
    hint: 'Required for AI Job Search.',
    has: (p) => (p.target_roles ?? []).length > 0,
  },
  {
    key: 'resume_text',
    label: 'Resume',
    weight: 20,
    hint: 'Required for cover letters; biggest single boost to match quality.',
    has: (p) => !!p.resume_text?.trim(),
  },
  {
    key: 'summary',
    label: 'Professional summary',
    weight: 10,
    hint: 'Helps the AI understand your positioning at a glance.',
    has: (p) => !!p.summary?.trim(),
  },
  {
    key: 'skills',
    label: 'Key skills',
    weight: 10,
    hint: 'Sharpens skill-fit matching across the suggestion list.',
    has: (p) => (p.skills ?? []).length > 0,
  },
  {
    key: 'industries',
    label: 'Industries',
    weight: 10,
    hint: 'Filters out wrong-vertical companies before scoring.',
    has: (p) => (p.industries ?? []).length > 0,
  },
  {
    key: 'must_haves',
    label: 'Must-haves',
    weight: 10,
    hint: 'Hard requirements (equity, remote, direct reports, etc.).',
    has: (p) => (p.must_haves ?? []).length > 0,
  },
  {
    key: 'locations',
    label: 'Locations',
    weight: 5,
    hint: 'Geographic preferences (or "Any Location").',
    has: (p) => (p.locations ?? []).length > 0,
  },
  {
    key: 'min_base_salary',
    label: 'Salary floor',
    weight: 5,
    hint: 'Filters out underpaid roles.',
    has: (p) => p.min_base_salary != null,
  },
  {
    key: 'remote_preference',
    label: 'Remote preference',
    weight: 5,
    hint: 'Disambiguates remote-only vs hybrid vs onsite.',
    has: (p) => !!p.remote_preference,
  },
  {
    key: 'nice_to_haves',
    label: 'Nice-to-haves',
    weight: 5,
    hint: 'Soft preferences used as tiebreakers.',
    has: (p) => (p.nice_to_haves ?? []).length > 0,
  },
]

export function profileCompleteness(profile: Profile | null | undefined): {
  score: number
  present: CompletenessField[]
  missing: CompletenessField[]
} {
  if (!profile) {
    return { score: 0, present: [], missing: FIELDS }
  }
  let score = 0
  const present: CompletenessField[] = []
  const missing: CompletenessField[] = []
  for (const f of FIELDS) {
    if (f.has(profile)) {
      score += f.weight
      present.push(f)
    } else {
      missing.push(f)
    }
  }
  return { score, present, missing }
}
