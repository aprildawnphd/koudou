// Weekly Plan generation
// ─────────────────────────────────────────────────────────────────────────
// POST request body: {} (no input — pulls everything from DB)
//
// Computes the user's current funnel scoreboard (applications, outreach,
// interviews this week vs. prior 3 weeks), then asks Anthropic Claude
// Sonnet 4.6 via tool-use to generate 3-5 concrete action items for the
// upcoming week, tied to specific entities (jobs, contacts, interviews).
//
// Persists to weekly_plans (upsert on user_id + week_start) so the user
// can see plan history.
//
// Returns:
//   { week_start, scoreboard, plan, usage }
//
// Rate limited: 5 calls per day per user.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are a senior career coach building a weekly action plan for a candidate's job search.

Your job: based on the candidate's profile and current pipeline state, recommend 3-5 specific actions for the upcoming week.

Method:
1. Read the scoreboard (this week vs. prior 3 weeks across applications, outreach, interviews).
2. Read the entities (active jobs, contacts to follow up on, upcoming interviews).
3. Identify the 3-5 highest-leverage actions for the coming week.
4. Each action must reference a specific entity by its ID where possible (job, contact, or interview).

Output via the report_weekly_plan tool only. Do not respond with prose.

Action quality rules:
- BE SPECIFIC. "Follow up with Linnea Quintero re: GitLab VP Product onsite" is good. "Network more" is bad.
- TIE TO ENTITY IDs when possible. Each action's entity_ref should match a real id from the input.
- BALANCE the categories — a good week has both reactive work (interview prep, follow-ups) and proactive work (new applications, outreach to dormant contacts).
- DON'T pad. If 3 strong actions cover the week, return 3. Don't add filler to reach 5.
- TRENDS MATTER. If outreach is down 50% week-over-week, surface that. If application velocity is healthy, recommend doubling down on quality not quantity.

Tone: direct, encouraging, specific. Senior peer giving real advice.`

const WEEKLY_PLAN_TOOL = {
  name: 'report_weekly_plan',
  description: 'Report the recommended action plan for the upcoming week',
  input_schema: {
    type: 'object' as const,
    properties: {
      headline: {
        type: 'string',
        description: 'A 1-sentence summary of the week ahead (e.g. "Interview-heavy week — protect prep time and slow new outreach.")',
      },
      actions: {
        type: 'array',
        description: '3-5 specific, prioritized actions for the upcoming week',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Concise action title (5-10 words, imperative form)',
            },
            rationale: {
              type: 'string',
              description: 'Why this action matters this week — 1-2 sentences referencing entity context or scoreboard trends',
            },
            category: {
              type: 'string',
              enum: [
                'application',
                'outreach',
                'interview-prep',
                'follow-up',
                'pipeline-hygiene',
                'profile',
              ],
              description: 'Which type of work this is',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'How urgent or impactful',
            },
            entity_ref: {
              type: 'object',
              description: 'Reference to a specific entity, if applicable',
              properties: {
                type: {
                  type: 'string',
                  enum: ['job', 'contact', 'interview'],
                },
                id: { type: 'string', description: 'The entity\'s UUID from the input' },
                label: {
                  type: 'string',
                  description: 'Short human-readable label (e.g. "GitLab VP Product" or "Linnea Quintero")',
                },
              },
              required: ['type', 'id', 'label'],
            },
          },
          required: ['title', 'rationale', 'category', 'priority'],
        },
      },
    },
    required: ['headline', 'actions'],
  },
}

// ISO-week-style Monday start
function startOfWeekMonday(d: Date): Date {
  const day = d.getUTCDay() // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff),
  )
  return start
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() + n)
  return out
}

function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
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
      functionName: 'generate-weekly-plan',
      maxCalls: 5,
      windowMinutes: 1440,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const headers = {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    }

    // Compute week boundaries
    const weekStart = startOfWeekMonday(new Date())
    const weekEnd = addDays(weekStart, 7)
    const week1Start = addDays(weekStart, -7)
    const week2Start = addDays(weekStart, -14)
    const week3Start = addDays(weekStart, -21)
    const fourWeeksAgo = addDays(weekStart, -28)
    const fourWeeksAgoIso = fourWeeksAgo.toISOString()

    // Parallel data fetch
    const [profileRes, jobsRes, contactsRes, interviewsRes, activitiesRes] =
      await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=name,target_roles,summary,industries`,
          { headers },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${userId}&select=id,role,company,status,sub_status,priority,match_score,applied_date,warm,location,updated_at&order=applied_date.desc.nullslast`,
          { headers },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/contacts?user_id=eq.${userId}&select=id,name,role,warmth,network_role,last_touch,follow_up,notes,target_company_id`,
          { headers },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/interviews?user_id=eq.${userId}&scheduled_at=gte.${fourWeeksAgoIso}&select=id,job_id,scheduled_at,type,panelists,prep_notes&order=scheduled_at.asc`,
          { headers },
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/activities?user_id=eq.${userId}&occurred_at=gte.${fourWeeksAgoIso}&select=id,job_id,contact_id,type,occurred_at,text&order=occurred_at.desc`,
          { headers },
        ),
      ])

    for (const [name, res] of [
      ['profile', profileRes],
      ['jobs', jobsRes],
      ['contacts', contactsRes],
      ['interviews', interviewsRes],
      ['activities', activitiesRes],
    ] as const) {
      if (!res.ok) {
        const errText = await res.text()
        console.error(`${name} fetch failed:`, res.status, errText)
        return new Response(
          JSON.stringify({
            error: `${name} lookup failed (${res.status}): ${errText.slice(0, 200)}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }

    type Profile = {
      name: string | null
      target_roles: string[]
      summary: string | null
      industries: string[]
    }
    type Job = {
      id: string
      role: string
      company: string
      status: string
      sub_status: string | null
      priority: string
      match_score: number | null
      applied_date: string | null
      warm: boolean
      location: string | null
      updated_at: string
    }
    type Contact = {
      id: string
      name: string
      role: string | null
      warmth: string
      network_role: string | null
      last_touch: string | null
      follow_up: string | null
      notes: string | null
      target_company_id: string | null
    }
    type Interview = {
      id: string
      job_id: string
      scheduled_at: string
      type: string | null
      panelists: string[]
      prep_notes: string | null
    }
    type Activity = {
      id: string
      job_id: string | null
      contact_id: string | null
      type: string
      occurred_at: string
      text: string | null
    }

    const profilesRaw: Profile[] = await profileRes.json()
    const profile = profilesRaw[0] ?? {
      name: null,
      target_roles: [],
      summary: null,
      industries: [],
    }
    const jobs: Job[] = await jobsRes.json()
    const contacts: Contact[] = await contactsRes.json()
    const interviews: Interview[] = await interviewsRes.json()
    const activities: Activity[] = await activitiesRes.json()

    // ── Compute scoreboard ──
    const countApplications = (s: Date, e: Date) =>
      jobs.filter((j) => inRange(j.applied_date, s, e)).length
    const countOutreach = (s: Date, e: Date) =>
      activities.filter(
        (a) => a.type === 'message' && inRange(a.occurred_at, s, e),
      ).length
    const countInterviews = (s: Date, e: Date) =>
      interviews.filter((iv) => inRange(iv.scheduled_at, s, e)).length

    const scoreboard = {
      week_start: weekStart.toISOString().slice(0, 10),
      applications: {
        this_week: countApplications(weekStart, weekEnd),
        last_week: countApplications(week1Start, weekStart),
        two_weeks_ago: countApplications(week2Start, week1Start),
        three_weeks_ago: countApplications(week3Start, week2Start),
      },
      outreach: {
        this_week: countOutreach(weekStart, weekEnd),
        last_week: countOutreach(week1Start, weekStart),
        two_weeks_ago: countOutreach(week2Start, week1Start),
        three_weeks_ago: countOutreach(week3Start, week2Start),
      },
      interviews: {
        this_week: countInterviews(weekStart, weekEnd),
        last_week: countInterviews(week1Start, weekStart),
        two_weeks_ago: countInterviews(week2Start, week1Start),
        three_weeks_ago: countInterviews(week3Start, week2Start),
      },
      pipeline_status: {
        applied: jobs.filter((j) => j.status === 'applied').length,
        screening: jobs.filter((j) => j.status === 'screening').length,
        interview: jobs.filter((j) => j.status === 'interview').length,
        offer: jobs.filter((j) => j.status === 'offer').length,
      },
      contact_warmth: {
        champion: contacts.filter((c) => c.warmth === 'champion').length,
        warm: contacts.filter((c) => c.warmth === 'warm').length,
        cold: contacts.filter((c) => c.warmth === 'cold').length,
      },
    }

    // ── Build entity context for the model ──
    const upcomingInterviews = interviews
      .filter((iv) => new Date(iv.scheduled_at) >= weekStart)
      .slice(0, 5)
    const activeJobs = jobs
      .filter((j) =>
        ['applied', 'screening', 'interview', 'offer'].includes(j.status),
      )
      .slice(0, 12)
    const dueContacts = contacts
      .filter((c) => c.follow_up && new Date(c.follow_up) <= weekEnd)
      .slice(0, 8)
    const championsAndWarm = contacts
      .filter((c) => c.warmth === 'champion' || c.warmth === 'warm')
      .slice(0, 8)

    // Use profile name as available
    const _name = profile.name ?? 'the candidate'

    const profileBlock = [
      '**Candidate Profile**',
      profile.name ? `Name: ${profile.name}` : '',
      `Target roles: ${profile.target_roles.join(', ') || '(none set)'}`,
      profile.industries.length > 0
        ? `Industries: ${profile.industries.join(', ')}`
        : '',
      profile.summary ? `Summary: ${profile.summary}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const scoreboardBlock = [
      '**Scoreboard (week starting ' + scoreboard.week_start + ')**',
      'Applications submitted: this week ' +
        scoreboard.applications.this_week +
        ' / last ' +
        scoreboard.applications.last_week +
        ' / 2w ' +
        scoreboard.applications.two_weeks_ago +
        ' / 3w ' +
        scoreboard.applications.three_weeks_ago,
      'Outreach (messages): this week ' +
        scoreboard.outreach.this_week +
        ' / last ' +
        scoreboard.outreach.last_week +
        ' / 2w ' +
        scoreboard.outreach.two_weeks_ago +
        ' / 3w ' +
        scoreboard.outreach.three_weeks_ago,
      'Interviews held/scheduled: this week ' +
        scoreboard.interviews.this_week +
        ' / last ' +
        scoreboard.interviews.last_week +
        ' / 2w ' +
        scoreboard.interviews.two_weeks_ago +
        ' / 3w ' +
        scoreboard.interviews.three_weeks_ago,
      'Pipeline: ' +
        Object.entries(scoreboard.pipeline_status)
          .map(([k, v]) => `${k}=${v}`)
          .join(', '),
      'Contacts: ' +
        Object.entries(scoreboard.contact_warmth)
          .map(([k, v]) => `${k}=${v}`)
          .join(', '),
    ].join('\n')

    const upcomingInterviewsBlock = [
      '**Upcoming Interviews**',
      ...(upcomingInterviews.length === 0
        ? ['(none in the next 4 weeks)']
        : upcomingInterviews.map((iv) => {
            const job = jobs.find((j) => j.id === iv.job_id)
            return [
              `id=${iv.id}`,
              `  ${iv.scheduled_at.slice(0, 16).replace('T', ' ')} — ${iv.type ?? 'interview'}`,
              job ? `  for: ${job.role} at ${job.company} (job_id=${job.id})` : '',
              iv.panelists.length > 0
                ? `  panelists: ${iv.panelists.join(', ')}`
                : '',
              iv.prep_notes ? `  prep_notes: ${iv.prep_notes}` : '',
            ]
              .filter(Boolean)
              .join('\n')
          })),
    ].join('\n')

    const activeJobsBlock = [
      '**Active Jobs**',
      ...activeJobs.map((j) => {
        return `id=${j.id} | ${j.role} at ${j.company} | status=${j.status}${j.sub_status ? '/' + j.sub_status : ''} | priority=${j.priority} | match=${j.match_score ?? 'n/a'}${j.warm ? ' | warm' : ''}`
      }),
    ].join('\n')

    const contactsBlock = [
      '**Contacts due for follow-up (follow_up date passed or this week)**',
      ...(dueContacts.length === 0
        ? ['(none)']
        : dueContacts.map(
            (c) =>
              `id=${c.id} | ${c.name}${c.role ? ' (' + c.role + ')' : ''} | warmth=${c.warmth}${c.last_touch ? ' | last_touch=' + c.last_touch.slice(0, 10) : ''}${c.follow_up ? ' | follow_up=' + c.follow_up.slice(0, 10) : ''}`,
          )),
      '',
      '**Champions & Warm contacts (top 8)**',
      ...championsAndWarm.map(
        (c) =>
          `id=${c.id} | ${c.name}${c.role ? ' (' + c.role + ')' : ''} | warmth=${c.warmth}${c.last_touch ? ' | last_touch=' + c.last_touch.slice(0, 10) : ''}`,
      ),
    ].join('\n')

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 4 })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3072,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [WEEKLY_PLAN_TOOL],
      tool_choice: { type: 'tool', name: 'report_weekly_plan' },
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
              text: [
                scoreboardBlock,
                '',
                upcomingInterviewsBlock,
                '',
                activeJobsBlock,
                '',
                contactsBlock,
                '',
                'Generate the weekly plan via the report_weekly_plan tool. Use entity_ref with the real ids from above where applicable.',
              ].join('\n'),
            },
          ],
        },
      ],
    })

    const toolBlock = message.content.find((b) => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      console.error('No tool_use block in response:', message)
      return new Response(
        JSON.stringify({ error: 'Model did not return structured plan.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const planPayload = toolBlock.input as Record<string, unknown>

    // Persist to weekly_plans (upsert on user_id + week_start)
    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/weekly_plans?on_conflict=user_id,week_start`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          user_id: userId,
          week_start: scoreboard.week_start,
          scoreboard,
          plan: planPayload,
          generated_at: new Date().toISOString(),
        }),
      },
    )
    if (!upsertRes.ok) {
      const errText = await upsertRes.text()
      console.error('weekly_plan upsert failed:', upsertRes.status, errText)
      // Don't fail the request — return the plan anyway
    }

    return new Response(
      JSON.stringify({
        week_start: scoreboard.week_start,
        scoreboard,
        plan: planPayload,
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
    console.error('generate-weekly-plan error:', e)
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
