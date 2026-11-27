import { badParam, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";

/** BFF: one ingestion run with diagnostics (F09-FR-3). */
export async function GET(request: Request, ctx: RouteContext<"/api/bff/studio/ingestions/[id]">) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid run id.");
  return studioRoute(request, (client) => client.GET("/api/studio/ingestions/{id}", { params: { path: { id: id.data } } }));
}
