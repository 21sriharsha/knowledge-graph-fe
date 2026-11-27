import { getArticle, readSafely } from "@/lib/api/reader";
import { httpStatusOf, type ApiResult } from "@/lib/api/result";
import { parseSlug } from "@/lib/validation";

export type ArticlePreview = {
  slug: string;
  title?: string;
  summary?: string;
  authorName?: string;
  readingTimeMinutes?: number;
  topics: string[];
};

/**
 * BFF: link hovercard data (F03-FR-10). Trims the cached full read model to what the card shows; a
 * dedicated lightweight backend endpoint would avoid fetching the body (BG-10).
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/bff/articles/[slug]/preview">) {
  const slug = parseSlug((await ctx.params).slug);
  if (!slug) return Response.json({ ok: false, kind: "validation", status: 400, message: "Invalid slug.", violations: [] }, { status: 400 });
  const article = await readSafely(() => getArticle(slug));
  const result: ApiResult<ArticlePreview> = article.ok
    ? {
        ok: true,
        data: {
          slug,
          title: article.data.title,
          summary: article.data.summary,
          authorName: article.data.author?.displayName,
          readingTimeMinutes: article.data.readingTimeMinutes,
          topics: (article.data.topics ?? []).map((t) => t.name ?? "").filter(Boolean),
        },
      }
    : article;
  return Response.json(result, { status: httpStatusOf(result), headers: { "Cache-Control": "public, max-age=300" } });
}
