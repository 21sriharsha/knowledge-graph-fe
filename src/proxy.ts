/**
 * Network boundary (Next 16 "proxy", formerly middleware).
 *  1. Assigns/propagates X-Request-Id so frontend and backend logs share one id (X01-FR-4, X03).
 *  2. Refreshes the Supabase session cookie on navigation (F01-FR-3) when AUTH_MODE=supabase.
 *  3. Marks studio responses private + noindex (X04-AC-5).
 * No business logic and no data fetching here.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export async function proxy(request: NextRequest) {
  const incoming = request.headers.get("x-request-id");
  const requestId = incoming && REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();

  const forwarded = new Headers(request.headers);
  forwarded.set("x-request-id", requestId);
  // Lets not-found resolve legacy paths through the backend (X04-FR-6). Overwrites any client value.
  forwarded.set("x-pathname", request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: forwarded } });

  if (process.env.AUTH_MODE !== "dev" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: forwarded } });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    });
    // Touching the user refreshes an expiring session; result intentionally unused here.
    await supabase.auth.getUser();
  }

  response.headers.set("x-request-id", requestId);
  if (request.nextUrl.pathname.startsWith("/studio")) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
