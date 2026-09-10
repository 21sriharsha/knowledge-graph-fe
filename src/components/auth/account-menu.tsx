import Link from 'next/link'

import { ProfileMenu } from '@/components/auth/profile-menu'
import { currentUser } from '@/lib/supabase/server'

/**
 * Who is signed in.
 *
 * A Server Component: the session is already known during the render that produces the header, so
 * there is no signed-out flash and no client round trip to find out. Only the menu itself is
 * interactive, and only that ships as JavaScript.
 */
export async function AccountMenu() {
  const user = await currentUser()

  if (!user) {
    return (
      <Link href="/login" className="shrink-0 text-sm text-muted-foreground hover:text-foreground">
        Sign in
      </Link>
    )
  }

  const metadata = user.user_metadata ?? {}

  return (
    <ProfileMenu
      email={user.email ?? null}
      displayName={firstString(metadata.full_name, metadata.name, metadata.user_name)}
      avatarUrl={firstString(metadata.avatar_url, metadata.picture)}
    />
  )
}

/**
 * The first usable value among a provider's competing claims.
 *
 * Google, Microsoft, Discord and GitHub each name these differently, and Supabase passes the
 * provider's own metadata through rather than normalising it. Reading one key would work for
 * whichever provider was tested and quietly show initials for the rest.
 */
function firstString(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate
  }
  return null
}
