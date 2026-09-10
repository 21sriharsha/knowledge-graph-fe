import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * The Supabase client for Server Components, Server Actions and route handlers.
 *
 * Session state lives in cookies rather than in memory, which is what lets a Server Component know
 * who is signed in during the same render that fetches their data — no client round trip, and no
 * flash of a signed-out page before the session is discovered.
 *
 * Only ever constructed with the **publishable** key. That key is designed to be public and is
 * subject to the project's row-level security; the service-role key, which bypasses it entirely,
 * must never appear in this application.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl(), supabaseKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. Harmless: the middleware refreshes the session on
          // every request, so a token that expired mid-render is renewed before the next one.
        }
      },
    },
  })
}

/**
 * The signed-in user, or null.
 *
 * Uses `getUser()` rather than `getSession()`. The difference is not stylistic: `getSession()`
 * returns whatever the cookie claims without checking it, so a forged cookie would be believed.
 * `getUser()` verifies the token with the auth server. Anything that gates access must use this.
 */
export async function currentUser() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

/**
 * The access token to forward to the backend, or null.
 *
 * The backend validates it against the provider's JWKS and decides authorization from its own
 * records, so this is the whole of what the frontend contributes to a studio request: proof of who
 * is asking. It is deliberately not a credential this application owns.
 */
export async function currentAccessToken(): Promise<string | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  return url
}

function supabaseKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set')
  return key
}
