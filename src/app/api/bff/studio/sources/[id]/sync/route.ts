import { badParam, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";

/** BFF: trigger a full sync (F08-FR-7). Backend answers 202. */
export async function POST(request: Request, ctx: RouteContext<"/api/bff/studio/sources/[id]/sync">) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid repository id.");
  return studioRoute(request, (client) => client.POST("/api/studio/sources/{id}/sync", { params: { path: { id: id.data } } }));
}
