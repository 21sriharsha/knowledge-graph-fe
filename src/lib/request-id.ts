import { headers } from 'next/headers'

/**
 * The header carrying one request's identity across the frontend and the backend.
 *
 * Named the same on both sides on purpose. The backend adopts an inbound value when it is safe to
 * log and mints one otherwise, so the id survives whichever end of the request you are looking at.
 */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * The current request's id, as set by the middleware.
 *
 * Returns null outside a request — a build-time render, say — rather than inventing one, because an
 * id that appears in a log but corresponds to no request is worse than no id.
 */
export async function currentRequestId(): Promise<string | null> {
  try {
    return (await headers()).get(REQUEST_ID_HEADER)
  } catch {
    return null
  }
}
