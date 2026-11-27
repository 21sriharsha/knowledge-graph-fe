import { z } from "zod";
import { buildTaxonomyGraph } from "@/lib/api/taxonomy-graph";
import { unavailable } from "@/lib/api/result";
import { flagSchema } from "@/lib/validation";

const query = z.object({
  term: z.string().regex(/^(topic|tag):[a-z0-9]+(?:-[a-z0-9]+)*$/),
  depth: z.coerce.number().int().min(1).max(2).default(1),
  tags: flagSchema(true),
});

/** BFF: topic/tag tree for the explorer's taxonomy scope (F06-FR-12; interim for BG-5). */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ ok: false, kind: "validation", status: 400, message: "Invalid graph parameters.", violations: [] }, { status: 400 });
  }
  const { term, depth, tags } = parsed.data;
  const graph = await buildTaxonomyGraph(term, depth as 1 | 2, tags);
  if (graph === "unavailable") {
    const failure = unavailable();
    return Response.json(failure, { status: failure.status });
  }
  if (graph === "not_found") {
    return Response.json({ ok: false, kind: "not_found", status: 404, message: "No topic or tag with published content for this term.", violations: [] }, { status: 404 });
  }
  return Response.json({ ok: true, data: graph });
}
