// Per-user, per-function rate limiter. Counts recent rows in api_rate_limits
// and either returns a 429 or inserts a new row + returns OK. Writes use the
// service role to bypass RLS — RLS on api_rate_limits only grants SELECT to
// the authenticated user.

type RateLimitOk = { errorResponse?: never }
type RateLimitErr = { errorResponse: Response }

export async function checkRateLimit({
  userId,
  functionName,
  maxCalls,
  windowMinutes,
  corsHeaders,
}: {
  userId: string
  functionName: string
  maxCalls: number
  windowMinutes: number
  corsHeaders: Record<string, string>
}): Promise<RateLimitOk | RateLimitErr> {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const since = new Date(
    Date.now() - windowMinutes * 60 * 1000,
  ).toISOString()

  // Count recent calls. Use Prefer: count=exact + HEAD so we get the count
  // without pulling rows.
  const countRes = await fetch(
    `${SUPABASE_URL}/rest/v1/api_rate_limits?user_id=eq.${userId}&function_name=eq.${functionName}&called_at=gte.${since}&select=id`,
    {
      method: 'HEAD',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Prefer: 'count=exact',
      },
    },
  )

  const contentRange = countRes.headers.get('content-range') ?? '0/0'
  const total = parseInt(contentRange.split('/')[1] ?? '0', 10)

  if (total >= maxCalls) {
    const window =
      windowMinutes >= 1440
        ? `${Math.round(windowMinutes / 1440)} day${windowMinutes >= 2880 ? 's' : ''}`
        : windowMinutes >= 60
          ? `${Math.round(windowMinutes / 60)} hour${windowMinutes >= 120 ? 's' : ''}`
          : `${windowMinutes} minutes`
    return {
      errorResponse: new Response(
        JSON.stringify({
          error: `Daily limit reached: ${maxCalls} calls per ${window}. The cap keeps this demo's AI costs predictable — try again tomorrow.`,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  // Record this call. Fire-and-forget — a failed insert just means this call
  // won't count toward the next window's quota; not worth blocking the user.
  fetch(`${SUPABASE_URL}/rest/v1/api_rate_limits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, function_name: functionName }),
  }).catch((e) => console.error('rate-limit insert failed:', e))

  return {}
}
