import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { backend, call } from "@/lib/api/server";
import { httpStatusOf, unavailable } from "@/lib/api/result";

const query = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

async function suggest(q: string, limit: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  const { client, requestId } = backend();
  const result = await call(requestId, () => client.GET("/api/search/suggest", { params: { query: { q, limit } } }));
  if (!result.ok && result.kind === "unavailable") throw new Error("suggest unavailable"); // never cache outages
  return result;
}

/** BFF: header search suggestions (F05-FR-2). The query is never logged (X03-FR-5). */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ ok: true, data: [] });
  try {
    const result = await suggest(parsed.data.q.toLowerCase(), parsed.data.limit);
    return Response.json(result, { status: httpStatusOf(result) });
  } catch {
    const failure = unavailable();
    return Response.json(failure, { status: failure.status });
  }
}
