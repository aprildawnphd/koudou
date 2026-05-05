import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type Mode = 'signin' | 'signup'

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

export function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)

  async function handleGoogleSignIn() {
    setError(null)
    setGooglePending(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (authError) throw authError
      // On success the browser is redirected to Google, so we don't reach here.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGooglePending(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const { error: authError } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin },
            })
      if (authError) throw authError
      navigate('/today')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid h-screen place-items-center bg-app-bg">
      <div className="w-full max-w-[400px] rounded-[12px] border border-line bg-elevated p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/brand/koudou-mark-dark.png"
            alt="Koudou"
            className="h-10 w-10 rounded-[8px]"
          />
          <div>
            <div className="text-[20px] font-bold tracking-[-0.01em] text-ink">
              Koudou
            </div>
            <div className="text-[12px] text-ink-muted">Job Search CRM</div>
          </div>
        </div>

        <h1 className="mb-1.5 text-[22px] font-bold tracking-[-0.01em] text-ink">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mb-5 text-[13px] text-ink-secondary">
          {mode === 'signin'
            ? 'Sign in to pick up your search.'
            : 'A focused CRM for the job search you actually want.'}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googlePending || pending}
          className="flex w-full items-center justify-center gap-2.5 rounded-[6px] border border-line bg-elevated px-3 py-2 text-[14px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-hover disabled:opacity-60"
        >
          <GoogleIcon />
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="my-4 flex items-center gap-3 text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
          <span className="h-px flex-1 bg-line" />
          Or
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[14px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[14px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
            />
          </label>

          {error && (
            <div className="rounded-[6px] border border-priority-high/30 bg-priority-high/5 px-3 py-2 text-[12px] text-priority-high">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending || googlePending}
            className="w-full rounded-[6px] bg-accent-strong px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-accent-strong/90 disabled:opacity-60"
          >
            {pending
              ? 'Working…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-center text-[12px] text-ink-secondary">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => setMode('signup')}
                className="font-medium text-accent-strong hover:underline"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('signin')}
                className="font-medium text-accent-strong hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
