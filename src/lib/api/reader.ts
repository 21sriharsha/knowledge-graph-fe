import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { components } from "./schema";
import type { ArticleReadModel } from "@/lib/content/types";
import { backend, call } from "./server";
import { unavailable, type ApiResult } from "./result";

/**
 * Public read model access (X04). Each function is a `use cache` scope tagged so the backend's
 * revalidation webhook (BG-1) or a studio mutation can expire exactly what changed.
 *
 * Failure policy: "unavailable" results are thrown out of the cached scope (so an outage is never
 * cached) and turned back into a result by `readSafely`, which also opts the caller out of the static
 * shell via `connection()` so the error state renders at request time, not at build time.
 */

type S = components["schemas"];

export const TAGS = {
  articles: "articles",
  navigation: "navigation",
  graph: "graph",
  article: (slug: string) => `article:${slug}`,
  topic: (slug: string) => `topic:${slug}`,
  tag: (slug: string) => `tag:${slug}`,
  author: (slug: string) => `author:${slug}`,
} as const;

class UpstreamUnavailable extends Error {
  constructor(readonly requestId?: string) {
    super("upstream unavailable");
  }
}

function orThrow<T>(result: ApiResult<T>): ApiResult<T> {
  if (!result.ok && result.kind === "unavailable") throw new UpstreamUnavailable(result.requestId);
  return result;
}

export async function readSafely<T>(load: () => Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  let failure: UpstreamUnavailable | undefined;
  try {
    return await load();
  } catch (error) {
    if (!(error instanceof UpstreamUnavailable)) throw error;
    failure = error;
  }
  await connection();
  return unavailable(undefined, failure.requestId);
}

export async function getNavigation(): Promise<ApiResult<S["NavigationModel"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.navigation, TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/navigation")));
}

export async function getArticlesPage(page: number, size: number): Promise<ApiResult<S["PageResponseArticleReference"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(
    await call(requestId, () =>
      client.GET("/api/articles", { params: { query: { pageable: { page, size } } } }),
    ),
  );
}

export async function getTrending(days = 7, limit = 6): Promise<ApiResult<S["TrendingArticle"][]>> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/articles/trending", { params: { query: { days, limit } } })));
}

export async function getArticle(slug: string): Promise<ApiResult<ArticleReadModel>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.article(slug), TAGS.articles);
  const { client, requestId } = backend();
  const result = await call(requestId, () => client.GET("/api/articles/{slug}", { params: { path: { slug } } }));
  return orThrow(result as ApiResult<ArticleReadModel>);
}

export async function getGraphOverview(maxNodes = 40): Promise<ApiResult<S["GraphNeighbourhood"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.graph);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/graph/overview", { params: { query: { maxNodes } } })));
}

export async function getNeighbourhood(
  slug: string,
  depth: number,
  includeSuggestions: boolean,
): Promise<ApiResult<S["GraphNeighbourhood"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.graph, TAGS.article(slug));
  const { client, requestId } = backend();
  return orThrow(
    await call(requestId, () => client.GET("/api/graph", { params: { query: { slug, depth, includeSuggestions } } })),
  );
}

export async function getTopics(): Promise<ApiResult<S["TaxonomyListing"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.navigation);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/topics")));
}

export async function getTopic(slug: string): Promise<ApiResult<S["TopicReadModel"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.topic(slug), TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/topics/{slug}", { params: { path: { slug } } })));
}

export async function getTags(): Promise<ApiResult<S["TaxonomyListing"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.navigation);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/tags")));
}

export async function getTag(slug: string): Promise<ApiResult<S["TagReadModel"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.tag(slug), TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/tags/{slug}", { params: { path: { slug } } })));
}

export async function getAuthorPage(slug: string): Promise<ApiResult<S["AuthorReadModel"]>> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.author(slug), TAGS.articles);
  const { client, requestId } = backend();
  return orThrow(await call(requestId, () => client.GET("/api/authors/{slug}/page", { params: { path: { slug } } })));
}
