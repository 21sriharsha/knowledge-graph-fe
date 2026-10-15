'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { useIsDark } from '@/components/theme/use-is-dark'

type Status = 'pending' | 'rendered' | 'failed'

/**
 * A diagram written as code in the article's Markdown.
 *
 * Authors write ```mermaid fences and get a rendered diagram. Nothing changed in the backend to
 * support this: the fence already arrives as a code block carrying its language, and deciding that a
 * particular language should be drawn rather than printed is a rendering concern — the backend
 * returns structure and never markup.
 *
 * Three things this is careful about:
 *
 * 1. **The library loads only when a diagram exists.** Mermaid is megabytes; importing it in the
 *    module graph would put it in the bundle for every article, almost none of which have diagrams.
 * 2. **Diagram source is untrusted.** It comes from a Markdown file in somebody's repository, which
 *    is exactly the input the platform already refuses to trust — raw HTML is stripped during
 *    ingestion for the same reason. `securityLevel: 'strict'` disables HTML labels and script
 *    execution inside diagrams, which is what makes injecting the rendered SVG defensible.
 * 3. **A diagram that will not parse shows its source instead.** A mistyped arrow should cost the
 *    reader a diagram, never the rest of the page, and the author needs to see what they wrote to
 *    fix it.
 */
export function MermaidDiagram({ code }: { code: string }) {
  const dark = useIsDark()
  const [status, setStatus] = useState<Status>('pending')
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Mermaid needs a DOM id per render, and it must be stable across re-renders of the same diagram.
  const domId = `mermaid-${useId().replace(/:/g, '')}`

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false, // Nothing scans the document; this component owns its own rendering.
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default',
          fontFamily: 'inherit',
        })
        const { svg } = await mermaid.render(domId, code)
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
        setStatus('rendered')
      } catch (cause) {
        if (cancelled) return
        // Mermaid leaves its failed attempt in the document; without this a broken diagram leaves a
        // stray error element sitting in the article.
        document.getElementById(domId)?.remove()
        setError(cause instanceof Error ? cause.message : 'Could not render this diagram.')
        setStatus('failed')
      }
    }

    render()
    return () => {
      cancelled = true
    }
    // Re-renders on theme change: Mermaid bakes colours into the SVG, so a diagram rendered in the
    // light theme is unreadable after switching to dark.
  }, [code, dark, domId])

  if (status === 'failed') {
    return (
      <figure className="my-6">
        <div
          role="alert"
          className="rounded-t-md border border-b-0 border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
        >
          This diagram could not be drawn{error ? `: ${error}` : '.'} Its source is below.
        </div>
        <pre className="overflow-x-auto rounded-b-md border border-border bg-muted p-4 text-sm">
          <code className="font-mono">{code}</code>
        </pre>
      </figure>
    )
  }

  return (
    <figure className="my-6">
      <div
        ref={containerRef}
        // Rendered SVG is not readable content; the source below is the accessible equivalent.
        aria-hidden="true"
        className="overflow-x-auto rounded-md border border-border bg-card p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      />
      {status === 'pending' ? (
        <p className="px-4 py-2 text-xs text-muted-foreground">Drawing diagram…</p>
      ) : null}
      <details className="mt-2">
        {/* A diagram is a picture, and a picture of a graph is unreadable to a screen reader. The
            source is the text alternative, and it is the same text the author wrote. */}
        <summary className="cursor-pointer text-xs text-muted-foreground">Diagram source</summary>
        <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-muted p-4 text-sm">
          <code className="font-mono">{code}</code>
        </pre>
      </details>
    </figure>
  )
}
