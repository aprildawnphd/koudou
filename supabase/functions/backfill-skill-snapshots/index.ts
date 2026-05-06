// Backfill skill snapshots — Session 6.3
// ─────────────────────────────────────────────────────────────────────────
// POST request body: {} (no input)
//
// Scans the user's pipeline jobs that don't yet have a snapshot in
// job_skills_snapshots AND have a non-empty description, calls Anthropic
// Haiku 4.5 to extract skills for each (parallelism 3), and bulk-inserts
// the snapshots.
//
// Returns:
//   { jobsScanned, jobsWithoutDescription, snapshotsCreated, errors }
//
// Rate limit: 2 calls per hour per user (backfill is expensive — should be
// run once initially, then occasionally as new jobs accumulate).
//
// Owner exempt as usual via OWNER_USER_IDS.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const CONCURRENCY = 3

const SYSTEM_PROMPT = `You are a skills extraction specialist. Extract the key professional skills, technologies, frameworks, and competencies from job descriptions.

Rules:
- Normalize names to canonical forms (e.g., "ML" → "Machine Learning", "PM" → "Product Management", "k8s" → "Kubernetes").
- Return ranked by prominence/importance in the description.
- Limit to top 20.
- Include: specific tools, platforms, methodologies, technical skills, domain expertise.
- Exclude generic soft-skill words unless specifically called out as core requirements.

Return via the extract_skills tool only.`

const extractSkillsTool = {
  name: 'extract_skills',
  description: 'Return the ranked list of skills extracted from a job description.',
  input_schema: {
    type: 'object' as const,
    properties: {
      skills: {
        type: 'array',
        items: { type: 'string' },
        description: 'Top 20 skills, ranked by prominence, normalized.',
      },
    },
    required: ['skills'],
  },
}

type Job = {
  id: string
  description: string | null
}

async function extractSkillsFromDescription(
  anthropic: Anthropic,
  description: string,
): Promise<string[]> {
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
  if (!toolBlock || toolBlock.type !== 'tool_use') return []

  const result = toolBlock.input as { skills?: unknown }
  return Array.isArray(result.skills)
    ? result.skills.filter((s): s is string => typeof s === 'string').slice(0, 20)
    : []
}

// Simple parallel pool with bounded concurrency.
async function processInPool<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) return
      results[i] = await worker(items[i])
    }
  })
  await Promise.all(workers)
  return results
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
      functionName: 'backfill-skill-snapshots',
      maxCalls: 2,
      windowMinutes: 60,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    }

    // Find the user's jobs that don't have a snapshot yet.
    // PostgREST: use rpc or the not.in() filter against a subquery via two-step fetch.
    const [jobsRes, snapsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&select=id,description`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/job_skills_snapshots?user_id=eq.${userId}&select=job_id`,
        { headers },
      ),
    ])

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
    if (!snapsRes.ok) {
      const errText = await snapsRes.text()
      return new Response(
        JSON.stringify({
          error: `Snapshots lookup failed (${snapsRes.status}): ${errText.slice(0, 200)}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const allJobs: Job[] = await jobsRes.json()
    const existingSnaps: { job_id: string | null }[] = await snapsRes.json()
    const coveredJobIds = new Set(
      existingSnaps.map((s) => s.job_id).filter((id): id is string => !!id),
    )

    const jobsScanned = allJobs.length
    const jobsToProcess = allJobs.filter(
      (j) =>
        !coveredJobIds.has(j.id) &&
        typeof j.description === 'string' &&
        j.description.trim().length >= 20,
    )
    const jobsWithoutDescription = allJobs.filter(
      (j) =>
        !coveredJobIds.has(j.id) &&
        (typeof j.description !== 'string' || j.description.trim().length < 20),
    ).length

    if (jobsToProcess.length === 0) {
      return new Response(
        JSON.stringify({
          jobsScanned,
          jobsWithoutDescription,
          snapshotsCreated: 0,
          errors: 0,
          message:
            jobsScanned === 0
              ? 'No jobs in pipeline.'
              : coveredJobIds.size > 0
                ? 'All jobs with descriptions already have snapshots.'
                : 'No jobs have descriptions long enough to extract skills from.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
      maxRetries: 4,
    })

    type Outcome = { jobId: string; skills: string[] | null; error?: string }
    const outcomes = await processInPool<Job, Outcome>(
      jobsToProcess,
      async (job) => {
        try {
          const skills = await extractSkillsFromDescription(
            anthropic,
            job.description!,
          )
          return { jobId: job.id, skills }
        } catch (e) {
          console.error(`extract failed for job ${job.id}:`, e)
          return {
            jobId: job.id,
            skills: null,
            error: e instanceof Error ? e.message : 'Unknown error',
          }
        }
      },
      CONCURRENCY,
    )

    const successful = outcomes.filter(
      (o): o is { jobId: string; skills: string[] } => o.skills !== null,
    )
    const errors = outcomes.length - successful.length

    if (successful.length > 0) {
      const insertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/job_skills_snapshots`,
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(
            successful.map((o) => ({
              user_id: userId,
              job_id: o.jobId,
              skills: o.skills,
              source: 'tracked',
            })),
          ),
        },
      )

      if (!insertRes.ok) {
        const errText = await insertRes.text()
        console.error('snapshot bulk insert failed:', insertRes.status, errText)
        return new Response(
          JSON.stringify({
            error: `Snapshot insert failed (${insertRes.status}): ${errText.slice(0, 200)}`,
            jobsScanned,
            jobsWithoutDescription,
            snapshotsCreated: 0,
            errors,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    return new Response(
      JSON.stringify({
        jobsScanned,
        jobsWithoutDescription,
        snapshotsCreated: successful.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    console.error('backfill-skill-snapshots error:', e)
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
