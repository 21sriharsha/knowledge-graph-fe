import { revalidateTag } from "next/cache";
import { badParam, parseBody, studioRoute } from "@/lib/api/studio";
import { TAGS } from "@/lib/api/reader";
import { parseSlug } from "@/lib/validation";
import { authorProfileSchema } from "@/lib/validation/studio";

type Ctx = RouteContext<"/api/bff/studio/authors/[slug]">;

/** BFF: read / update an author profile (F11). Ownership enforced by the backend (404 otherwise). */
export async function GET(request: Request, ctx: Ctx) {
  const slug = parseSlug((await ctx.params).slug);
  if (!slug) return badParam();
  return studioRoute(request, (client) => client.GET("/api/authors/{slug}", { params: { path: { slug } } }));
}

export async function PUT(request: Request, ctx: Ctx) {
  const slug = parseSlug((await ctx.params).slug);
  if (!slug) return badParam();
  const body = await parseBody(request, authorProfileSchema);
  if ("error" in body) return body.error;
  const response = await studioRoute(request, (client) => client.PUT("/api/studio/authors/{slug}", { params: { path: { slug } }, body: body.data }));
  if (response.ok) revalidateTag(TAGS.author(slug), { expire: 0 }); // read-your-writes for the editor
  return response;
}
