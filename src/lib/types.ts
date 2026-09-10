/**
 * The backend's read models, mirrored as TypeScript types.
 *
 * Hand-written against `/v3/api-docs` rather than generated, because the generated output for the
 * recursive `ContentBlock` / `InlineContent` trees is unreadable and those two types are the ones a
 * developer actually reads while writing the renderer.
 *
 * These are a *mirror*, not a source of truth. The backend owns these shapes; when it changes, this
 * file follows. Nothing here may add a field the API does not return.
 */

// ---------------------------------------------------------------------------
// Article body: a structured block tree, not HTML.
//
// The backend deliberately emits no markup. That keeps presentation in the frontend and, just as
// importantly, keeps the frontend from becoming a sanitisation boundary: raw HTML in the source
// Markdown is dropped during ingestion and reported as a diagnostic, so nothing arriving here needs
// escaping beyond what React already does.
// ---------------------------------------------------------------------------

export type InlineContent =
  | { type: 'text'; text: string }
  | { type: 'styled'; style: 'EMPHASIS' | 'STRONG'; children: InlineContent[] }
  | { type: 'code'; code: string }
  | { type: 'externalLink'; url: string; title?: string | null; children: InlineContent[] }
  | {
      type: 'internalLink'
      targetReference: string
      targetSlug: string
      displayText: string
      /** False when no article with that slug exists yet. The UI must show this, not hide it. */
      resolved: boolean
    }
  | { type: 'image'; url: string; altText?: string | null; title?: string | null }
  | { type: 'break'; hard: boolean }

export interface TableCell {
  content: InlineContent[]
  alignment?: 'left' | 'center' | 'right' | null
}

export interface TableRow {
  cells: TableCell[]
}

export interface ListItem {
  content: ContentBlock[]
}

export type ContentBlock =
  | { type: 'heading'; level: number; anchorId: string; text: string; content: InlineContent[] }
  | { type: 'paragraph'; content: InlineContent[] }
  | { type: 'code'; language?: string | null; code: string }
  | { type: 'quote'; content: ContentBlock[] }
  | { type: 'list'; ordered: boolean; startNumber?: number | null; items: ListItem[] }
  | { type: 'table'; header: TableRow[]; rows: TableRow[] }
  | { type: 'thematicBreak' }

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

export interface DocumentHeading {
  level: number
  anchorId: string
  text: string
}

export interface ArticleReference {
  slug: string
  title: string
  summary?: string | null
  authorName?: string | null
}

export interface TaxonomyReference {
  slug: string
  name: string
}

export interface BreadcrumbEntry {
  label: string
  path: string
}

export interface AuthorSummaryModel {
  slug?: string | null
  displayName: string
  avatarUrl?: string | null
}

export interface GraphNode {
  id: string
  slug: string
  title: string
  /** Hops from the article the neighbourhood was built around. */
  distance: number
  /** Primary topic, used to colour and group nodes by subject. Null when the article has none. */
  topic?: string | null
}

export interface GraphEdge {
  sourceId: string
  targetId: string
  label?: string | null
  /** True when a person wrote this link; false when the platform inferred it. */
  authored: boolean
  kind: string
  weight: number
}

export interface GraphNeighbourhood {
  nodes: GraphNode[]
  edges: GraphEdge[]
  depth: number
  /** A limit was reached, so the picture is partial. Say so rather than implying completeness. */
  truncated: boolean
}

export interface ArticleReadModel {
  slug: string
  title: string
  summary?: string | null
  body: ContentBlock[]
  outline: DocumentHeading[]
  author: AuthorSummaryModel
  topics: TaxonomyReference[]
  tags: TaxonomyReference[]
  relatedArticles: ArticleReference[]
  backlinks: ArticleReference[]
  /** References the author wrote whose targets do not exist. Surfaced, never hidden. */
  unresolvedReferences: string[]
  breadcrumbs: BreadcrumbEntry[]
  previousArticle?: ArticleReference | null
  nextArticle?: ArticleReference | null
  graphContext: GraphNeighbourhood
  wordCount: number
  readingTimeMinutes: number
  publishedAt?: string | null
  updatedAt?: string | null
}

export interface AuthorReadModel {
  slug: string
  displayName: string
  biography?: string | null
  avatarUrl?: string | null
  articles: ArticleReference[]
  topics: TaxonomyReference[]
  articleCount: number
  joinedAt?: string | null
}

export interface TopicReadModel {
  slug: string
  name: string
  description?: string | null
  articles: ArticleReference[]
  articleCount: number
}

export interface TagReadModel {
  slug: string
  name: string
  articles: ArticleReference[]
  articleCount: number
}

export interface TaxonomyEntry {
  slug: string
  name: string
  description?: string | null
  articleCount: number
}

export interface TaxonomyListing {
  entries: TaxonomyEntry[]
}

export interface NavigationEntry {
  label: string
  slug: string
  path: string
  articleCount: number
}

export interface NavigationModel {
  topics: NavigationEntry[]
  authors: NavigationEntry[]
  publishedArticleCount: number
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchMode = 'LEXICAL' | 'SEMANTIC' | 'HYBRID'

export interface ScoreExplanation {
  lexical: number
  semantic: number
  authorMatch: number
  topicMatch: number
  tagMatch: number
  recency: number
  /** Which retrieval families proposed this hit: FULL_TEXT, VECTOR, METADATA. */
  matchedBy: string[]
}

export interface SearchHit {
  articleId: string
  slug: string
  title: string
  summary?: string | null
  authorSlug?: string | null
  authorName?: string | null
  topics: string[]
  tags: string[]
  publishedAt?: string | null
  readingTimeMinutes: number
  score: number
  explanation: ScoreExplanation
}

/**
 * How the backend read the query.
 *
 * `authorResolved` is the field that turns an empty result set from a dead end into an explanation:
 * an author was named and matched nobody.
 */
export interface SearchInterpretation {
  queryText: string
  author?: string | null
  topics: string[]
  tags: string[]
  authorResolved: boolean
}

export interface SearchResponse {
  results: SearchHit[]
  totalResults: number
  page: number
  size: number
  mode: SearchMode
  usedQueryUnderstanding: boolean
  interpretation: SearchInterpretation
  tookMillis: number
}

/**
 * One row in the search box's suggestion list.
 *
 * Deliberately thinner than {@link SearchHit}: the dropdown shows a title and enough context to
 * tell two similar titles apart, and scoring internals have no business on the wire for a
 * keystroke-rate request.
 */
export interface SearchSuggestion {
  slug: string
  title: string
  authorName?: string | null
  topic?: string | null
}

/**
 * An article and how often it was read in the requested window.
 *
 * `views` is carried so the page can say *why* something is trending. A ranked list that will not
 * show its working asks the reader to take it on faith.
 */
export interface TrendingArticle {
  slug: string
  title: string
  authorName?: string | null
  topic?: string | null
  views: number
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[]
  /** The backend could not be reached. Typing and submitting still work. */
  unavailable?: boolean
}

// ---------------------------------------------------------------------------
// Studio
// ---------------------------------------------------------------------------

export type PlatformRole = 'AUTHOR' | 'ADMIN'

/**
 * The signed-in account.
 *
 * `authorId` is null until an administrator links the account to a byline, and `roles` is empty on
 * a first sign-in. Both are normal states, and the studio has to render an explanation rather than
 * an empty page when they occur.
 */
export interface AccountModel {
  id?: string | null
  email?: string | null
  displayName?: string | null
  roles: PlatformRole[]
  authorId?: string | null
}

export type SourceType = 'GITHUB' | 'GITLAB' | 'AZURE_DEVOPS'

export interface SourceResponse {
  id: string
  sourceType: SourceType
  displayName: string
  owner: string
  repository: string
  project?: string | null
  defaultBranch: string
  contentPath: string
  apiBaseUrl?: string | null
  ownerAuthorId?: string | null
  active: boolean
  /** Booleans only — no endpoint ever returns a stored credential. */
  accessTokenConfigured: boolean
  webhookSecretConfigured: boolean
  lastSyncedRevision?: string | null
  lastSyncedAt?: string | null
  createdAt: string
}

export type IngestionState = 'RUNNING' | 'SUCCEEDED' | 'PARTIALLY_SUCCEEDED' | 'FAILED'
export type IngestionSeverity = 'INFO' | 'WARNING' | 'ERROR'

export interface IngestionDiagnostic {
  sourcePath?: string | null
  articleSlug?: string | null
  severity: IngestionSeverity
  /** Stable identifier to branch on: UNRESOLVED_LINK, MISSING_TITLE, RAW_HTML_DROPPED, … */
  code: string
  message: string
  occurredAt: string
}

export interface IngestionRunResponse {
  id: string
  correlationId: string
  repositoryId?: string | null
  trigger: 'WEBHOOK' | 'MANUAL' | 'SCHEDULED'
  state: IngestionState
  requestedRevision?: string | null
  documentsTotal: number
  documentsSucceeded: number
  /** Unchanged since the last run. A healthy outcome — never style this as a problem. */
  documentsSkipped: number
  documentsFailed: number
  startedAt: string
  finishedAt?: string | null
  diagnostics: IngestionDiagnostic[]
}

export interface ArticleResponse {
  id: string
  slug: string
  title: string
  summary?: string | null
  publicationState: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  authorId: string
  tags: string[]
  topics: string[]
  wordCount: number
  readingTimeMinutes: number
  revisionNumber: number
  sourcePath?: string | null
  sourceRevision?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

/** The single error shape every endpoint returns. Branch on `code`, never on `message`. */
export interface ApiError {
  timestamp: string
  status: number
  code: string
  message: string
  path: string
  violations: { field: string; message: string }[]
}
