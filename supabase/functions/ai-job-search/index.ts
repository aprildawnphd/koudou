// AI Job Search — real-web-search foundation (Session 6.2 rebuild)
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
// Hybrid flow (replaces the prior pure-hallucination implementation):
//   1. Reads the user's profile from `profiles`
//   2. Calls Anthropic Sonnet 4.6 with TWO tools enabled:
//      - `web_search` (server tool) — Claude executes real web searches
//      - `generate_jobs` (client tool) — Claude returns structured ranked results
//   3. Claude searches up to 4 times (different queries from the profile),
//      scores real postings against the profile, supplements with clearly-
//      labeled "AI Suggestions" only if real results are insufficient.
//   4. We extract the `generate_jobs` tool_use input as the structured response.
//
// Hard rules (enforced via system prompt):
//   - Real web results keep their EXACT URLs from search results
//   - AI Suggestions use careers-page URLs only — never fabricate posting URLs
//   - job_source is "web" for real postings, "ai-suggestion" for fallbacks
//
// Prerequisite: web search must be enabled in the Anthropic Console (Settings
// → Privacy). Without it the API rejects the tool.
//
// Pricing: $10 per 1,000 web searches + standard token costs. At 5/day rate
// limit × ~4 searches/call × ~30 demo users = ~600 searches/month max ≈ $6/mo.
//
// Rate limit: 10 calls per day per user (owner exempted).
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const CREATIVITY_MAP: Record<string, string> = {
  conservative:
    "Stick very closely to the candidate's exact target roles and industries. Only include roles that are a near-perfect match.",
  balanced:
    'Include a mix of close matches and some stretch opportunities that leverage transferable skills.',
  exploratory:
    "Cast a wide net. Include adjacent roles, unexpected industries, and creative lateral moves that could leverage the candidate's experience in novel ways.",
}

const RECENCY_INSTRUCTION_MAP: Record<string, string> = {
  '3days': 'Prefer jobs posted within the last 3 days.',
  '1week': 'Prefer jobs posted within the last week.',
  '2weeks': 'Prefer jobs posted within the last 2 weeks.',
  '1month': 'Prefer jobs posted within the last month.',
  any: '',
}

// Structured output schema. job_source is now a real enum so the UI can
// distinguish real web results from AI-fabricated fallbacks.
const generateJobsTool = {
  name: 'generate_jobs',
  description:
    'Return the final ranked list of matching job opportunities for the candidate. Use this tool ONCE at the end of your turn after completing all web searches.',
  input_schema: {
    type: 'object',
    properties: {
      jobs: {
        type: 'array',
        description:
          'Ranked list of jobs. Real web results first (job_source="web"), then AI suggestions only if needed (job_source="ai-suggestion").',
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
              description:
                'Salary range if known from the posting, e.g. "$200K-$260K". Empty string if not specified.',
            },
            match_score: {
              type: 'number',
              description: 'How well this matches the profile, 0-100',
            },
            match_reason: {
              type: 'string',
              description:
                "Why this is a good match in 1-2 sentences. Specific to the candidate's profile.",
            },
            url: {
              type: 'string',
              description:
                'For job_source="web": the EXACT URL from the search result (keep verbatim, never modify). For job_source="ai-suggestion": the company\'s main careers page URL (e.g. company.com/careers) — never fabricate a specific job posting URL.',
            },
            posted_ago: {
              type: 'string',
              description:
                "Posting recency from the search result if available (e.g. 'page_age: April 2025'). Empty string if not available.",
            },
            hiring_contact: {
              type: 'string',
              description:
                'Hiring manager or recruiter name if mentioned in the posting; otherwise empty string.',
            },
            job_source: {
              type: 'string',
              enum: ['web', 'ai-suggestion'],
              description:
                '"web" if extracted from a real web search result with a real URL. "ai-suggestion" if generated to supplement insufficient web results.',
            },
            skills: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Top 10 key skills/technologies for this role (extracted from the posting if real, inferred from role+industry if AI-suggestion).',
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
          : (profile.locations?.join(', ') ?? 'Not specified')
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

    const recencyInstruction = RECENCY_INSTRUCTION_MAP[recencyFilter] || ''
    const creativityInstruction =
      CREATIVITY_MAP[creativityLevel] || CREATIVITY_MAP.balanced

    const dismissedContext = dismissed.length
      ? `\n\nEXCLUDE these previously dismissed jobs (do NOT include them):\n${dismissed
          .map((d) => `- ${d.title} at ${d.company}`)
          .join('\n')}`
      : ''

    const systemPrompt = `You are a job search assistant. Find real, currently-open job postings that match the candidate's profile, then return the structured ranked list via the generate_jobs tool.

PROCESS:
1. Plan 3-4 search queries based on the candidate's target roles, locations, and any focus keywords. Vary the queries to cover different roles or location combinations — don't repeat the same query.
2. Use the web_search tool to execute the queries. Prefer queries that target job boards (LinkedIn, Greenhouse, Lever, Wellfound, Hacker News Who's Hiring, company careers pages, etc.).
3. After your last search, review all results. Score each REAL posting against the candidate's profile.
4. If you have FEWER than ${resultCount} real postings that score above ${minMatchScore}, supplement with clearly-labeled AI Suggestions to reach the target count. Do NOT generate AI Suggestions if you already have enough real postings.
5. Return the final ranked list (real first, AI suggestions last) via the generate_jobs tool.

HARD RULES — VIOLATING THESE PRODUCES UNUSABLE OUTPUT:
- For job_source="web": URL must be the EXACT url from the search result. Do not modify, shorten, or fabricate any part of it.
- For job_source="ai-suggestion": URL must be the company's careers page (e.g., "stripe.com/careers"). Never fabricate a specific job-posting URL.
- Match scores must reflect honest fit assessment against the profile. Do not inflate.
- ${remoteOnly ? 'ONLY include REMOTE positions.' : ''}
- ${recencyInstruction}
- ${creativityInstruction}
${focusKeywords ? `- Focus areas: ${focusKeywords}. Prioritize roles emphasizing these.` : ''}

Return UP TO ${resultCount} jobs total. Quality over quantity — better to return 4 strong real matches than 10 weak ones.${dismissedContext}`

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      maxRetries: 4,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 4,
        },
        generateJobsTool,
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Find current open positions matching this candidate:\n\n${profileContext}`,
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
      ],
    })

    // Extract the generate_jobs tool call. The model may have used web_search
    // multiple times before this — those are server-executed and don't need
    // handling here. We just want the final structured output.
    const toolUseBlock = message.content.find(
      (b) => b.type === 'tool_use' && b.name === 'generate_jobs',
    )
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      console.error(
        'generate_jobs tool was not called. Stop reason:',
        message.stop_reason,
        'Content blocks:',
        message.content.map((b) => b.type),
      )
      return new Response(
        JSON.stringify({
          error:
            'AI did not return structured results. The web search may have failed or returned no usable results — try again with different search parameters.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    const result = toolUseBlock.input as { jobs?: unknown[] }
    const jobs = Array.isArray(result.jobs) ? result.jobs : []

    // Sort by match_score descending; defensive against malformed responses.
    jobs.sort(
      (a: unknown, b: unknown) =>
        ((b as { match_score?: number }).match_score ?? 0) -
        ((a as { match_score?: number }).match_score ?? 0),
    )

    const webCount = jobs.filter(
      (j) => (j as { job_source?: string }).job_source === 'web',
    ).length
    const aiSuggestionCount = jobs.length - webCount

    const usage = message.usage as typeof message.usage & {
      server_tool_use?: { web_search_requests?: number }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: jobs,
        meta: {
          webResults: webCount,
          aiSuggestions: aiSuggestionCount,
          totalResults: jobs.length,
        },
        usage: {
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
          cache_creation_input_tokens:
            message.usage.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens:
            message.usage.cache_read_input_tokens ?? 0,
          web_search_requests: usage.server_tool_use?.web_search_requests ?? 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('ai-job-search error:', e)
    if (e instanceof Anthropic.APIError && (e.status === 529 || e.status === 503)) {
      return new Response(
        JSON.stringify({
          error:
            'Anthropic is temporarily overloaded. Try again in a minute — your daily quota was not used.',
          retryable: true,
        }),
        {
          status: 503,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': '30',
          },
        },
      )
    }
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
