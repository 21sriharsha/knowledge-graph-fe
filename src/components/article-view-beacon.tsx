'use client'

import { useEffect, useRef } from 'react'

/**
 * Reports that this article was read.
 *
 * The only piece of client JavaScript on the article page, and it renders nothing. It exists
 * because a server-side count would count prefetches and crawlers as readers.
 *
 * Fires once per mount, which is once per navigation to the article — including a client-side
 * navigation from the graph or a search result, where no new document is requested and no
 * server-side signal exists at all.
 */
export function ArticleViewBeacon({ slug }: { slug: string }) {
  const reported = useRef<string | null>(null)

  useEffect(() => {
    // Guarded rather than relying on the dependency array: React invokes effects twice in
    // development, and a view is not something to record twice because of a debugging aid.
    if (reported.current === slug) return
    reported.current = slug

    // keepalive so the request survives the reader immediately navigating away — which, for a
    // page they bounced off, is exactly the read most likely to be lost.
    fetch(`/api/articles/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => {
      // Nothing on the page depends on this. A failed count is not the reader's problem.
    })
  }, [slug])

  return null
}
