'use client'

import { useActionState, useState } from 'react'

import { createSource, type ActionResult } from '@/lib/studio-actions'
import type { SourceType } from '@/lib/types'

/**
 * The connect-a-repository form.
 *
 * The provider list is the backend's `SourceType` enum. Offering a provider the backend cannot
 * serve would be a form that always fails — so Bitbucket, named in an earlier draft of the spec, is
 * absent until a strategy and adapter exist for it.
 *
 * The project field appears only for Azure DevOps, which is the one provider that addresses
 * repositories as organisation/project/repository. Showing it to everyone would invite people to
 * fill in a field the backend then rejects.
 */
const PROVIDERS: { value: SourceType; label: string; ownerLabel: string; ownerHint: string }[] = [
  {
    value: 'GITHUB',
    label: 'GitHub',
    ownerLabel: 'Owner',
    ownerHint: 'User or organisation, e.g. commonmark',
  },
  {
    value: 'GITLAB',
    label: 'GitLab',
    ownerLabel: 'Namespace',
    ownerHint: 'Group or user; nested groups as group/subgroup',
  },
  {
    value: 'AZURE_DEVOPS',
    label: 'Azure DevOps',
    ownerLabel: 'Organisation',
    ownerHint: 'The dev.azure.com organisation name',
  },
]

export function SourceForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createSource,
    null,
  )
  const [provider, setProvider] = useState<SourceType>('GITHUB')
  const current = PROVIDERS.find((entry) => entry.value === provider) ?? PROVIDERS[0]

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {state && !state.ok ? (
        <div role="alert" className="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
          {state.message}
        </div>
      ) : null}

      <Field label="Provider" htmlFor="sourceType">
        <select
          id="sourceType"
          name="sourceType"
          value={provider}
          onChange={(event) => setProvider(event.target.value as SourceType)}
          className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
        >
          {PROVIDERS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Display name" htmlFor="displayName" hint="How this connection appears in the studio">
        <Input id="displayName" name="displayName" required placeholder="Handbook" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={current.ownerLabel} htmlFor="owner" hint={current.ownerHint}>
          <Input id="owner" name="owner" required placeholder="acme" />
        </Field>
        <Field label="Repository" htmlFor="repository">
          <Input id="repository" name="repository" required placeholder="handbook" />
        </Field>
      </div>

      {provider === 'AZURE_DEVOPS' ? (
        <Field label="Project" htmlFor="project" hint="Azure DevOps addresses repositories through a project">
          <Input id="project" name="project" required placeholder="docs" />
        </Field>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Owning author"
          htmlFor="ownerAuthorName"
          hint="Articles in this repository are attributed here unless a file says otherwise."
        >
          <Input id="ownerAuthorName" name="ownerAuthorName" placeholder="Anita Rao" />
        </Field>
        <Field label="Author email" htmlFor="ownerAuthorEmail" hint="Keeps one person one identity across repositories.">
          <Input id="ownerAuthorEmail" name="ownerAuthorEmail" type="email" placeholder="anita@example.com" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Branch" htmlFor="defaultBranch">
          <Input id="defaultBranch" name="defaultBranch" defaultValue="main" />
        </Field>
        <Field
          label="Content path"
          htmlFor="contentPath"
          hint="Folder to ingest. Leave blank for the whole repository."
        >
          <Input id="contentPath" name="contentPath" placeholder="docs" />
        </Field>
      </div>

      <Field
        label="Access token"
        htmlFor="accessToken"
        hint="Stored encrypted. Never displayed again, and no endpoint can read it back. Leave blank for a public repository."
      >
        <Input id="accessToken" name="accessToken" type="password" autoComplete="off" />
      </Field>

      <Field
        label="Webhook secret"
        htmlFor="webhookSecret"
        hint="Required for the provider to push changes. Without it, content updates only on the periodic reconciliation."
      >
        <Input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" />
      </Field>

      <Field
        label="API base URL"
        htmlFor="apiBaseUrl"
        hint="Only for self-hosted instances. Leave blank for the provider's public API."
      >
        <Input id="apiBaseUrl" name="apiBaseUrl" placeholder="https://gitlab.example.com" />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-foreground/20 bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {pending ? 'Connecting…' : 'Connect repository'}
      </button>
    </form>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="mt-0.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      aria-describedby={props.id ? `${props.id}-hint` : undefined}
      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground"
    />
  )
}
