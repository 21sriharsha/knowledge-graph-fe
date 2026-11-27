import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/auth/supabase-server";
import { serverEnv } from "@/lib/env/server";
import { nextPathSchema } from "@/lib/validation";
import { logger } from "@/lib/telemetry/logger";

const query = z.object({ code: z.string().min(1).max(2048), next: nextPathSchema });

/**
 * OAuth / magic-link callback (F01-FR-2): exchanges the PKCE code for a session (httpOnly cookies via
 * @supabase/ssr) and returns to the validated same-origin `next` path. Never redirects off-site.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const site = serverEnv().NEXT_PUBLIC_SITE_URL;
  const parsed = query.safeParse({ code: url.searchParams.get("code"), next: url.searchParams.get("next") ?? "/studio" });
  if (!parsed.success || serverEnv().AUTH_MODE !== "supabase") {
    logger.warn({ provider: "supabase", outcome: "invalid_callback" }, "auth.signin");
    return NextResponse.redirect(new URL("/signin?error=callback", site));
  }
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(parsed.data.code);
  if (error) {
    logger.warn({ provider: "supabase", outcome: "exchange_failed", status: error.status }, "auth.signin");
    return NextResponse.redirect(new URL("/signin?error=callback", site));
  }
  logger.info({ provider: "supabase", outcome: "success" }, "auth.signin");
  return NextResponse.redirect(new URL(parsed.data.next, site));
}
