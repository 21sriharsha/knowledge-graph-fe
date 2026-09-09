import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleCardList } from '@/components/article-card'
import { ApiRequestError, api } from '@/lib/api'

export async function generateMetadata(props: PageProps<'/tags/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  try {
    const tag = await api.tag(slug)
    return { title: `#${tag.name}` }
  } catch {
    return { title: slug }
  }
}

export default async function TagPage(props: PageProps<'/tags/[slug]'>) {
  const { slug } = await props.params

  try {
    const tag = await api.tag(slug)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tag</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{tag.name}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {tag.articleCount} article{tag.articleCount === 1 ? '' : 's'}
        </p>
        <div className="mt-6">
          <ArticleCardList articles={tag.articles} emptyMessage="Nothing published with this tag yet." />
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    throw error
  }
}
