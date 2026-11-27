import { z } from "zod";
import { getNeighbourhood, readSafely } from "@/lib/api/reader";
import { httpStatusOf } from "@/lib/api/result";
import { depthSchema, flagSchema, slugSchema } from "@/lib/validation";

const query = z.object({ slug: slugSchema, depth: depthSchema, suggestions: flagSchema(false) });

/** BFF: article neighbourhood for the local graph (F03-FR-11). Public, cached per (slug, depth, suggestions). */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ ok: false, kind: "validation", status: 400, message: "Invalid graph parameters.", violations: [] }, { status: 400 });
  }
  const { slug, depth, suggestions } = parsed.data;
  const result = await readSafely(() => getNeighbourhood(slug, depth, suggestions));
  return Response.json(result, { status: httpStatusOf(result) });
}
