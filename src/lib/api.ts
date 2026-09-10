import 'server-only'

import { REQUEST_ID_HEADER, currentRequestId } from './request-id'
import { currentAccessToken } from './supabase/server'

import type {
  AccountModel,
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
  TrendingArticle,
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

/**
 * Where the backend lives.
 *
 * Falls back to localhost only in development. In a built deployment the frontend and the backend
 * are separate services on separate hosts, and a missing variable there is a misconfiguration, not
 * a default worth guessing at: every page would render "backend unavailable" and point at a backend
 * problem that does not exist. Failing on the first request names the actual fault instead.
 */
const BASE_URL =
  process.env.KNOWLEDGE_API_URL ??
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080')

/**
 * How long to wait for the backend before giving up.
 *
 * Every public page is server-rendered, so an unanswered backend request is a page render that
 * never finishes and a browser connection held open until something further up the stack times out.
 * Over localhost that is invisible; between two independently deployed services it is not. A bounded
 * wait turns a hung backend into the "backend unavailable" state the pages already know how to
 * render.
 */
const REQUEST_TIMEOUT_MS = Number(process.env.KNOWLEDGE_API_TIMEOUT_MS ?? 8000)

/** Thrown for any non-2xx response, carrying the status so callers can map 404 to `notFound()`. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly code?: string,
    message?: string,
    /** The id the backend logged this failure against, so a reported error is one grep away. */
    readonly requestId?: string | null,
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
  if (!BASE_URL) {
    throw new ApiRequestError(
      500,
      path,
      'API_URL_MISSING',
      'KNOWLEDGE_API_URL must be set: the frontend does not know where the backend is.',
    )
  }
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

  const requestId = await currentRequestId()
  if (requestId) {
    headers.set(REQUEST_ID_HEADER, requestId)
  }

  if (options.auth) {
    headers.set('Authorization', await studioAuthorizationHeader())
  }

  const startedAt = Date.now()
  let response: Response
  try {
    response = await fetch(url, {
      ...options.init,
      headers,
      // A caller's own signal wins, so a cancelled request is not resurrected by this deadline.
      signal: options.init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause) {
    // Unreachable and too-slow are the same thing from a reader's point of view — the page cannot
    // be built — and distinct from the backend saying no. Pages render a "backend unavailable"
    // state for this rather than a misleading empty result.
    const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError'
    logCall({
      requestId,
      method: options.init?.method ?? 'GET',
      path,
      status: timedOut ? 'timeout' : 'unreachable',
      durationMs: Date.now() - startedAt,
    })
    throw new ApiRequestError(
      503,
      path,
      'BACKEND_UNREACHABLE',
      timedOut
        ? `The API at ${BASE_URL} did not respond within ${REQUEST_TIMEOUT_MS}ms`
        : `Cannot reach the API at ${BASE_URL}`,
    )
  }

  logCall({
    requestId,
    method: options.init?.method ?? 'GET',
    path,
    status: response.status,
    durationMs: Date.now() - startedAt,
  })

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
    // Prefer the id the backend echoed: if the two ever disagree, the backend's is the one written
    // into its logs, and that is the one worth quoting.
    throw new ApiRequestError(
        response.status, path, code, message,
        response.headers.get(REQUEST_ID_HEADER) ?? requestId)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/**
 * Records that a backend call happened.
 *
 * Nothing did, before this. Every call is server to server, so a failing page produced no entry in
 * the browser's network tab and no line anywhere on the frontend either -- the render simply came
 * back wrong. Finding out which call had failed meant reading backend logs and matching timestamps.
 *
 * One line per call, as JSON, carrying the id the backend logs against the same request. Failures
 * are logged at error level; everything else is quiet enough to leave on.
 */
function logCall(call: {
  requestId: string | null
  method: string
  path: string
  status: number | string
  durationMs: number
}) {
  const failed = typeof call.status !== 'number' || call.status >= 400
  const line = JSON.stringify({ event: 'backend_call', ...call })
  if (failed) console.error(line)
  else if (process.env.KNOWLEDGE_LOG_CALLS === 'true') console.log(line)
}

/**
 * How a studio request proves who is making it.
 *
 * **The signed-in person's own token**, forwarded to the backend, which validates it against the
 * identity provider and decides authorization from its own records. That is the whole of what this
 * application contributes: proof of who is asking.
 *
 * It replaces a shared operator credential held here and attached to every studio call. That
 * arrangement kept the credential off the browser, which was the wrong thing to protect — the
 * authority it carried was applied to whoever happened to be asking, so anyone who could reach
 * `/studio` acted as the operator. Requests are now attributable to a person, and a person's
 * permissions are decided per person.
 *
 * The static credentials remain as a deliberate fallback for non-human callers: a CI job or a
 * migration script has no browser and cannot hold a session. They are used only when there is no
 * signed-in user, so a person's request can never silently borrow them.
 */
async function studioAuthorizationHeader(): Promise<string> {
  const token = await currentAccessToken()
  if (token) {
    return `Bearer ${token}`
  }

  const username = process.env.KNOWLEDGE_STUDIO_USERNAME
  const password = process.env.KNOWLEDGE_STUDIO_PASSWORD
  if (!username || !password) {
    throw new ApiRequestError(
      401,
      'studio',
      'NOT_SIGNED_IN',
      'Sign in to use studio features.',
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

  /** The most-read articles over a window. Empty until something has actually been read. */
  trending: (days = 7, limit = 6) =>
    request<TrendingArticle[]>('/api/articles/trending', { query: { days, limit } }),

  /**
   * Records one read. Fire-and-forget: a miscounted view is never worth delaying or failing a page.
   */
  recordArticleView: (slug: string) =>
    request<void>(`/api/articles/${encodeURIComponent(slug)}/view`, { init: { method: 'POST' } }),

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
    /** The caller's own account. Reachable even with no roles, which is how a new sign-in is
     *  told why the studio is empty rather than being shown an empty studio. */
    me: () => request<AccountModel>('/api/studio/me', { auth: true }),

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
