import Link from 'next/link'

import type { NavigationModel } from '@/lib/types'

export function SiteFooter({ navigation }: { navigation: NavigationModel | null }) {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span>
            {navigation
              ? `${navigation.publishedArticleCount} published article${
                  navigation.publishedArticleCount === 1 ? '' : 's'
                }`
              : 'Knowledge platform'}
          </span>
          <Link href="/articles" className="hover:text-foreground">
            All articles
          </Link>
          <Link href="/topics" className="hover:text-foreground">
            Topics
          </Link>
          <Link href="/graph" className="hover:text-foreground">
            Graph
          </Link>
        </div>
      </div>
    </footer>
  )
}
