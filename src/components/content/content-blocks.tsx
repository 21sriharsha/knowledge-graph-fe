import Link from 'next/link'

import { MermaidDiagram } from '@/components/content/mermaid-diagram'
import type { ContentBlock, InlineContent, ListItem, TableRow } from '@/lib/types'

/**
 * Renders the backend's block tree.
 *
 * This is the reading experience, so it is the one place in the app where typography decisions
 * matter most. Everything here is a Server Component: an article body needs no client JavaScript,
 * and shipping some would be a cost paid on every page view for nothing.
 *
 * The tree is closed — the backend emits only the variants below, and raw HTML was already dropped
 * during ingestion. There is therefore no `dangerouslySetInnerHTML` anywhere in this file, and there
 * should never be one.
 */

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </>
  )
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return <Heading block={block} />

    case 'paragraph':
      return (
        <p className="my-5 leading-7 text-foreground/90">
          <Inlines content={block.content} />
        </p>
      )

    case 'code':
      // A diagram language is drawn rather than printed. Deciding that is a rendering concern, so
      // it lives here: the backend returns a code block with its language and no opinion about
      // what a reader should see.
      if (isDiagramLanguage(block.language)) {
        return <MermaidDiagram code={block.code} />
      }
      return (
        <figure className="my-6">
          {block.language ? (
            // The language is shown rather than used for highlighting: a label is honest and costs
            // nothing, whereas shipping a highlighter would be client JS on every article.
            <figcaption className="rounded-t-md border border-b-0 border-border bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
              {block.language}
            </figcaption>
          ) : null}
          <pre
            className={`overflow-x-auto border border-border bg-muted/50 p-4 text-sm leading-6 ${
              block.language ? 'rounded-b-md' : 'rounded-md'
            }`}
          >
            <code className="font-mono">{block.code}</code>
          </pre>
        </figure>
      )

    case 'quote':
      return (
        <blockquote className="my-6 border-l-2 border-border pl-5 text-foreground/75 italic">
          <ContentBlocks blocks={block.content} />
        </blockquote>
      )

    case 'list':
      return <List ordered={block.ordered} start={block.startNumber} items={block.items} />

    case 'table':
      return <Table header={block.header} rows={block.rows} />

    case 'thematicBreak':
      return <hr className="my-10 border-border" />

    default:
      // The union is exhaustive today. If the backend adds a block type, dropping it silently is
      // better than crashing an article page over one unfamiliar element.
      return null
  }
}

function Heading({
  block,
}: {
  block: Extract<ContentBlock, { type: 'heading' }>
}) {
  const children = <Inlines content={block.content} />

  // Anchors come from the backend so a deep link stays stable across a rendering rewrite.
  const common = 'group scroll-mt-24 font-semibold tracking-tight text-foreground'
  const anchor = (
    <a
      href={`#${block.anchorId}`}
      aria-label={`Link to section: ${block.text}`}
      className="ml-2 text-muted-foreground opacity-0 transition-none group-hover:opacity-100 focus-visible:opacity-100"
    >
      #
    </a>
  )

  switch (block.level) {
    case 1:
      return (
        <h2 id={block.anchorId} className={`${common} mt-10 mb-4 text-2xl`}>
          {children}
          {anchor}
        </h2>
      )
    case 2:
      return (
        <h3 id={block.anchorId} className={`${common} mt-9 mb-3 text-xl`}>
          {children}
          {anchor}
        </h3>
      )
    case 3:
      return (
        <h4 id={block.anchorId} className={`${common} mt-8 mb-3 text-lg`}>
          {children}
          {anchor}
        </h4>
      )
    default:
      return (
        <h5 id={block.anchorId} className={`${common} mt-6 mb-2 text-base`}>
          {children}
          {anchor}
        </h5>
      )
  }
}

function List({
  ordered,
  start,
  items,
}: {
  ordered: boolean
  start?: number | null
  items: ListItem[]
}) {
  const className = `my-5 space-y-2 pl-6 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-muted-foreground`
  const children = items.map((item, index) => (
    <li key={index} className="leading-7 [&>p]:my-0">
      <ContentBlocks blocks={item.content} />
    </li>
  ))

  return ordered ? (
    <ol className={className} start={start ?? undefined}>
      {children}
    </ol>
  ) : (
    <ul className={className}>{children}</ul>
  )
}

function Table({ header, rows }: { header: TableRow[]; rows: TableRow[] }) {
  return (
    // Tables scroll inside their own container so a wide one never makes the page scroll sideways.
    <div className="my-6 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-sm">
        {header.length > 0 && (
          <thead className="bg-muted/50">
            {header.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.cells.map((cell, cellIndex) => (
                  <th
                    key={cellIndex}
                    scope="col"
                    className="border-b border-border px-3 py-2 text-left font-semibold"
                    style={{ textAlign: cell.alignment ?? undefined }}
                  >
                    <Inlines content={cell.content} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-border last:border-0">
              {row.cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 align-top"
                  style={{ textAlign: cell.alignment ?? undefined }}
                >
                  <Inlines content={cell.content} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Inlines({ content }: { content: InlineContent[] }) {
  return (
    <>
      {content.map((node, index) => (
        <Inline key={index} node={node} />
      ))}
    </>
  )
}

function Inline({ node }: { node: InlineContent }) {
  switch (node.type) {
    case 'text':
      return <>{node.text}</>

    case 'styled':
      return node.style === 'STRONG' ? (
        <strong className="font-semibold">
          <Inlines content={node.children} />
        </strong>
      ) : (
        <em>
          <Inlines content={node.children} />
        </em>
      )

    case 'code':
      return (
        <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.875em]">
          {node.code}
        </code>
      )

    case 'externalLink':
      return (
        <a
          href={node.url}
          title={node.title ?? undefined}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          <Inlines content={node.children} />
        </a>
      )

    case 'internalLink':
      return <InternalLink node={node} />

    case 'image':
      return (
        // Deliberately a plain <img>: article images are arbitrary remote URLs from Markdown, and
        // next/image would need every author's host allow-listed in next.config before it rendered.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.url}
          alt={node.altText ?? ''}
          title={node.title ?? undefined}
          className="my-6 h-auto max-w-full rounded-md border border-border"
        />
      )

    case 'break':
      return node.hard ? <br /> : <> </>

    default:
      return null
  }
}

/**
 * An internal `[[wiki link]]`.
 *
 * An unresolved reference renders as visibly missing rather than as plain text. That is the honest
 * thing to show — the author wrote a link, and the target does not exist yet — and it is how a wiki
 * behaves. Silently flattening it to text would hide the author's intent from the reader and hide a
 * broken reference from whoever could fix it.
 */
function InternalLink({ node }: { node: Extract<InlineContent, { type: 'internalLink' }> }) {
  if (node.resolved) {
    return (
      <Link
        href={`/articles/${node.targetSlug}`}
        className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
      >
        {node.displayText}
      </Link>
    )
  }

  return (
    <span
      title={`"${node.targetReference}" has not been written yet`}
      // Not a link, because there is nothing to link to. Dotted underline plus the title attribute
      // carries the meaning; colour alone would fail FRONTEND-SPEC §12.
      className="cursor-help text-muted-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4"
    >
      {node.displayText}
      <span className="sr-only"> (article not written yet)</span>
    </span>
  )
}

/**
 * Whether a fence's language means "draw this".
 *
 * A small closed set rather than anything Mermaid might accept, so adding a renderer is a decision
 * someone makes here rather than a side effect of an author picking a word. `mmd` is the
 * conventional file extension and turns up in fences often enough to be worth honouring.
 */
function isDiagramLanguage(language: string | null | undefined): boolean {
  if (!language) return false
  const normalised = language.trim().toLowerCase()
  return normalised === 'mermaid' || normalised === 'mmd'
}
