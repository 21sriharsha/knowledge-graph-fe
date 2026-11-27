"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { DEV_PERSONAS, DEV_SESSION_COOKIE, DEV_SESSION_MAX_AGE, signDevSession } from "@/lib/auth/dev-session";
import { nextPathSchema } from "@/lib/validation";
import { logger } from "@/lib/telemetry/logger";

const form = z.object({ persona: z.enum(DEV_PERSONAS), next: nextPathSchema });

/**
 * Dev-only sign-in (AUTH_MODE=dev; refused by the env schema outside local/test). Sets the signed
 * persona cookie and returns to the validated same-origin `next` path (F01-AC-2 open-redirect guard).
 */
export async function signInAsDevPersona(formData: FormData) {
  const env = serverEnv();
  if (env.AUTH_MODE !== "dev" || !env.DEV_AUTH_SECRET) throw new Error("Dev sign-in is disabled");
  const parsed = form.safeParse({ persona: formData.get("persona"), next: formData.get("next") ?? "/" });
  if (!parsed.success) redirect("/signin?error=invalid");
  const token = await signDevSession(parsed.data.persona, env.DEV_AUTH_SECRET);
  (await cookies()).set(DEV_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: DEV_SESSION_MAX_AGE,
  });
  logger.info({ provider: "dev", outcome: "success" }, "auth.signin");
  redirect(parsed.data.next);
}
