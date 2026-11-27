import { Fragment } from "react";
import type { Block, Inline } from "@/lib/content/types";
import { inlineText } from "@/lib/content/types";
import { safeExternalHref, safeImageSrc } from "@/lib/content/safe-url";
import { logger } from "@/lib/telemetry/logger";
import { CodeBlock } from "./CodeBlock";
import { ArticleLink } from "./ArticleLink";
import styles from "./content.module.css";

/**
 * Renders the backend's typed content blocks (F03-FR-1…4). Exhaustive switches mean a new block type
 * is a type error; at runtime an unknown type renders nothing and logs one WARN (F03-FR-3).
 * No HTML strings anywhere.
 */
type Ctx = { slug: string; title: string; warned: Set<string> };

export function ArticleBody({ blocks, slug, title }: { blocks: Block[]; slug: string; title: string }) {
  const ctx: Ctx = { slug, title, warned: new Set() };
  // The body repeats the title as its first h1; the page header already shows it.
  const first = blocks[0];
  const body =
    first?.type === "heading" && first.level === 1 && (first.text ?? inlineText(first.content)).trim().toLowerCase() === title.trim().toLowerCase()
      ? blocks.slice(1)
      : blocks;
  return (
    <div className={styles.prose} data-testid="article-body">
      {body.map((block, i) => (
        <BlockView key={i} block={block} ctx={ctx} path={String(i)} />
      ))}
    </div>
  );
}

function warnOnce(ctx: Ctx, kind: string, type: unknown) {
  const key = `${kind}:${String(type)}`;
  if (ctx.warned.has(key)) return;
  ctx.warned.add(key);
  logger.warn({ slug: ctx.slug, kind, type: String(type) }, "content.unknown_type");
}

function BlockView({ block, ctx, path }: { block: Block; ctx: Ctx; path: string }): React.ReactNode {
  switch (block.type) {
    case "heading": {
      // Page title is the only h1; content headings start at h2 (F03 accessibility).
      const level = Math.min(6, Math.max(2, block.level ?? 2)) as 2 | 3 | 4 | 5 | 6;
      const Tag = `h${level}` as const;
      return (
        <Tag id={block.anchorId} tabIndex={-1}>
          <Inlines nodes={block.content} ctx={ctx} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p>
          <Inlines nodes={block.content} ctx={ctx} />
        </p>
      );
    case "code":
      return <CodeBlock code={block.code ?? ""} language={block.language} id={`code-${ctx.slug}-${path}`} />;
    case "quote":
      return (
        <blockquote>
          {(block.content ?? []).map((child, i) => (
            <BlockView key={i} block={child} ctx={ctx} path={`${path}-${i}`} />
          ))}
        </blockquote>
      );
    case "list": {
      const items = (block.items ?? []).map((item, i) => (
        <li key={i}>
          {(item.content ?? []).map((child, j) =>
            // Tight lists: a single paragraph renders inline without <p> spacing.
            child.type === "paragraph" && (item.content?.length ?? 0) === 1 ? (
              <Inlines key={j} nodes={child.content} ctx={ctx} />
            ) : (
              <BlockView key={j} block={child} ctx={ctx} path={`${path}-${i}-${j}`} />
            ),
          )}
        </li>
      ));
      return block.ordered ? <ol start={block.startNumber ?? 1}>{items}</ol> : <ul>{items}</ul>;
    }
    case "table":
      return (
        <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Table">
          <table>
            {block.header?.length ? (
              <thead>
                {block.header.map((row, i) => (
                  <tr key={i}>
                    {(row.cells ?? []).map((cell, j) => (
                      <th key={j} scope="col" style={{ textAlign: align(cell.alignment) }}>
                        <Inlines nodes={cell.content} ctx={ctx} />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
            ) : null}
            <tbody>
              {(block.rows ?? []).map((row, i) => (
                <tr key={i}>
                  {(row.cells ?? []).map((cell, j) => (
                    <td key={j} style={{ textAlign: align(cell.alignment) }}>
                      <Inlines nodes={cell.content} ctx={ctx} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "thematicBreak":
      return <hr />;
    default: {
      const unknown: never = block;
      warnOnce(ctx, "block", (unknown as { type?: string }).type);
      return null;
    }
  }
}

function align(value: string | undefined): React.CSSProperties["textAlign"] {
  const v = value?.toLowerCase();
  return v === "center" || v === "right" || v === "left" ? v : undefined;
}

function Inlines({ nodes, ctx }: { nodes: Inline[] | undefined; ctx: Ctx }) {
  return (
    <>
      {(nodes ?? []).map((node, i) => (
        <Fragment key={i}>{renderInline(node, ctx)}</Fragment>
      ))}
    </>
  );
}

function renderInline(node: Inline, ctx: Ctx): React.ReactNode {
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "styled": {
      const children = <Inlines nodes={node.children} ctx={ctx} />;
      return node.style === "STRONG" ? <strong>{children}</strong> : <em>{children}</em>;
    }
    case "code":
      return <code className={styles.inlineCode}>{node.code}</code>;
    case "externalLink": {
      const href = safeExternalHref(node.url);
      const label = node.title || node.url;
      if (!href) return label;
      return (
        <a href={href} rel="noopener noreferrer" className={styles.external}>
          {label}
          <span className="sr-only"> (external link)</span>
        </a>
      );
    }
    case "internalLink": {
      const label = node.displayText || node.targetReference || node.targetSlug;
      if (node.resolved && node.targetSlug) return <ArticleLink slug={node.targetSlug}>{label}</ArticleLink>;
      return (
        <span className={styles.unresolved} title="Not written yet" data-testid="unresolved-link">
          {label}
        </span>
      );
    }
    case "image": {
      const src = safeImageSrc(node.url);
      if (!src) return null;
      // Content images: dimensions unknown, so a plain lazy <img> (no layout guess) rather than next/image.
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={node.altText ?? ""} title={node.title} loading="lazy" decoding="async" className={styles.image} />;
    }
    case "break":
      return node.hard ? <br /> : " ";
    default: {
      const unknown: never = node;
      warnOnce(ctx, "inline", (unknown as { type?: string }).type);
      return null;
    }
  }
}

