import { studioRoute } from "@/lib/api/studio";

/** BFF: accounts (admin only; backend returns 403 otherwise) (F10-FR-1). */
export async function GET(request: Request) {
  return studioRoute(request, (client) => client.GET("/api/studio/accounts"));
}
