import type { Metadata } from 'next'
import Link from 'next/link'

import { ApiRequestError, api } from '@/lib/api'
import { currentUser } from '@/lib/supabase/server'
import type { AccountModel } from '@/lib/types'

export const metadata: Metadata = { title: 'Account' }

/**
 * What this account is, and what it can currently do.
 *
 * Exists because "signed in" and "able to do anything" are now different states, and the difference
 * is invisible otherwise. Someone who has just signed up needs one page that says plainly: you are
 * authenticated, you have no roles yet, nothing here is broken.
 */
export default async function AccountPage() {
  const user = await currentUser()

  let account: AccountModel | null = null
  let error: string | null = null
  try {
    account = await api.studio.me()
  } catch (caught) {
    error =
      caught instanceof ApiRequestError && caught.status === 401
        ? 'Your session has expired. Sign in again to continue.'
        : 'Could not load this account.'
  }

  const roles = account?.roles ?? []

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-border bg-muted/50 p-4 text-sm">
          {error}
        </p>
      ) : (
        <>
          <dl className="mt-8 divide-y divide-border border-y border-border text-sm">
            <Row label="Signed in as">{user?.email ?? '—'}</Row>
            <Row label="Identity provider">
              {/* Which provider they used, so someone with both a Google and an email account can
                  tell which one they are currently in. */}
              {typeof user?.app_metadata?.provider === 'string'
                ? providerLabel(user.app_metadata.provider)
                : '—'}
            </Row>
            <Row label="Roles">
              {roles.length > 0 ? (
                roles.join(', ')
              ) : (
                <span className="text-muted-foreground">
                  None yet — an administrator grants these
                </span>
              )}
            </Row>
            <Row label="Byline">
              {account?.authorId ? (
                <span className="font-mono text-xs">{account.authorId}</span>
              ) : (
                <span className="text-muted-foreground">
                  Not linked — an administrator links your account to an author
                </span>
              )}
            </Row>
          </dl>

          {roles.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Signing in does not grant anything on its own. Until an administrator gives this
              account a role, there is nothing for it to do — which is the platform working as
              intended.
            </p>
          ) : null}

          <p className="mt-8 text-sm">
            <Link href="/studio" className="underline underline-offset-4">
              Back to the studio
            </Link>
          </p>
        </>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    email: 'Email and password',
    google: 'Google',
    azure: 'Microsoft',
    discord: 'Discord',
    github: 'GitHub',
  }
  return labels[provider] ?? provider
}
