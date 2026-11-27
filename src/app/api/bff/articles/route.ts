import { z } from "zod";
import { getArticlesPage, readSafely } from "@/lib/api/reader";
import { httpStatusOf } from "@/lib/api/result";
import { pageSchema, pageSizeSchema } from "@/lib/validation";

const query = z.object({ page: pageSchema, size: pageSizeSchema });

/** BFF: next page of the "Latest" feed for "Show more" (F02-FR-3). Public, cached per page. */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = query.safeParse(params);
  if (!parsed.success) {
    return Response.json(
      { ok: false, kind: "validation", status: 400, message: "Invalid paging parameters.", violations: [] },
      { status: 400 },
    );
  }
  const result = await readSafely(() => getArticlesPage(parsed.data.page, parsed.data.size));
  return Response.json(result, { status: httpStatusOf(result) });
}
