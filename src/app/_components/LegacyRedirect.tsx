import { headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";
import { backend, call } from "@/lib/api/server";

const pathSchema = z.string().min(2).max(500).regex(/^\/[^\s?#]*$/);
const TARGET_PREFIX = { ARTICLE: "/articles/", AUTHOR: "/authors/", TOPIC: "/topics/", TAG: "/tags/" } as const;

/**
 * Legacy path resolution (X04-FR-6): when a URL doesn't match a route, ask the backend whether it
 * maps to a canonical article/author/topic/tag and redirect permanently. Renders nothing otherwise.
 */
export async function LegacyRedirect() {
  await connection(); // request-time only (reads the request path, calls the backend uncached)
  const parsed = pathSchema.safeParse((await headers()).get("x-pathname") ?? "");
  if (!parsed.success) return null;
  const { client, requestId } = backend();
  const result = await call(requestId, () => client.GET("/api/routes/resolve", { params: { query: { path: parsed.data } } }));
  if (!result.ok || !result.data.targetType || !result.data.targetSlug) return null;
  const target = `${TARGET_PREFIX[result.data.targetType]}${encodeURIComponent(result.data.targetSlug)}`;
  if (target !== parsed.data) permanentRedirect(target);
  return null;
}
