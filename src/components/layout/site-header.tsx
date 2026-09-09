import Link from 'next/link'
import { Suspense } from 'react'

import { SearchBox } from '@/components/search/search-box'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import type { NavigationModel } from '@/lib/types'

/**
 * The site header.
 *
 * Navigation comes from the backend's precomputed navigation model, so the links reflect what has
 * actually been published — topics with no articles never appear, and nobody has to maintain a menu
 * by hand.
 *
 * Search sits in the header rather than behind an icon: it is the primary discovery surface, and
 * hiding it behind a click would cost every search one.
 */
export function SiteHeader({ navigation }: { navigation: NavigationModel | null }) {
  const topics = navigation?.topics.slice(0, 5) ?? []

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 font-semibold tracking-tight">
          Knowledge
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/articles" className="text-muted-foreground hover:text-foreground">
            Articles
          </Link>
          <Link href="/topics" className="text-muted-foreground hover:text-foreground">
            Topics
          </Link>
          <Link href="/graph" className="text-muted-foreground hover:text-foreground">
            Graph
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              href={topic.path}
              className="hidden text-muted-foreground hover:text-foreground lg:inline"
            >
              {topic.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto w-full max-w-xs">
          {/* useSearchParams needs a Suspense boundary during prerender. */}
          <Suspense fallback={<div className="h-9 rounded-md border border-border" />}>
            <SearchBox />
          </Suspense>
        </div>

        <ThemeToggle />

        <Link
          href="/studio"
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
        >
          Studio
        </Link>
      </div>
    </header>
  )
}
