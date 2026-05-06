// Cover Letter generation
// ─────────────────────────────────────────────────────────────────────────
// POST request body:
//   { jobTitle, company, jobDescription, jobId? }
//
// Reads the user's resume + skills + summary from profiles, sends an
// Anthropic Claude Sonnet 4.6 request with prompt caching on the system
// prompt + resume context, returns the generated letter (does not persist —
// the client decides whether/how to save).
//
// Rate limited: 20 calls per hour per user.
// ─────────────────────────────────────────────────────────────────────────

import Anthropic from 'npm:@anthropic-ai/sdk@0.65.0'
import { corsHeaders } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'
import { checkRateLimit } from '../_shared/rate-limit.ts'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const SYSTEM_PROMPT = `You are an expert career coach and professional cover letter writer.
Write compelling, personalized cover letters that:
- Align the candidate's experience with the specific job requirements
- Use a professional but warm tone
- Highlight relevant skills and achievements
- Are concise (3-4 paragraphs)
- Include a strong opening that shows knowledge of the company
- End with a confident call to action
- Do NOT include placeholder brackets like [Your Name] - write it as a complete letter
- Do NOT include the date or address header - just the letter body`

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
      functionName: 'generate-cover-letter',
      maxCalls: 5,
      windowMinutes: 1440,
      corsHeaders,
    })
    if (rl.errorResponse) return rl.errorResponse

    const { jobTitle, company, jobDescription } = await req.json()
    if (!jobDescription || !jobTitle || !company) {
      return new Response(
        JSON.stringify({
          error: 'jobTitle, company, and jobDescription are required.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fetch the user's resume + skills + summary from profiles.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=resume_text,skills,summary`,
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: SUPABASE_SERVICE_ROLE_KEY,
        },
      },
    )
    if (!profileRes.ok) {
      const errText = await profileRes.text()
      console.error(
        'profile fetch failed:',
        profileRes.status,
        errText,
      )
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
    const profile = profilesRaw[0] ?? {}
    const resumeText: string = profile.resume_text ?? ''
    const skills: string[] = profile.skills ?? []
    const summary: string = profile.summary ?? ''

    if (!resumeText.trim()) {
      return new Response(
        JSON.stringify({
          error:
            'Add your resume to your Profile before generating cover letters.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY, maxRetries: 4 })

    // Two cache breakpoints:
    //  1. system prompt (small but stable across all users + all calls)
    //  2. resume context (stable across all this user's letters in a session)
    // Job description varies per call → not cached.
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                "**Candidate's Resume/Experience:**",
                resumeText,
                skills.length > 0
                  ? `\n**Key Skills:** ${skills.join(', ')}`
                  : '',
                summary ? `\n**Professional Summary:** ${summary}` : '',
              ]
                .filter(Boolean)
                .join('\n'),
              cache_control: { type: 'ephemeral' },
            },
            {
              type: 'text',
              text: [
                'Write a cover letter for this position:',
                '',
                `**Position:** ${jobTitle} at ${company}`,
                '',
                '**Job Description:**',
                jobDescription,
                '',
                'Write a tailored cover letter that connects my experience to this specific role.',
              ].join('\n'),
            },
          ],
        },
      ],
    })

    const textBlock = message.content.find((b) => b.type === 'text')
    const coverLetter =
      textBlock && 'text' in textBlock ? textBlock.text : ''

    return new Response(
      JSON.stringify({
        coverLetter,
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
    console.error('generate-cover-letter error:', e)
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
