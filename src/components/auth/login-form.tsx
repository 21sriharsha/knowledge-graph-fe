'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { PASSWORD_RULES, meetsPolicy } from '@/lib/password-policy'

type Mode = 'sign-in' | 'sign-up'

/**
 * Sign in, or create an account.
 *
 * A Client Component because a password has to be typed somewhere. It goes from this form straight
 * to the identity provider — it never reaches this application's server, which is what makes
 * "we cannot leak your password" a structural claim rather than a promise.
 *
 * Social sign-in and email are the same form rather than two screens: which one you used last is
 * exactly the thing people forget, and making both visible costs nothing.
 */
export function LoginForm({ next, providers }: { next: string; providers: Provider[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signingUp = mode === 'sign-up'
  const policyMet = !signingUp || meetsPolicy(password)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    const supabase = createSupabaseBrowserClient()

    try {
      if (signingUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        })
        if (error) throw error
        setNotice('Check your email to confirm the address, then sign in.')
        setMode('sign-in')
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // refresh() so Server Components re-render with the session the middleware can now see.
      router.replace(next)
      router.refresh()
    } catch (cause) {
      // The provider's message is shown as-is: it is the only thing that knows why, and paraphrasing
      // it into "something went wrong" would hide a policy rejection the reader can act on.
      setError(cause instanceof Error ? cause.message : 'Could not sign in.')
    } finally {
      setBusy(false)
    }
  }

  async function signInWith(provider: Provider) {
    setError(null)
    setBusy(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {providers.length > 0 ? (
        <div className="space-y-2">
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              disabled={busy}
              onClick={() => signInWith(provider)}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              Continue with {PROVIDER_LABELS[provider]}
            </button>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            aria-describedby={signingUp ? 'password-rules' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus-visible:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          />
        </div>

        {signingUp ? (
          // Shown before typing, not after failing. A rule you learn by being rejected is a rule
          // the form kept to itself.
          <ul id="password-rules" className="space-y-1 text-xs">
            {PASSWORD_RULES.map((rule) => {
              const met = rule.test(password)
              return (
                <li key={rule.label} className={met ? 'text-muted-foreground' : 'text-foreground'}>
                  <span aria-hidden="true" className="mr-1.5">
                    {met ? '✓' : '•'}
                  </span>
                  {rule.label}
                  <span className="sr-only">{met ? ' — met' : ' — not yet met'}</span>
                </li>
              )
            })}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || !policyMet}
          className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-60"
        >
          {busy ? 'Working…' : signingUp ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {signingUp ? 'Already have an account?' : 'No account yet?'}{' '}
        <button
          type="button"
          onClick={() => {
            setMode(signingUp ? 'sign-in' : 'sign-up')
            setError(null)
            setNotice(null)
          }}
          className="underline underline-offset-4 hover:text-foreground"
        >
          {signingUp ? 'Sign in' : 'Create one'}
        </button>
      </p>
    </div>
  )
}

/** Providers this deployment offers. Each must also be enabled in the Supabase dashboard. */
export type Provider = 'google' | 'azure' | 'discord' | 'github'

const PROVIDER_LABELS: Record<Provider, string> = {
  google: 'Google',
  azure: 'Microsoft',
  discord: 'Discord',
  github: 'GitHub',
}
