import { badParam, studioRoute } from "@/lib/api/studio";
import { uuidSchema } from "@/lib/validation";
import { roleSchema } from "@/lib/validation/studio";

type Ctx = RouteContext<"/api/bff/studio/accounts/[id]/roles/[role]">;

async function parse(ctx: Ctx) {
  const p = await ctx.params;
  const id = uuidSchema.safeParse(p.id);
  const role = roleSchema.safeParse(p.role);
  return id.success && role.success ? { accountId: id.data, role: role.data } : null;
}

/** BFF: grant (PUT) / revoke (DELETE) a role (F10-FR-3). */
export async function PUT(request: Request, ctx: Ctx) {
  const path = await parse(ctx);
  if (!path) return badParam();
  return studioRoute(request, (client) => client.PUT("/api/studio/accounts/{accountId}/roles/{role}", { params: { path } }));
}

export async function DELETE(request: Request, ctx: Ctx) {
  const path = await parse(ctx);
  if (!path) return badParam();
  return studioRoute(request, (client) => client.DELETE("/api/studio/accounts/{accountId}/roles/{role}", { params: { path } }));
}
