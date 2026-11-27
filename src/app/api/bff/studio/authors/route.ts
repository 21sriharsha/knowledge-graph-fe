import { studioRoute } from "@/lib/api/studio";

/** BFF: all authors (for byline selects and author names in studio lists). Public data, session required here. */
export async function GET(request: Request) {
  return studioRoute(request, (client) => client.GET("/api/authors", { params: { query: { pageable: { page: 0, size: 200 } } } }));
}
