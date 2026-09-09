import type { Metadata } from 'next'
import Link from 'next/link'

import { SourceForm } from '@/components/studio/source-form'

export const metadata: Metadata = { title: 'Connect a repository' }

export default function NewSourcePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/studio" className="text-sm text-muted-foreground hover:text-foreground">
        ← Studio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Connect a repository</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Markdown committed to this repository becomes articles. Frontmatter supplies the title,
        author, tags and topics; <code className="rounded border border-border bg-muted px-1">[[wiki links]]</code>{' '}
        become connections in the graph.
      </p>
      <SourceForm />
    </div>
  )
}
