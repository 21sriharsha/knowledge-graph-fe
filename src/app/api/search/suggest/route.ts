import { api } from '@/lib/api'
import type { SearchSuggestionsResponse } from '@/lib/types'

/**
 * Suggestions for the search box.
 *
 * This exists because the API client is `server-only` and the browser never talks to Spring
 * directly — the same rule that keeps studio credentials off the client. So the typeahead calls the
 * Next.js origin and this handler forwards it.
 *
 * It calls the backend's dedicated `/api/search/suggest`, not `/api/search`. Full-text retrieval
 * matches stemmed whole words, so it returns nothing for a word the reader has not finished typing
 * — precisely the window a typeahead exists to serve.
 *
 * A backend failure is not an error here. Someone typing must not be interrupted by a dropdown full
 * of apology, and pressing Enter reaches the results page, which reports the outage properly. The
 * response says so and the box stays quiet.
 */
export const dynamic = 'force-dynamic'

/** Below this, matches are too broad to be useful and the request is pure noise. */
const MIN_QUERY_LENGTH = 2

/** Enough to recognise the article you meant, few enough to read without scrolling. */
const SUGGESTION_LIMIT = 6

export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''

  if (query.length < MIN_QUERY_LENGTH) {
    return Response.json({ suggestions: [] } satisfies SearchSuggestionsResponse)
  }

  try {
    const suggestions = await api.searchSuggest(query, SUGGESTION_LIMIT)
    return Response.json({ suggestions } satisfies SearchSuggestionsResponse)
  } catch {
    return Response.json({ suggestions: [], unavailable: true } satisfies SearchSuggestionsResponse)
  }
}
