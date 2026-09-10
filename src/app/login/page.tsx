import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LoginForm, type Provider } from '@/components/auth/login-form'
import { currentUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Sign in' }

/**
 * Sign in.
 *
 * Only the studio needs an account. Reading, searching and exploring the graph are anonymous and
 * stay that way — this page exists for the handful of people who operate the platform, not for its
 * readers, and nothing on the public side should ever redirect here.
 */
export default async function LoginPage(props: PageProps<'/login'>) {
  const params = await props.searchParams
  const requested = typeof params.next === 'string' ? params.next : '/studio'
  // Only same-origin paths. Reflecting an arbitrary `next` would make this page an open redirect:
  // a link to our own trusted sign-in that lands the reader on somebody else's site afterwards.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/studio'

  if (await currentUser()) {
    redirect(next)
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For authors and operators. Reading the site needs no account.
      </p>
      <div className="mt-8">
        <LoginForm next={next} providers={enabledProviders()} />
      </div>
    </div>
  )
}

/**
 * Which social providers to offer.
 *
 * Configuration rather than a hardcoded list, because a button for a provider that is not enabled
 * in the Supabase dashboard is a button that leads to an error page.
 */
function enabledProviders(): Provider[] {
  const configured = process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? ''
  const known: Provider[] = ['google', 'azure', 'discord', 'github']
  return configured
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .filter((name): name is Provider => (known as string[]).includes(name))
}
