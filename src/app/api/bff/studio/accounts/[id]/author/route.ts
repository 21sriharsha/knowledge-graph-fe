import { badParam, parseBody, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";
import { linkAuthorSchema } from "@/lib/validation/studio";

type Ctx = RouteContext<"/api/bff/studio/accounts/[id]/author">;

/** BFF: link (PUT) / unlink (DELETE) a byline (F10-FR-5). */
export async function PUT(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam();
  const body = await parseBody(request, linkAuthorSchema);
  if ("error" in body) return body.error;
  return studioRoute(request, (client) => client.PUT("/api/studio/accounts/{accountId}/author", { params: { path: { accountId: id.data } }, body: body.data }));
}

export async function DELETE(request: Request, ctx: Ctx) {
  const id = uuidSchema.safeParse((await ctx.params).id);
  if (!id.success) return badParam();
  return studioRoute(request, (client) => client.DELETE("/api/studio/accounts/{accountId}/author", { params: { path: { accountId: id.data } } }));
}
