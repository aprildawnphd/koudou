// AI Job Search — Phase A (AI-suggestions only)
// ─────────────────────────────────────────────────────────────────────────
// POST request body:
//   {
//     dismissed?: { title, company }[],
//     searchParams?: {
//       resultCount?: number, minMatchScore?: number,
//       remoteOnly?: boolean, recencyFilter?: "3days"|"1week"|"2weeks"|"1month"|"any",
//       creativityLevel?: "conservative"|"balanced"|"exploratory",
//       focusKeywords?: string,
//     }
//   }
//
// Reads the user's profile from `profiles` (resume, summary, target_roles,
// locations, remote_preference, salary, must_haves/nice_to_haves, industries,
// skills) and asks Claude Sonnet 4.6 to generate ranked job suggestions
// using tool use for structured output.
//
// Phase B (Firecrawl real-web search of job boards before AI scoring) is
// deferred to a later session. See PROJECT.md "Maybe pull from Lovable".
//
// Rate limited: 5 calls per hour per user.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CREATIVITY_MAP: Record<string, string> = {
  conservative:
    "Stick very closely to the candidate's exact target roles and industries. Only suggest roles that are a near-perfect match.",
  balanced:
    'Suggest a mix of close matches and some stretch opportunities that leverage transferable skills.',
  exploratory:
    "Cast a wide net. Include adjacent roles, unexpected industries, and creative lateral moves that could leverage the candidate's experience in novel ways.",
}

const RECENCY_MAP: Record<string, string> = {
  '3days': 'posted within the last 3 days',
  '1week': 'posted within the last week',
  '2weeks': 'posted within the last 2 weeks',
  '1month': 'posted within the last month',
  any: '',
}

const generateJobsTool = {
  name: 'generate_jobs',
  description: 'Return a list of matching job opportunities for the candidate.',
  input_schema: {
    type: 'object',
    properties: {
      jobs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            company: { type: 'string', description: 'Company name' },
            title: { type: 'string', description: 'Job title' },
            location: {
              type: 'string',
              description: 'Location (city, state, or Remote)',
            },
            type: {
              type: 'string',
              enum: ['remote', 'hybrid', 'onsite'],
              description: 'Work arrangement',
            },
            salary: {
              type: 'string',
              description: 'Salary range, e.g. $200K-$260K',
            },
            match_score: {
              type: 'number',
              description: 'How well this matches the profile, 0-100',
            },
            match_reason: {
              type: 'string',
              description: 'Why this is a good match in 1-2 sentences',
            },
            url: {
              type: 'string',
              description:
                "Company careers page URL (e.g. company.com/careers) — never fabricate a specific job posting URL",
            },
            posted_ago: {
              type: 'string',
              description:
                "Approximate posting recency, e.g. '2 days ago', '1 week ago'",
            },
            hiring_contact: {
              type: 'string',
              description:
                'Hiring manager or recruiter name and title if available, otherwise empty',
            },
            job_source: {
              type: 'string',
              description: 'Always "AI Suggestion" for Phase A',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Top 10 key skills and technologies for this role',
            },
          },
          required: [
            'company',
            'title',
            'location',
            'type',
            'salary',
            'match_score',
            'match_reason',
            'url',
            'job_source',
            'skills',
          ],
        },
      },
    },
    required: ['jobs'],
  },
} as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            'Configure ANTHROPIC_API_KEY in Supabase project secrets to enable AI features.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const auth = await requireUser(req, corsHeaders)
    if (auth.errorResponse) return auth.errorResponse
    const userId = auth.user.id

    const rl = await checkRateLimit({
      userId,
      functionName: 'ai-job-search',
      maxCalls: 10,
      windowMinutes: 1440,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const body = await req.json().catch(() => ({}))
    const dismissed: { title: string; company: string }[] = body.dismissed ?? []
    const searchParams = body.searchParams ?? {}
    const resultCount = Math.min(searchParams.resultCount ?? 10, 20)
    const minMatchScore = searchParams.minMatchScore ?? 0
    const remoteOnly = !!searchParams.remoteOnly
    const recencyFilter = searchParams.recencyFilter ?? 'any'
    const creativityLevel = searchParams.creativityLevel ?? 'balanced'
    const focusKeywords: string = searchParams.focusKeywords ?? ''

    // Pull the user's profile from `profiles`.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=target_roles,locations,remote_preference,min_base_salary,must_haves,nice_to_haves,industries,skills,summary,resume_text`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    )
    if (!profileRes.ok) {
      const errText = await profileRes.text()
      console.error('profile fetch failed:', profileRes.status, errText)
      return new Response(
        JSON.stringify({
          error: `Profile lookup failed (${profileRes.status}): ${errText.slice(0, 200)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    const profilesRaw = await profileRes.json()
    if (!Array.isArray(profilesRaw)) {
      console.error('profile response not an array:', profilesRaw)
      return new Response(
        JSON.stringify({
          error: `Profile lookup returned unexpected shape: ${JSON.stringify(profilesRaw).slice(0, 200)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    console.log(
      `profile lookup for ${userId}: found ${profilesRaw.length} rows`,
    )
    const profile = profilesRaw[0]
    if (!profile) {
      return new Response(
        JSON.stringify({
          error:
            'No profile found. Fill out your Profile before running an AI job search.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    if (!profile.target_roles?.length) {
      return new Response(
        JSON.stringify({
          error:
            'Add at least one target role to your Profile before running an AI job search.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const anyLocation = profile.locations?.includes('Any Location')
    const profileContext = [
      `TARGET ROLES: ${profile.target_roles?.join(', ') ?? 'Not specified'}`,
      `LOCATIONS: ${
        anyLocation
          ? 'Any Location (no preference)'
          : profile.locations?.join(', ') ?? 'Not specified'
      }`,
      `REMOTE PREFERENCE: ${profile.remote_preference ?? 'Not specified'}`,
      profile.min_base_salary
        ? `MIN BASE SALARY: $${profile.min_base_salary.toLocaleString()}`
        : '',
      profile.must_haves?.length
        ? `MUST HAVES: ${profile.must_haves.join('; ')}`
        : '',
      profile.nice_to_haves?.length
        ? `NICE TO HAVES: ${profile.nice_to_haves.join('; ')}`
        : '',
      profile.industries?.length
        ? `INDUSTRIES: ${profile.industries.join(', ')}`
        : '',
      profile.skills?.length
        ? `KEY SKILLS: ${profile.skills.join(', ')}`
        : '',
      profile.summary ? `PROFESSIONAL SUMMARY: ${profile.summary}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const recencyInstruction = RECENCY_MAP[recencyFilter] || ''
    const creativityInstruction =
      CREATIVITY_MAP[creativityLevel] || CREATIVITY_MAP.balanced

    const dismissedContext = dismissed.length
      ? `\n\nEXCLUDE these previously dismissed jobs (do NOT include them):\n${dismissed
          .map((d) => `- ${d.title} at ${d.company}`)
          .join('\n')}`
      : ''

    const paramInstructions = [
      `Generate up to ${resultCount} matching companies and roles to research. For each, set job_source to "AI Suggestion" and use the company's main careers page URL only — never fabricate a specific job posting URL.`,
      minMatchScore > 0
        ? `Only include jobs with a match_score of ${minMatchScore} or higher.`
        : '',
      remoteOnly ? 'Only include REMOTE positions.' : '',
      recencyInstruction
        ? `Prefer jobs that would have been ${recencyInstruction}.`
        : '',
      creativityInstruction,
      focusKeywords
        ? `Focus areas: ${focusKeywords}. Prioritize roles emphasizing these.`
        : '',
    ]
      .filter(Boolean)
      .join('\n')

    const systemPrompt = `You are a job search assistant. Given a candidate's profile, generate ranked AI-suggested job opportunities.

${paramInstructions}

IMPORTANT RULES:
- Use real company names that actually hire for these roles.
- Set job_source to "AI Suggestion".
- Use the company's main careers page URL only — never fabricate a specific job posting URL.
- match_score values must honestly reflect how well the job fits the candidate.
- You MUST call the generate_jobs tool with the results.`

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [generateJobsTool],
      tool_choice: { type: 'tool', name: 'generate_jobs' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Find matching job opportunities for this candidate:\n\n${profileContext}`,
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'text',
              text: dismissedContext || 'No dismissed jobs.',
            },
          ],
        },
      ],
    })

    const toolUseBlock = message.content.find((b) => b.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new Error('AI did not return structured data')
    }
    const result = toolUseBlock.input as { jobs?: unknown[] }
    const jobs = Array.isArray(result.jobs) ? result.jobs : []

    // Sort by match_score descending; defensive against malformed responses.
    jobs.sort(
      (a: unknown, b: unknown) =>
        ((b as { match_score?: number }).match_score ?? 0) -
        ((a as { match_score?: number }).match_score ?? 0),
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: jobs,
        meta: {
          aiSuggestions: jobs.length,
          phase: 'A',
        },
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cache_creation_input_tokens:
            message.usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens:
            message.usage.cache_read_input_tokens ?? 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('ai-job-search error:', e)
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
