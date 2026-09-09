/**
 * The loading state for search, and deliberately only for search.
 *
 * A `loading.tsx` opens a Suspense boundary, which makes Next.js begin streaming — and commit a
 * `200` — before the page has rendered. On a route that can call `notFound()` that is actively
 * wrong: the not-found page renders, but the status stays 200, so crawlers index a missing article
 * as a real one. This file therefore lives here rather than at the app root, because search always
 * has a valid response and never 404s.
 *
 * A static skeleton, not a spinner: it holds the shape of the page so the layout does not jump, and
 * adds no motion for its own sake.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="mt-4 h-4 w-full rounded bg-muted" />
      <div className="mt-2 h-4 w-5/6 rounded bg-muted" />
      <div className="mt-8 space-y-4">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="space-y-2 border-b border-border pb-4">
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
