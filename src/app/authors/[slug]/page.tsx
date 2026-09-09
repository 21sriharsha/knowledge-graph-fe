import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ArticleCardList } from '@/components/article-card'
import { ApiRequestError, api } from '@/lib/api'

export async function generateMetadata(props: PageProps<'/authors/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  try {
    const author = await api.authorPage(slug)
    return { title: author.displayName, description: author.biography ?? undefined }
  } catch {
    return { title: slug }
  }
}

export default async function AuthorPage(props: PageProps<'/authors/[slug]'>) {
  const { slug } = await props.params

  try {
    const author = await api.authorPage(slug)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{author.displayName}</h1>
        {author.biography ? (
          <p className="mt-2 max-w-prose text-muted-foreground">{author.biography}</p>
        ) : null}
        <p className="mt-1.5 text-sm text-muted-foreground">
          {author.articleCount} article{author.articleCount === 1 ? '' : 's'}
        </p>

        {author.topics.length > 0 ? (
          <div className="mt-4">
            <h2 className="sr-only">Topics this author writes about</h2>
            <div className="flex flex-wrap gap-1.5">
              {/* Derived from what they have actually published, so it cannot drift from reality. */}
              {author.topics.map((topic) => (
                <Link
                  key={topic.slug}
                  href={`/topics/${topic.slug}`}
                  className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
                >
                  {topic.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <ArticleCardList
            articles={author.articles}
            emptyMessage="This author has nothing published yet."
          />
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    throw error
  }
}
