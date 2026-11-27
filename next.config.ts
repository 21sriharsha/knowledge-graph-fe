import type { NextConfig } from "next";

/**
 * Article images arrive as `/api/assets/{repositoryId}/…` paths (ImageReference.url). The rewrite
 * serves them from our own origin by proxying to the backend server-side, so the browser never needs
 * the backend host (ADR 0002, X04-FR-8). Only this public prefix is proxied.
 */
const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
const isDev = process.env.NODE_ENV === "development";
const https = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://");

const origin = (url?: string) => {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Content-Security-Policy (W6 hardening).
 * Trade-off: `script-src` allows 'unsafe-inline' because Next.js streams inline RSC payload scripts and
 * the pre-paint theme script; a nonce-based CSP would make every page dynamic (nonces are per request)
 * and lose the static shell + tag caching the reader relies on (ADR 0001). Everything else is locked
 * down: no third-party scripts, no framing, no plugins, same-origin forms, explicit connect targets.
 */
const connect = ["'self'", origin(process.env.NEXT_PUBLIC_SUPABASE_URL), origin(process.env.NEXT_PUBLIC_SENTRY_DSN) && "https://*.ingest.sentry.io", isDev && "ws:"].filter(Boolean);
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  `connect-src ${connect.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(https ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(https ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["pino"],
  async rewrites() {
    return apiBase ? [{ source: "/api/assets/:path*", destination: `${apiBase}/api/assets/:path*` }] : [];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
