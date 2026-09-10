import Link from 'next/link'

import { currentUser } from '@/lib/supabase/server'

/**
 * Who is signed in, and how to stop being.
 *
 * A Server Component: the session is already known during the render that produces the header, so
 * there is no signed-out flash and no client round trip to find out.
 *
 * Sign-out is a form rather than a link, because a GET that ends a session can be triggered by any
 * link, image or prefetch pointing at it.
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

  return (
    <div className="flex shrink-0 items-center gap-3">
      <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
        Studio
      </Link>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground"
          title={user.email ?? undefined}
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
