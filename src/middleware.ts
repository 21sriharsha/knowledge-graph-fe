import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { REQUEST_ID_HEADER } from '@/lib/request-id'

/**
 * Gates the studio and keeps sessions alive.
 *
 * Two jobs, and the first is the one that matters. Before this existed, `/studio` rendered for
 * anyone who could load the site: operator credentials lived on the server and were attached to
 * every backend call, so the backend's own authorization check passed for whoever happened to be
 * asking. The credentials never leaked — the authority they carried did.
 *
 * The second job is token refresh. Access tokens are short-lived, and a Server Component cannot set
 * a cookie, so something ahead of the render has to renew them. That is here.
 *
 * This is defence in depth, not the boundary. The backend independently rejects an unauthenticated
 * studio request; a middleware bug must not become an authorization bypass.
 */
export async function middleware(request: NextRequest) {
  // One id for the whole request, minted before anything can fail. Server Components read it from
  // the incoming headers, so the browser request, the render, and every backend call it makes all
  // carry the same identifier -- which is the only way a page that failed on the server can be
  // found in a log afterwards.
  const requestId = request.headers.get(REQUEST_ID_HEADER) ?? crypto.randomUUID()
  request.headers.set(REQUEST_ID_HEADER, requestId)

  let response = NextResponse.next({ request })
  response.headers.set(REQUEST_ID_HEADER, requestId)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          // Re-applied: rebuilding the response above discards headers set on the previous one.
          response.headers.set(REQUEST_ID_HEADER, requestId)
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser, never getSession: getSession trusts whatever the cookie claims without verifying it,
  // so a forged cookie would walk straight through the gate below.
  const { data } = await supabase.auth.getUser()

  if (!data.user && request.nextUrl.pathname.startsWith('/studio')) {
    const signIn = request.nextUrl.clone()
    signIn.pathname = '/login'
    // Carried so a signed-out person landing on a deep studio link arrives where they meant to,
    // rather than at the studio index having lost their place.
    signIn.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(signIn)
  }

  return response
}

export const config = {
  /*
   * Everything except static assets. Public pages are matched too, deliberately: the session has to
   * be refreshed wherever the reader happens to be, or it expires while they read and they are
   * signed out by the time they reach the studio.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
