import { parseBody, studioRoute } from "@/lib/api/studio";
import { createSourceSchema } from "@/lib/validation/studio";

/** BFF: list / connect repositories (F08-FR-1/2). */
export async function GET(request: Request) {
  return studioRoute(request, (client) => client.GET("/api/studio/sources"));
}

export async function POST(request: Request) {
  const body = await parseBody(request, createSourceSchema);
  if ("error" in body) return body.error;
  return studioRoute(request, (client) => client.POST("/api/studio/sources", { body: body.data }));
}
