import { REQUEST_ID_HEADER, currentRequestId } from '@/lib/request-id'
import { backendUrlFor } from '@/lib/api'

/**
 * Serves images an article references, by passing them through from the backend.
 *
 * Articles carry site-relative image URLs (`/api/assets/…`), which the browser resolves against
 * this origin. That is deliberate: the browser never talks to the backend directly, so the backend
 * needs no public ingress and its address never reaches a page. An absolute backend URL in the
 * markup would give up both.
 *
 * The body is streamed rather than buffered — an image has no reason to be held in this server's
 * memory on its way past, and buffering would make a large one a memory spike per concurrent
 * reader.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params
  // Re-encoded segment by segment: the segments arrive decoded, and joining them raw would let a
  // path containing an encoded slash change shape on the way to the backend.
  const target = path.map(encodeURIComponent).join('/')

  const headers = new Headers()
  const requestId = await currentRequestId()
  if (requestId) headers.set(REQUEST_ID_HEADER, requestId)

  let upstream: Response
  try {
    upstream = await fetch(backendUrlFor(`/api/assets/${target}`), { headers })
  } catch {
    // A missing image is not worth failing the page it sits on.
    return new Response(null, { status: 502 })
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status })
  }

  // Only headers that describe the bytes are forwarded. Anything else the backend sets is about
  // the backend's own response, not this one.
  const passthrough = new Headers()
  for (const header of ['content-type', 'content-length', 'cache-control', 'etag', 'last-modified']) {
    const value = upstream.headers.get(header)
    if (value) passthrough.set(header, value)
  }
  passthrough.set('X-Content-Type-Options', 'nosniff')

  return new Response(upstream.body, { status: 200, headers: passthrough })
}
