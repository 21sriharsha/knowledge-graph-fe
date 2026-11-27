import { z } from "zod";
import { badParam, studioRoute } from "@/lib/api/studio";

const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), repositoryId: z.uuid().optional() });

/** BFF: ingestion runs (F09-FR-1). */
export async function GET(request: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return badParam();
  return studioRoute(request, (client) => client.GET("/api/studio/ingestions", { params: { query: parsed.data } }));
}
