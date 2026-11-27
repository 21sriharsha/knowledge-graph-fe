/**
 * URL allow-listing for content links and images (F03-FR-2/FR-4). Content comes from authors' Git
 * repositories, so `javascript:`/`data:` and protocol-relative URLs are never rendered as links.
 */
const LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

export function safeExternalHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return LINK_PROTOCOLS.has(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** Images: backend asset paths (`/api/assets/…`, same-origin via rewrite) or absolute https URLs. */
export function safeImageSrc(url: string | undefined): string | null {
  if (!url) return null;
  if (/^\/api\/assets\/[A-Za-z0-9._~\-/%]+$/.test(url) && !url.includes("..")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}
