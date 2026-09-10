'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * The Supabase client for the browser.
 *
 * Used only by the sign-in form: this is where a password is typed, and it goes straight from the
 * form to the identity provider. It never reaches this application's server, which is the point —
 * an application that never receives a password cannot leak, log or mishandle one.
 *
 * The publishable key is meant to be in the browser bundle. `NEXT_PUBLIC_` is correct here and
 * nowhere else in this codebase.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
