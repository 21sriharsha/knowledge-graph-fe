import { studioRoute } from "@/lib/api/studio";

/** BFF: current account (F01-FR-4). */
export async function GET(request: Request) {
  return studioRoute(request, (client) => client.GET("/api/studio/me"));
}
