import { notFound, redirect } from 'next/navigation'

import { ApiRequestError, api } from '@/lib/api'
import type { GraphNeighbourhood } from '@/lib/types'

/**
 * Graph entry by node id.
 *
 * The backend addresses graph nodes by article id, but every readable URL in this application is
 * slug-based. Rather than maintain a second, uglier surface, this resolves the id to its slug and
 * redirects — so a link from an API consumer lands on the same page a reader would share.
 */
export default async function GraphNodePage(props: PageProps<'/graph/[nodeId]'>) {
  const { nodeId } = await props.params

  let neighbourhood: GraphNeighbourhood
  try {
    neighbourhood = await api.graphByNode(nodeId, 1)
  } catch (error) {
    if (error instanceof ApiRequestError && error.isNotFound) notFound()
    throw error
  }

  const focus = neighbourhood.nodes.find((node) => node.distance === 0) ?? neighbourhood.nodes[0]
  if (!focus) notFound()

  // Outside the try/catch deliberately: redirect() signals by throwing, and catching it here would
  // turn a successful redirect into a swallowed error.
  redirect(`/graph?slug=${encodeURIComponent(focus.slug)}`)
}
