import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleCardList } from '@/components/article-card'
import { ApiRequestError, api } from '@/lib/api'

export async function generateMetadata(props: PageProps<'/topics/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  try {
    const topic = await api.topic(slug)
    return { title: topic.name, description: topic.description ?? undefined }
  } catch {
    return { title: slug }
  }
}

export default async function TopicPage(props: PageProps<'/topics/[slug]'>) {
  const { slug } = await props.params

  try {
    const topic = await api.topic(slug)
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Topic</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{topic.name}</h1>
        {topic.description ? (
          <p className="mt-2 text-muted-foreground">{topic.description}</p>
        ) : null}
        <p className="mt-1.5 text-sm text-muted-foreground">
          {topic.articleCount} article{topic.articleCount === 1 ? '' : 's'}
        </p>
        <div className="mt-6">
          <ArticleCardList articles={topic.articles} emptyMessage="Nothing published under this topic yet." />
        </div>
      </div>
    )
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    throw error
  }
}
