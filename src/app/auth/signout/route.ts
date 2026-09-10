import { NextResponse, type NextRequest } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Signs out.
 *
 * POST only. A sign-out reachable by GET can be triggered by any link, image or prefetch pointing
 * at it, which makes signing people out something a third party gets to decide.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.nextUrl.origin), { status: 303 })
}
