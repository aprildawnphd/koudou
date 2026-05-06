// Skill extraction — Session 6.3
// ─────────────────────────────────────────────────────────────────────────
// POST request body: { description: string }
//
// Calls Claude Haiku 4.5 with tool-use to extract the top ~20 normalized
// skills from a job description. Used by:
//   - backfill-skill-snapshots (server-to-server, for existing pipeline jobs)
//   - Client paths when jobs are added (manual or saved from AI search;
//     wired in subsequent sessions)
//
// Model choice: Haiku 4.5 — this is a simple, high-volume extraction task.
// Sonnet would be ~3× the cost for negligible quality difference.
//
// Rate limit: 60 calls per hour per user (UI-driven autonomous calls during
// backfill; needs higher cap than the 5/day human-trigger features).
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are a skills extraction specialist. Extract the key professional skills, technologies, frameworks, and competencies from job descriptions.

Rules:
- Normalize names to canonical forms (e.g., "ML" → "Machine Learning", "PM" → "Product Management", "k8s" → "Kubernetes").
- Return ranked by prominence/importance in the description (most-emphasized first).
- Limit to top 20.
- INCLUDE: specific tools, platforms, methodologies, technical skills, domain expertise (e.g., "B2B SaaS", "Pricing Strategy", "OKR design").
- EXCLUDE generic soft-skill words like "teamwork", "communication", "collaboration" UNLESS the description specifically calls them out as core requirements with detail.
- EXCLUDE company-specific jargon you don't recognize.

Return via the extract_skills tool only. Do not respond with prose.`

const extractSkillsTool = {
  name: 'extract_skills',
  description:
    'Return the ranked list of skills extracted from a job description.',
  input_schema: {
    type: 'object' as const,
    properties: {
      skills: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Top 20 skills/technologies/competencies from the description, ranked by prominence, normalized to canonical forms.',
      },
    },
    required: ['skills'],
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
      functionName: 'extract-job-skills',
      maxCalls: 60,
      windowMinutes: 60,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const body = await req.json().catch(() => ({}))
    const description: string = body.description ?? ''

    if (!description || description.trim().length < 20) {
      return new Response(JSON.stringify({ skills: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      maxRetries: 4,
    })

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [extractSkillsTool],
      tool_choice: { type: 'tool', name: 'extract_skills' },
      messages: [
        {
          role: 'user',
          content: `Extract skills from this job description:\n\n${description.slice(0, 4000)}`,
        },
      ],
    })

    const toolBlock = message.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return new Response(JSON.stringify({ skills: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = toolBlock.input as { skills?: unknown }
    const skills = Array.isArray(result.skills)
      ? result.skills.filter((s): s is string => typeof s === 'string').slice(0, 20)
      : []

    return new Response(
      JSON.stringify({
        skills,
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
    console.error('extract-job-skills error:', e)
    if (e instanceof Anthropic.APIError && (e.status === 529 || e.status === 503)) {
      return new Response(
        JSON.stringify({
          error:
            'Anthropic is temporarily overloaded. Try again in a minute.',
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
