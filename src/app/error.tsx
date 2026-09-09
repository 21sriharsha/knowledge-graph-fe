'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * The last-resort error boundary.
 *
 * Deliberately vague about the cause: the digest identifies it in the server logs, and echoing an
 * internal message to a reader risks leaking detail while telling them nothing they can act on.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">
        This page could not be rendered. The content is unaffected — retrying usually works.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-foreground/20 bg-foreground px-3 py-1.5 text-sm text-background"
        >
          Try again
        </button>
        <Link href="/" className="text-sm underline underline-offset-4">
          Go home
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
    </div>
  )
}
