import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { backend, call } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { ApiResult } from "@/lib/api/result";
import { unauthenticated } from "@/lib/api/result";
import { DEV_SESSION_COOKIE, verifyDevSession, type DevPersona } from "./dev-session";
import { supabaseServer } from "./supabase-server";

export type Account = components["schemas"]["AccountResponse"];

export type Session =
  | { signedIn: false }
  | { signedIn: true; authorization: string; mode: "supabase" | "dev"; devPersona?: DevPersona; email?: string };

/**
 * Data access layer for the current user (ADR 0003). Reads cookies, so callers must sit behind a
 * <Suspense> boundary or in dynamic route handlers. Roles never come from here — only from /me.
 */
export async function getSession(): Promise<Session> {
  // Request-time only: session validity depends on the clock and cookies, never on the static shell.
  await connection();
  const env = serverEnv();
  if (env.AUTH_MODE === "dev") {
    const persona = await verifyDevSession((await cookies()).get(DEV_SESSION_COOKIE)?.value, env.DEV_AUTH_SECRET!);
    const credentials =
      persona === "admin" ? env.DEV_AUTH_ADMIN_CREDENTIALS : persona === "author" ? env.DEV_AUTH_AUTHOR_CREDENTIALS : undefined;
    if (!persona || !credentials) return { signedIn: false };
    return {
      signedIn: true,
      mode: "dev",
      devPersona: persona,
      authorization: `Basic ${Buffer.from(credentials).toString("base64")}`,
    };
  }
  const supabase = await supabaseServer();
  // getUser() verifies the JWT with Supabase; getSession() alone trusts the cookie.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { signedIn: false };
  const { data } = await supabase.auth.getSession();
  if (!data.session) return { signedIn: false };
  return {
    signedIn: true,
    mode: "supabase",
    authorization: `Bearer ${data.session.access_token}`,
    email: userData.user.email,
  };
}

export async function incomingRequestId(): Promise<string | undefined> {
  return (await headers()).get("x-request-id") ?? undefined;
}

/** Calls `GET /api/studio/me` for the signed-in user (F01-FR-4). */
export async function getAccount(session?: Session): Promise<ApiResult<Account>> {
  const current = session ?? (await getSession());
  if (!current.signedIn) return unauthenticated();
  const { client, requestId } = backend({ authorization: current.authorization, requestId: await incomingRequestId() });
  return call(requestId, () => client.GET("/api/studio/me"));
}

export function isAuthor(account: Account): boolean {
  return (account.roles ?? []).includes("AUTHOR") || (account.roles ?? []).includes("ADMIN");
}

export function isAdmin(account: Account): boolean {
  return (account.roles ?? []).includes("ADMIN");
}
