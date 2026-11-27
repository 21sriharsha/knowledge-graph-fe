import type { MetadataRoute } from "next";
import { getArticlesPage, getNavigation, getTags, readSafely } from "@/lib/api/reader";
import { clientEnv } from "@/lib/env/client";

/** sitemap.xml (X04-FR-7) from the public read models. Pages through all published articles. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = clientEnv().NEXT_PUBLIC_SITE_URL;
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "daily", priority: 1 }];

  for (let page = 0; page < 200; page++) {
    const result = await readSafely(() => getArticlesPage(page, 50));
    if (!result.ok) break;
    for (const a of result.data.content ?? []) if (a.slug) entries.push({ url: `${base}/articles/${a.slug}`, changeFrequency: "weekly" });
    if (result.data.last !== false) break;
  }

  const [nav, tags] = await Promise.all([readSafely(getNavigation), readSafely(getTags)]);
  if (nav.ok) {
    for (const t of nav.data.topics ?? []) if (t.slug) entries.push({ url: `${base}/topics/${t.slug}` });
    for (const a of nav.data.authors ?? []) if (a.slug) entries.push({ url: `${base}/authors/${a.slug}` });
  }
  if (tags.ok) for (const t of tags.data.entries ?? []) if (t.slug) entries.push({ url: `${base}/tags/${t.slug}` });
  return entries;
}
