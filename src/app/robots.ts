import type { MetadataRoute } from "next";
import { clientEnv } from "@/lib/env/client";

/** robots.txt (X04-FR-7): index the reader, never studio/auth/API. Non-production disallows everything. */
export default function robots(): MetadataRoute.Robots {
  const env = clientEnv();
  if (env.NEXT_PUBLIC_APP_ENV !== "production") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/studio", "/signin", "/auth", "/api"] }],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
