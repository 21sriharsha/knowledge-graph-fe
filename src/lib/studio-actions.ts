'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { ApiRequestError, api } from './api'

/**
 * Studio mutations, as Server Actions.
 *
 * Credentials stay on the server: the browser posts to Next.js, Next.js authenticates to Spring.
 * No studio token ever reaches client JavaScript (FRONTEND-SPEC §10).
 */

export type ActionResult = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> }

export async function syncSource(id: string): Promise<ActionResult> {
  try {
    await api.studio.syncSource(id)
    revalidatePath('/studio')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describe(error, 'Could not start the sync.') }
  }
}

export async function setSourceActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    await api.studio.setSourceActive(id, active)
    revalidatePath('/studio')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describe(error, 'Could not change the repository state.') }
  }
}

export async function createSource(_previous: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const sourceType = String(formData.get('sourceType') ?? '')
  const payload = {
    sourceType,
    displayName: String(formData.get('displayName') ?? '').trim(),
    owner: String(formData.get('owner') ?? '').trim(),
    repository: String(formData.get('repository') ?? '').trim(),
    // Only Azure DevOps has a project dimension; sending an empty string for the others would be
    // rejected by the backend's own check constraint.
    project: sourceType === 'AZURE_DEVOPS' ? String(formData.get('project') ?? '').trim() : null,
    defaultBranch: String(formData.get('defaultBranch') ?? 'main').trim() || 'main',
    contentPath: String(formData.get('contentPath') ?? '').trim(),
    apiBaseUrl: String(formData.get('apiBaseUrl') ?? '').trim() || null,
    // One repository per author is the intended topology, so the connection declares its owner and
    // the articles inside it need no author frontmatter at all.
    ownerAuthorName: String(formData.get('ownerAuthorName') ?? '').trim() || null,
    ownerAuthorEmail: String(formData.get('ownerAuthorEmail') ?? '').trim() || null,
    accessToken: String(formData.get('accessToken') ?? '').trim() || null,
    webhookSecret: String(formData.get('webhookSecret') ?? '').trim() || null,
  }

  try {
    await api.studio.createSource(payload)
  } catch (error) {
    if (error instanceof ApiRequestError && error.code === 'VALIDATION_FAILED') {
      return { ok: false, message: 'Some fields need attention.', fieldErrors: {} }
    }
    return { ok: false, message: describe(error, 'Could not connect the repository.') }
  }

  revalidatePath('/studio')
  redirect('/studio')
}

export async function setPublicationState(
  slug: string,
  action: 'publish' | 'unpublish' | 'archive',
): Promise<ActionResult> {
  try {
    await api.studio.setPublicationState(slug, action)
    revalidatePath('/studio/articles')
    return { ok: true }
  } catch (error) {
    return { ok: false, message: describe(error, 'Could not change the publication state.') }
  }
}

/** Turns an API failure into something an operator can act on. */
function describe(error: unknown, fallback: string): string {
  if (error instanceof ApiRequestError) {
    if (error.code === 'STUDIO_CREDENTIALS_MISSING') {
      return 'Studio credentials are not configured. Set KNOWLEDGE_STUDIO_USERNAME and KNOWLEDGE_STUDIO_PASSWORD.'
    }
    if (error.status === 401 || error.status === 403) {
      return 'The configured studio credentials were rejected by the backend.'
    }
    if (error.code === 'BACKEND_UNREACHABLE') {
      return 'The knowledge service is not responding.'
    }
    return error.message || fallback
  }
  return fallback
}
