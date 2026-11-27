import { badParam, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";

type Ctx = RouteContext<"/api/bff/studio/sources/[id]/activate">;

/** BFF: activate (POST) / pause (DELETE) a repository (F08-FR-6). */
export async function POST(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid repository id.");
  return studioRoute(request, (client) => client.POST("/api/studio/sources/{id}/activate", { params: { path: { id: id.data } } }));
}

export async function DELETE(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid repository id.");
  return studioRoute(request, (client) => client.DELETE("/api/studio/sources/{id}/activate", { params: { path: { id: id.data } } }));
}
