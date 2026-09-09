import { api } from '@/lib/api'

/**
 * Records that an article was read.
 *
 * Counting happens here, from the browser, rather than when the backend serves the read model —
 * and the difference matters. Every page is server-rendered, so a backend read happens for
 * prefetches, crawlers and link unfurlers alike; counting those would make "trending" mean "what
 * robots visited". Requiring a browser to run a line of JavaScript is a crude filter, but it is the
 * difference between counting readers and counting requests.
 *
 * Readers without JavaScript therefore go uncounted. That is the honest trade: undercounting some
 * real reads is better than confidently reporting a number made mostly of automated traffic.
 */
export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  try {
    await api.recordArticleView(slug)
  } catch {
    // Deliberately swallowed. The reader already has the article; this is bookkeeping behind it,
    // and nothing about the page should change because a counter did not increment.
  }
  return new Response(null, { status: 202 })
}
