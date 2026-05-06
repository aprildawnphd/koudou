import { supabase } from '@/integrations/supabase/client'

// Wraps supabase.functions.invoke() to:
//   1. Explicitly attach Authorization with the user's JWT (the sb_publishable_*
//      key format does not auto-attach in all supabase-js paths).
//   2. Surface the actual server error string when the gateway returns non-2xx
//      — supabase-js's default `.message` is the opaque "non-2xx status code"
//      string and we lose the body unless we read it from the Response object.
//   3. Preserve the `retryable` flag from the server so callers can render
//      a retry-friendly UI for transient upstream errors (e.g. Anthropic 529).

export class EdgeError extends Error {
  retryable: boolean
  status?: number
  constructor(message: string, opts: { retryable?: boolean; status?: number } = {}) {
    super(message)
    this.name = 'EdgeError'
    this.retryable = opts.retryable ?? false
    this.status = opts.status
  }
}

export async function invokeEdge<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new EdgeError('Not signed in')

  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) {
    // FunctionsHttpError carries the original Response object on `context`.
    // Read the body once to extract the actual server error + retry hint.
    const ctx = (error as unknown as { context?: unknown }).context
    if (ctx instanceof Response) {
      const status = ctx.status
      try {
        const text = await ctx.text()
        const parsed = (() => {
          try {
            return JSON.parse(text) as {
              error?: string
              retryable?: boolean
            }
          } catch {
            return null
          }
        })()
        const serverMessage = parsed?.error ?? text
        if (serverMessage) {
          // eslint-disable-next-line no-console
          console.error(`[edge:${name}]`, serverMessage)
          throw new EdgeError(serverMessage, {
            retryable: parsed?.retryable ?? false,
            status,
          })
        }
      } catch (parseErr) {
        if (parseErr instanceof EdgeError) throw parseErr
        if (parseErr instanceof Error && parseErr.message) {
          throw new EdgeError(parseErr.message, { status })
        }
      }
    }
    // eslint-disable-next-line no-console
    console.error(`[edge:${name}]`, error)
    throw new EdgeError(
      error instanceof Error ? error.message : 'Edge function failed',
    )
  }

  return data as T
}
