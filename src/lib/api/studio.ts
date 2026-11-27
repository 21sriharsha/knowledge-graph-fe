import "server-only";
import type { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { getSession } from "@/lib/auth/session";
import { backend, call, type BackendClient } from "./server";
import { httpStatusOf, unauthenticated, type ApiResult } from "./result";

/**
 * Studio BFF helper (X01-FR-3/7). Every studio route handler goes through here:
 *  1. CSRF: mutating requests must be same-origin (Sec-Fetch-Site / Origin check) — cookies carry auth.
 *  2. Session required → backend call with the user's Authorization header (roles enforced by Spring).
 *  3. Request bodies parsed with zod before anything reaches the backend.
 *  4. ApiResult JSON with the matching HTTP status; never forwards backend headers.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new URL(serverEnv().NEXT_PUBLIC_SITE_URL).origin;
  return origin === allowed || origin === new URL(request.url).origin;
}

const json = (result: ApiResult<unknown>) =>
  Response.json(result, { status: httpStatusOf(result), headers: { "Cache-Control": "private, no-store" } });

function failure(status: number, kind: "validation" | "forbidden", message: string, violations: { field: string; message: string }[] = []) {
  return Response.json({ ok: false, kind, status, message, violations }, { status, headers: { "Cache-Control": "private, no-store" } });
}

type Run<T> = (client: BackendClient) => Promise<{ data?: T; error?: unknown; response: Response }>;

export async function studioRoute<T>(request: Request, run: Run<T>): Promise<Response> {
  if (MUTATING.has(request.method) && !sameOrigin(request)) return failure(403, "forbidden", "Cross-site request refused.");
  const session = await getSession();
  if (!session.signedIn) return json(unauthenticated());
  const { client, requestId } = backend({
    authorization: session.authorization,
    requestId: request.headers.get("x-request-id") ?? undefined,
    kind: MUTATING.has(request.method) ? "write" : "read",
  });
  return json(await call(requestId, () => run(client)));
}

/** Parses a JSON body with zod; returns either the data or a 400 Response with field violations. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { error: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: failure(400, "validation", "Invalid JSON body.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: failure(
        400,
        "validation",
        "Some fields need attention.",
        parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      ),
    };
  }
  return { data: parsed.data };
}

export function badParam(message = "Invalid parameter."): Response {
  return failure(400, "validation", message);
}
