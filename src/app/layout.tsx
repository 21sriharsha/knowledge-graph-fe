import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/layout/Providers";
import { clientEnv } from "@/lib/env/client";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });
const serif = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv().NEXT_PUBLIC_SITE_URL),
  title: { default: "Knowledge", template: "%s · Knowledge" },
  description: "Articles that link to each other — read, follow the connections, explore the graph.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Pre-paint theme script (modern-web-guidance: dark-mode-toggle). It ONLY applies the stored scheme
 * override to <meta name="color-scheme"> and the reading-mode flag (light scheme only) before first
 * paint, to avoid a flash. Static constant — no user data is interpolated. Everything else about the
 * toggles loads later as normal client code.
 */
const THEME_SCRIPT = `try{var m=document.querySelector('meta[name="color-scheme"]');var s=localStorage.getItem("color-scheme");if(s==="light"||s==="dark"){m.content=s}var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(!d&&localStorage.getItem("reading-mode")==="on"){document.documentElement.dataset.reading="on"}}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="sr-only" href="#main">
          Skip to content
        </a>
        <Providers>
          <Suspense fallback={<div style={{ height: "var(--hdr)" }} />}>
            <Header />
          </Suspense>
          {children}
        </Providers>
      </body>
    </html>
  );
}
