import { badParam, parseBody, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";
import { updateSourceSchema } from "@/lib/validation/studio";

type Ctx = RouteContext<"/api/bff/studio/sources/[id]">;

/** BFF: read / update one repository (F08-FR-3). */
export async function GET(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid repository id.");
  return studioRoute(request, (client) => client.GET("/api/studio/sources/{id}", { params: { path: { id: id.data } } }));
}

export async function PUT(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam("Invalid repository id.");
  const body = await parseBody(request, updateSourceSchema);
  if ("error" in body) return body.error;
  return studioRoute(request, (client) => client.PUT("/api/studio/sources/{id}", { params: { path: { id: id.data } }, body: body.data }));
}
