import { highlight } from "@/lib/content/highlight";
import { CopyButton } from "./CopyButton";
import { MermaidDiagram } from "./MermaidDiagram";
import styles from "./content.module.css";

/**
 * Code block (F03-FR-1). Highlighted on the server with Shiki TOKENS rendered as React spans — no HTML
 * string is ever injected (CLAUDE.md). Dual themes via CSS variables (--shiki-light / --shiki-dark)
 * resolved with light-dark() in CSS, so it follows the colour scheme without client JS.
 * Mermaid blocks render as diagrams client-side, with the source as the accessible fallback.
 */
export async function CodeBlock({ code, language, id }: { code: string; language?: string; id: string }) {
  const lang = (language ?? "").toLowerCase();
  if (lang === "mermaid") return <MermaidDiagram code={code} id={id} />;

  const lines = await highlight(code, lang);

  return (
    <figure className={styles.code} data-testid="code-block">
      <figcaption className={styles.codeBar}>
        <span className={styles.codeLang}>{lang || "text"}</span>
        <CopyButton targetId={id} label={`Copy ${lang || "code"} snippet`} />
      </figcaption>
      <pre tabIndex={0} aria-label={`${lang || "Code"} example`}>
        <code id={id}>
          {lines.map((line, i) => (
            <span key={i} className={styles.line}>
              {line.map((token, j) => (
                <span key={j} style={token.style}>
                  {token.content}
                </span>
              ))}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
