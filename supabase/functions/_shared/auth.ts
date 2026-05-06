// Shared auth helper. Verifies the JWT in the Authorization header against
// Supabase Auth and returns the user. Edge functions call this before
// trusting any user identity — never read user_id from the request body.

type AuthOk = { user: { id: string; email?: string }; errorResponse?: never }
type AuthErr = { user?: never; errorResponse: Response }

export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<AuthOk | AuthErr> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  const token = authHeader.slice('Bearer '.length)
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  })

  if (!res.ok) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      ),
    }
  }

  const user = await res.json()
  return { user }
}
