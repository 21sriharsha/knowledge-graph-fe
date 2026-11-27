import "server-only";
import { cacheLife } from "next/cache";
import { codeToTokens, type BundledLanguage } from "shiki";

export type HighlightedLine = { content: string; style?: Record<string, string> }[];

/**
 * Shiki highlighting as plain serializable tokens. A `use cache` scope because highlighting is a pure
 * function of (code, language) — and Shiki reads the clock internally, which Cache Components only
 * allows inside a cached scope during prerendering.
 */
export async function highlight(code: string, language: string): Promise<HighlightedLine[]> {
  "use cache";
  cacheLife("max");
  const source = code.replace(/\n$/, "");
  try {
    const result = await codeToTokens(source, {
      lang: (language || "text") as BundledLanguage,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    });
    return result.tokens.map((line) =>
      line.map((token) => ({ content: token.content, style: token.htmlStyle as Record<string, string> | undefined })),
    );
  } catch {
    // Unknown language: plain text lines.
    return source.split("\n").map((line) => [{ content: line }]);
  }
}
