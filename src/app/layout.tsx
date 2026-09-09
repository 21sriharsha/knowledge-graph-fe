import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { SiteFooter } from '@/components/layout/site-footer'
import { ThemeScript } from '@/components/theme/theme-script'
import { SiteHeader } from '@/components/layout/site-header'
import { api } from '@/lib/api'
import type { NavigationModel } from '@/lib/types'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * Every route in this application renders live backend data, so none of it may be baked at build
 * time.
 *
 * Next.js prerenders a route when its fetches complete before any request-time API is touched — and
 * most pages here do exactly that, so `/`, `/topics` and `/studio` were being frozen into the build
 * output. A newly published article would then never appear, and the studio would serve one
 * operator's data to everyone.
 *
 * Declared once on the root layout rather than repeated per page: the property is true of the whole
 * application, and stating it in one place means a new route cannot forget it. Freshness is the
 * backend's to decide (FRONTEND-SPEC §11) — it already caches read models and invalidates them on
 * ingestion, so there is nothing for the frontend to add beyond staying out of the way.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'Knowledge',
    template: '%s · Knowledge',
  },
  description:
    'A connected, searchable knowledge base of durable technical writing.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Fetched once for the whole shell rather than per page. The backend precomputes and caches this,
  // so it is one cheap request; failing it must not take the site down, so a broken navigation
  // degrades to no navigation and every page still renders.
  let navigation: NavigationModel | null = null
  try {
    navigation = await api.navigation()
  } catch {
    navigation = null
  }

  return (
    // suppressHydrationWarning: the theme script sets a class on <html> before React hydrates, so
    // the server and client markup differ here by design.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-background focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader navigation={navigation} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter navigation={navigation} />
      </body>
    </html>
  )
}
