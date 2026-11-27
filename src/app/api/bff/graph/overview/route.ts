import { z } from "zod";
import { getGraphOverview, readSafely } from "@/lib/api/reader";
import { httpStatusOf } from "@/lib/api/result";

const query = z.object({ maxNodes: z.coerce.number().int().min(8).max(60).default(40) });

/** BFF: whole-graph overview for the explorer (F06-FR-10). Public, cached per node limit. */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) {
    return Response.json({ ok: false, kind: "validation", status: 400, message: "Invalid node limit.", violations: [] }, { status: 400 });
  }
  const result = await readSafely(() => getGraphOverview(parsed.data.maxNodes));
  return Response.json(result, { status: httpStatusOf(result) });
}
