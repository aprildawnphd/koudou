import { supabase } from '@/integrations/supabase/client'

// Wraps supabase.functions.invoke() to:
//   1. Explicitly attach Authorization with the user's JWT (the sb_publishable_*
//      key format does not auto-attach in all supabase-js paths).
//   2. Surface the actual server error string when the gateway returns non-2xx
//      — supabase-js's default `.message` is the opaque "non-2xx status code"
//      string and we lose the body unless we read it from the Response object.

export async function invokeEdge<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) {
    // FunctionsHttpError carries the original Response object on `context`.
    // Read the body once to extract the actual server error.
    const ctx = (error as unknown as { context?: unknown }).context
    if (ctx instanceof Response) {
      try {
        const text = await ctx.text()
        const parsed = (() => {
          try {
            return JSON.parse(text) as { error?: string }
          } catch {
            return null
          }
        })()
        const serverMessage = parsed?.error ?? text
        if (serverMessage) {
          // eslint-disable-next-line no-console
          console.error(`[edge:${name}]`, serverMessage)
          throw new Error(serverMessage)
        }
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message) {
          throw parseErr
        }
      }
    }
    // eslint-disable-next-line no-console
    console.error(`[edge:${name}]`, error)
    throw error
  }

  return data as T
}
