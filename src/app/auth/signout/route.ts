import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { DEV_SESSION_COOKIE } from "@/lib/auth/dev-session";
import { supabaseServer } from "@/lib/auth/supabase-server";

/** Sign-out (F01-FR-8): POST only, same-origin; clears the session and returns home. */
export async function POST(request: Request) {
  const env = serverEnv();
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response("Cross-site request refused", { status: 403 });
  if (env.AUTH_MODE === "dev") (await cookies()).delete(DEV_SESSION_COOKIE);
  else await (await supabaseServer()).auth.signOut();
  const response = NextResponse.redirect(new URL("/", env.NEXT_PUBLIC_SITE_URL), { status: 303 });
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}
