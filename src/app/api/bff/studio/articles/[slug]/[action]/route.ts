import { revalidateTag } from "next/cache";
import { badParam, studioRoute } from "@/lib/api/studio";
import { TAGS } from "@/lib/api/reader";
import { parseSlug } from "@/lib/validation";
import { articleTransitionSchema } from "@/lib/validation/studio";

/**
 * BFF: publish / unpublish / archive (F07-FR-4/5). On success the public caches for this article,
 * the lists and the graph are expired immediately (X04-FR-4) instead of waiting for the backend hook.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/studio/articles/[slug]/[action]">) {
  const params = await ctx.params;
  const slug = parseSlug(params.slug);
  const action = articleTransitionSchema.safeParse(params.action);
  if (!slug || !action.success) return badParam();
  const path = `/api/studio/articles/{slug}/${action.data}` as const;
  const response = await studioRoute(request, (client) => client.POST(path, { params: { path: { slug } } }));
  if (response.ok) {
    // Editor actions need read-your-writes: expire immediately (no stale serve), unlike the ingestion webhook.
    for (const tag of [TAGS.article(slug), TAGS.articles, TAGS.navigation, TAGS.graph]) revalidateTag(tag, { expire: 0 });
  }
  return response;
}
