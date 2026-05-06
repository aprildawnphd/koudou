import { useState, type FormEvent } from 'react'
import { Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

const INVITE_CODE = import.meta.env.VITE_DEMO_INVITE_CODE as string | undefined

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
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [linkPending, setLinkPending] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setGooglePending(false)
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (INVITE_CODE && code.trim() !== INVITE_CODE) {
      setError('Invalid invite code. Ask April for the current one.')
      return
    }

    setLinkPending(true)
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      })
      if (authError) throw authError
      setLinkSent(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not send magic link',
      )
    } finally {
      setLinkPending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg py-8">
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
          Sign in
        </h1>
        <p className="mb-5 text-[13px] text-ink-secondary">
          Enter your email{INVITE_CODE ? ' + the invite code April shared with you' : ''} —
          we'll send a one-click magic link.
        </p>

        {linkSent ? (
          <div className="rounded-[8px] border border-warmth-referral/30 bg-warmth-referral/10 p-4 text-[13px]">
            <div className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
              <CheckCircle2 size={14} className="text-warmth-referral" />
              Magic link sent
            </div>
            <p className="text-ink-secondary">
              Check <strong>{email}</strong> for a sign-in link from
              Supabase Auth. Click it and you'll be signed in here.
            </p>
            <button
              type="button"
              onClick={() => {
                setLinkSent(false)
                setCode('')
              }}
              className="mt-3 text-[12px] font-medium text-accent-strong hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3.5">
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

            {INVITE_CODE && (
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
                  Invite code
                </span>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-[6px] border border-line bg-elevated px-3 py-2 text-[14px] text-ink outline-none focus:border-accent-strong focus:ring-2 focus:ring-accent-strong/20"
                />
              </label>
            )}

            {error && (
              <div className="rounded-[6px] border border-priority-high/30 bg-priority-high/5 px-3 py-2 text-[12px] text-priority-high">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={linkPending || googlePending}
              className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-accent-strong px-3 py-2 text-[14px] font-medium text-white transition-colors hover:bg-accent-strong/90 disabled:opacity-60"
            >
              <Mail size={14} />
              {linkPending ? 'Sending link…' : 'Email me a magic link'}
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-[10px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
          <span className="h-px flex-1 bg-line" />
          Or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googlePending || linkPending}
          className="flex w-full items-center justify-center gap-2.5 rounded-[6px] border border-line bg-elevated px-3 py-2 text-[14px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-hover disabled:opacity-60"
        >
          <GoogleIcon />
          {googlePending ? 'Redirecting…' : 'Continue with Google'}
        </button>
        <p className="mt-2 text-[11px] text-ink-muted">
          Google sign-in works only for accounts on April's allowlist
          (legacy demo users + her own).
        </p>
      </div>

      <div className="w-full max-w-[400px] rounded-[12px] border border-[#fcd34d] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] p-5 text-[12.5px] leading-[1.55] text-[#78350f]">
        <div className="mb-1.5 text-[13px] font-semibold text-[#451a03]">
          About this demo
        </div>
        <p className="mb-2">
          Koudou is a job-search CRM I (April Dawn) am building publicly.
          This deployment is a private demo — the invite code keeps it
          off random search results while it stays in personal-tool scope.
        </p>
        <p className="mb-2">
          Don't have a code? Email{' '}
          <a
            href="mailto:april.dawn1019@gmail.com?subject=Koudou%20demo%20access"
            className="font-medium text-[#451a03] underline decoration-[#92400e]/40 underline-offset-2 hover:decoration-[#92400e]"
          >
            april.dawn1019@gmail.com
          </a>{' '}
          and I'll share the current one.
        </p>
        <p>
          Source on{' '}
          <a
            href="https://github.com/aprildawnphd/koudou"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#451a03] underline decoration-[#92400e]/40 underline-offset-2 hover:decoration-[#92400e]"
          >
            GitHub
          </a>{' '}
          (PolyForm Noncommercial).
        </p>
      </div>
    </div>
  )
}
