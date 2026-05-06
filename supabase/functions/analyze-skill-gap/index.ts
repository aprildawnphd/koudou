// Skill Gap analysis
// ─────────────────────────────────────────────────────────────────────────
// POST request body: {} (no input — pulls everything from DB)
//
// Reads profile (skills, target_roles, industries, must_haves, summary) +
// active pipeline jobs (applied/screening/interview), then asks Anthropic
// Claude Sonnet 4.6 via tool-use to identify skill gaps and strengths.
//
// Returns:
//   { gaps: [...], strengths: [...], summary: "...", usage: {...} }
//
// Rate limited: 5 calls per day per user.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are a senior career coach analyzing the skill alignment between a candidate's profile and the roles they're actively pursuing.

Your job: identify the most actionable skill gaps and the strongest leverage points.

Method:
1. Read the candidate's profile (skills, target roles, industries, must-haves, summary).
2. Read the active pipeline (jobs they've applied to, are screening for, or interviewing for).
3. Identify skills that appear important across multiple target roles but aren't in the candidate's profile (gaps).
4. Identify skills the candidate has that strongly align with what's being asked across the pipeline (strengths).

Output via the report_skill_analysis tool only. Do not respond with prose.

Be concrete. Avoid vague generalities like "leadership skills" — name the specific competency, framework, or tool.

For each gap, suggest a concrete next step (specific course, project, or practice the candidate could do in 2-4 weeks).

For each strength, suggest a tactical leverage tip (how to surface it in resume/letters/interviews).

Tone: direct, encouraging, specific. Senior peer giving real advice — not generic career-blog content.`

const SKILL_ANALYSIS_TOOL = {
  name: 'report_skill_analysis',
  description: 'Report the skill gap analysis with actionable gaps and leverage points',
  input_schema: {
    type: 'object' as const,
    properties: {
      summary: {
        type: 'string',
        description: '2-3 sentence overall assessment of how the candidate maps to their pipeline. Specific, not generic.',
      },
      gaps: {
        type: 'array',
        description: '5-8 skills/competencies the candidate lacks but appear important for their target roles, ranked by importance.',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string', description: 'The specific skill or competency name' },
            importance: {
              type: 'string',
              enum: ['critical', 'important', 'nice-to-have'],
              description: 'How important this gap is to close',
            },
            reason: {
              type: 'string',
              description: 'Why this skill matters for the candidate\'s targets — reference specific roles or industries',
            },
            learning_suggestion: {
              type: 'string',
              description: 'A concrete 2-4 week action to acquire or strengthen this skill (course name, project type, practice technique)',
            },
            example_jobs: {
              type: 'array',
              items: { type: 'string' },
              description: 'Up to 3 job titles from the pipeline where this skill appeared relevant',
            },
          },
          required: ['skill', 'importance', 'reason', 'learning_suggestion'],
        },
      },
      strengths: {
        type: 'array',
        description: '3-5 skills the candidate has that strongly align with their pipeline — competitive advantages.',
        items: {
          type: 'object',
          properties: {
            skill: { type: 'string', description: 'The specific skill or competency name' },
            leverage_tip: {
              type: 'string',
              description: 'How to highlight this strength in applications, interviews, or LinkedIn — be tactical',
            },
          },
          required: ['skill', 'leverage_tip'],
        },
      },
    },
    required: ['summary', 'gaps', 'strengths'],
  },
}

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
      functionName: 'analyze-skill-gap',
      maxCalls: 5,
      windowMinutes: 1440,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Fetch profile
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=skills,target_roles,industries,must_haves,summary,resume_text`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    )
    if (!profileRes.ok) {
      const errText = await profileRes.text()
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
    const profile = (Array.isArray(profilesRaw) ? profilesRaw[0] : null) ?? {}
    const skills: string[] = profile.skills ?? []
    const targetRoles: string[] = profile.target_roles ?? []
    const industries: string[] = profile.industries ?? []
    const mustHaves: string[] = profile.must_haves ?? []
    const summary: string = profile.summary ?? ''
    const resumeText: string = profile.resume_text ?? ''

    if (targetRoles.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Add at least one target role to your Profile before running skill gap analysis.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch active pipeline jobs (applied/screening/interview)
    const jobsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&status=in.(applied,screening,interview,offer)&select=role,company,description,location,status`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    )
    if (!jobsRes.ok) {
      const errText = await jobsRes.text()
      return new Response(
        JSON.stringify({
          error: `Jobs lookup failed (${jobsRes.status}): ${errText.slice(0, 200)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
    const jobs: {
      role: string
      company: string
      description: string | null
      location: string | null
      status: string
    }[] = await jobsRes.json()

    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            'Add at least one job to your pipeline (applied or beyond) before running skill gap analysis.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 4 })

    // Two cache breakpoints: system prompt + profile context.
    // Active pipeline varies per call so it's not cached.
    const profileBlock = [
      '**Candidate Profile**',
      `Target roles: ${targetRoles.join(', ')}`,
      industries.length > 0 ? `Industries: ${industries.join(', ')}` : '',
      skills.length > 0 ? `Current skills: ${skills.join(', ')}` : 'Current skills: (none listed)',
      mustHaves.length > 0 ? `Must-haves: ${mustHaves.join(', ')}` : '',
      summary ? `\nSummary: ${summary}` : '',
      resumeText ? `\nResume:\n${resumeText}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const pipelineBlock = [
      '**Active Pipeline**',
      ...jobs.map((j, i) => {
        const lines = [
          `${i + 1}. ${j.role} at ${j.company} (${j.status}${j.location ? `, ${j.location}` : ''})`,
        ]
        if (j.description?.trim()) {
          lines.push(`   Description: ${j.description.slice(0, 800)}`)
        }
        return lines.join('\n')
      }),
    ].join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [SKILL_ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'report_skill_analysis' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: profileBlock,
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'text',
              text: `${pipelineBlock}\n\nAnalyze the alignment. Call report_skill_analysis with the result.`,
            },
          ],
        },
      ],
    })

    const toolBlock = message.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error('No tool_use block in response:', message)
      return new Response(
        JSON.stringify({ error: 'Model did not return structured analysis.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const analysis = toolBlock.input as Record<string, unknown>

    return new Response(
      JSON.stringify({
        ...analysis,
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
    console.error('analyze-skill-gap error:', e)
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
