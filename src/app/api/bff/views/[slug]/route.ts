import { backend, call } from "@/lib/api/server";
import { logger } from "@/lib/telemetry/logger";
import { parseSlug } from "@/lib/validation";

/** BFF: view counter (X01-FR-9). Always answers 202; failures are logged at DEBUG and ignored. */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/views/[slug]">) {
  const slug = parseSlug((await ctx.params).slug);
  if (!slug) return new Response(null, { status: 400 });
  const { client, requestId } = backend({ kind: "write", requestId: request.headers.get("x-request-id") ?? undefined });
  const result = await call(requestId, () => client.POST("/api/articles/{slug}/view", { params: { path: { slug } } }));
  if (!result.ok) logger.debug({ slug, status: result.status, requestId }, "views.record_failed");
  return new Response(null, { status: 202 });
}
