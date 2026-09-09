import 'server-only'

import type {
  ArticleReadModel,
  ArticleReference,
  ArticleResponse,
  AuthorReadModel,
  GraphNeighbourhood,
  IngestionRunResponse,
  NavigationModel,
  PageResponse,
  SearchResponse,
  SearchSuggestion,
  SourceResponse,
  TagReadModel,
  TaxonomyListing,
  TopicReadModel,
} from './types'

/**
 * The only place the frontend talks to the backend.
 *
 * `server-only` is deliberate: importing this from a Client Component is a build error rather than a
 * runtime surprise. That is what keeps studio credentials off the browser — they are attached here,
 * on the server, and the browser only ever talks to the Next.js origin.
 *
 * No caching layer. Next.js 16 leaves `fetch` uncached by default and that is the behaviour this
 * platform wants: the backend already caches read models in Caffeine and invalidates them precisely
 * during ingestion. A second cache here would only create a window where the two disagree, owned by
 * nobody (FRONTEND-SPEC §11).
 */

const BASE_URL = process.env.KNOWLEDGE_API_URL ?? 'http://localhost:8080'

/** Thrown for any non-2xx response, carrying the status so callers can map 404 to `notFound()`. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly code?: string,
    message?: string,
  ) {
    super(message ?? `${status} from ${path}`)
    this.name = 'ApiRequestError'
  }

  get isNotFound() {
    return this.status === 404
  }
}

type QueryValue = string | number | boolean | undefined | null

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function request<T>(
  path: string,
  options: { query?: Record<string, QueryValue>; auth?: boolean; init?: RequestInit } = {},
): Promise<T> {
  const url = buildUrl(path, options.query)
  const headers = new Headers(options.init?.headers)
  headers.set('Accept', 'application/json')

  if (options.auth) {
    headers.set('Authorization', studioAuthorizationHeader())
  }

  let response: Response
  try {
    response = await fetch(url, { ...options.init, headers })
  } catch (cause) {
    // The backend being unreachable is a distinct condition from it saying no. Pages render a
    // "backend unavailable" state for this rather than a misleading empty result.
    throw new ApiRequestError(503, path, 'BACKEND_UNREACHABLE', `Cannot reach the API at ${BASE_URL}`)
  }

  if (!response.ok) {
    let code: string | undefined
    let message: string | undefined
    try {
      const body = await response.json()
      code = body?.code
      message = body?.message
    } catch {
      // A non-JSON error body (a proxy's HTML page, say) is not itself an error worth surfacing.
    }
    throw new ApiRequestError(response.status, path, code, message)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/**
 * Basic credentials for studio calls, read from the server environment.
 *
 * Missing credentials fail loudly here rather than producing a confusing 401 from the backend.
 */
function studioAuthorizationHeader(): string {
  const username = process.env.KNOWLEDGE_STUDIO_USERNAME
  const password = process.env.KNOWLEDGE_STUDIO_PASSWORD
  if (!username || !password) {
    throw new ApiRequestError(
      500,
      'studio',
      'STUDIO_CREDENTIALS_MISSING',
      'KNOWLEDGE_STUDIO_USERNAME and KNOWLEDGE_STUDIO_PASSWORD must be set to use studio features.',
    )
  }
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

// ---------------------------------------------------------------------------
// Public read surface. One request per page, per FRONTEND-SPEC §14.
// ---------------------------------------------------------------------------

export const api = {
  /** The complete article page: body, outline, author, taxonomy, related, backlinks, graph. */
  article: (slug: string) => request<ArticleReadModel>(`/api/articles/${encodeURIComponent(slug)}`),

  articles: (page = 0, size = 20) =>
    request<PageResponse<ArticleReference>>('/api/articles', { query: { page, size } }),

  authorPage: (slug: string) =>
    request<AuthorReadModel>(`/api/authors/${encodeURIComponent(slug)}/page`),

  topic: (slug: string) => request<TopicReadModel>(`/api/topics/${encodeURIComponent(slug)}`),

  tag: (slug: string) => request<TagReadModel>(`/api/tags/${encodeURIComponent(slug)}`),

  topics: () => request<TaxonomyListing>('/api/topics'),

  tags: () => request<TaxonomyListing>('/api/tags'),

  navigation: () => request<NavigationModel>('/api/navigation'),

  search: (q: string, page = 0, size = 20, understand?: boolean) =>
    request<SearchResponse>('/api/search', { query: { q, page, size, understand } }),

  /** Prefix matches for the search box's typeahead. Not a shortened search — see the endpoint. */
  searchSuggest: (q: string, limit = 6) =>
    request<SearchSuggestion[]>('/api/search/suggest', { query: { q, limit } }),

  /** Bounded neighbourhood. `depth` is clamped by the backend; the UI must not imply otherwise. */
  graphBySlug: (slug: string, depth = 1, includeSuggestions = true) =>
    request<GraphNeighbourhood>('/api/graph', { query: { slug, depth, includeSuggestions } }),

  /** A bounded sample of the whole graph, for the landing page. Never the full corpus. */
  graphOverview: (maxNodes = 40) =>
    request<GraphNeighbourhood>('/api/graph/overview', { query: { maxNodes } }),

  graphByNode: (nodeId: string, depth = 1, includeSuggestions = true) =>
    request<GraphNeighbourhood>(`/api/graph/${encodeURIComponent(nodeId)}`, {
      query: { depth, includeSuggestions },
    }),

  // -------------------------------------------------------------------------
  // Studio. Every call authenticates server-side.
  // -------------------------------------------------------------------------

  studio: {
    sources: () => request<SourceResponse[]>('/api/studio/sources', { auth: true }),

    source: (id: string) =>
      request<SourceResponse>(`/api/studio/sources/${encodeURIComponent(id)}`, { auth: true }),

    createSource: (body: unknown) =>
      request<SourceResponse>('/api/studio/sources', {
        auth: true,
        init: {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        },
      }),

    setSourceActive: (id: string, active: boolean) =>
      request<SourceResponse>(`/api/studio/sources/${encodeURIComponent(id)}/activate`, {
        auth: true,
        init: { method: active ? 'POST' : 'DELETE' },
      }),

    /** Returns 202 with no body: the work is deferred to the job queue. */
    syncSource: (id: string) =>
      request<void>(`/api/studio/sources/${encodeURIComponent(id)}/sync`, {
        auth: true,
        init: { method: 'POST' },
      }),

    ingestions: (limit = 20, repositoryId?: string) =>
      request<IngestionRunResponse[]>('/api/studio/ingestions', {
        auth: true,
        query: { limit, repositoryId },
      }),

    ingestion: (id: string) =>
      request<IngestionRunResponse>(`/api/studio/ingestions/${encodeURIComponent(id)}`, {
        auth: true,
      }),

    pipeline: () => request<string[]>('/api/studio/ingestions/pipeline', { auth: true }),

    articles: (page = 0, size = 20) =>
      request<PageResponse<ArticleResponse>>('/api/studio/articles', {
        auth: true,
        query: { page, size },
      }),

    setPublicationState: (slug: string, action: 'publish' | 'unpublish' | 'archive') =>
      request<ArticleResponse>(
        `/api/studio/articles/${encodeURIComponent(slug)}/${action}`,
        { auth: true, init: { method: 'POST' } },
      ),
  },
}
