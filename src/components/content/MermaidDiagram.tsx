"use client";

/**
 * Mermaid diagram (content includes ```mermaid blocks). Mermaid is ~1 MB, so it is imported only when
 * a diagram scrolls near the viewport. securityLevel "strict" disables HTML labels and click handlers
 * in diagram source (content is author-controlled). The source stays available in a disclosure and is
 * shown as-is if rendering fails.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./content.module.css";

type State = { status: "idle" } | { status: "ready"; svg: string } | { status: "failed" };

export function MermaidDiagram({ code, id }: { code: string; id: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const render = async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')?.content ?? "light dark";
        const dark =
          !document.documentElement.dataset.reading &&
          (meta === "dark" || (meta === "light dark" && window.matchMedia("(prefers-color-scheme: dark)").matches));
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "neutral", fontFamily: "inherit" });
        const { svg } = await mermaid.render(`${id}-svg`, code);
        if (!cancelled) setState({ status: "ready", svg });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void render();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [code, id]);

  return (
    <figure className={styles.diagram} data-testid="mermaid-diagram">
      {state.status === "ready" ? (
        // Mermaid output in strict mode: sanitized SVG produced locally from author content (DOMPurify inside mermaid).
        <div ref={host} className={styles.diagramSvg} role="img" aria-label="Diagram" dangerouslySetInnerHTML={{ __html: state.svg }} />
      ) : (
        <div ref={host} className={styles.diagramPlaceholder} aria-hidden={state.status !== "failed"}>
          {state.status === "failed" ? "This diagram couldn't be rendered; its source is below." : "Loading diagram…"}
        </div>
      )}
      <details className={styles.diagramSource} open={state.status === "failed"}>
        <summary>Diagram source</summary>
        <pre>
          <code id={id}>{code}</code>
        </pre>
      </details>
    </figure>
  );
}
