import { studioRoute } from "@/lib/api/studio";

/** BFF: pipeline steps as assembled by the backend (F09-FR-3). */
export async function GET(request: Request) {
  return studioRoute(request, (client) => client.GET("/api/studio/ingestions/pipeline"));
}
