import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Where an identity provider sends the reader back to.
 *
 * Exchanges the one-time code for a session and stores it in cookies. This runs on the server
 * because that is the only place the exchange can set an HTTP-only cookie — a session held in
 * JavaScript is a session any script on the page can read.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const requested = url.searchParams.get('next') ?? '/studio'
  // Same-origin only: this value came back through a third party and is not to be trusted.
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/studio'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', url.origin))
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    )
  }
  return NextResponse.redirect(new URL(next, url.origin))
}
