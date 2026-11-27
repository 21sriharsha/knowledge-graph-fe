import { z } from "zod";
import { badParam, studioRoute } from "@/lib/api/studio";

const query = z.object({ page: z.coerce.number().int().min(0).max(10_000).default(0), size: z.coerce.number().int().min(1).max(100).default(50) });

/** BFF: studio article list (F07-FR-1). */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return badParam();
  return studioRoute(request, (client) =>
    // No `sort`: a nested array inside the Pageable object doesn't serialise reliably (BG-20); the
    // studio list sorts by updatedAt client-side.
    client.GET("/api/studio/articles", { params: { query: { pageable: { page: parsed.data.page, size: parsed.data.size } } } }),
  );
}
