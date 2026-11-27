"use client";

/**
 * Studio: repositories (F08). Connect / edit in a modal drawer, pause/activate, sync now.
 * Forms validate with the shared zod schemas before submitting; the BFF validates again; backend field
 * violations map back to fields. Secrets are write-only: never displayed, cleared after submit.
 */
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { clientEnv } from "@/lib/env/client";
import { createSourceSchema, SOURCE_TYPES, updateSourceSchema } from "@/lib/validation/studio";
import { Drawer } from "@/components/ui/Drawer";
import { TextField } from "@/components/ui/TextField";
import { Switch } from "@/components/ui/Switch";
import { StatePill } from "@/components/ui/Chips";
import { EmptyState, ErrorState } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/components/content/CopyButton";
import { CopyCommands } from "@/components/content/CopyCommands";
import { useStudioAccount } from "./StudioShell";
import styles from "./studio.module.css";

type Source = components["schemas"]["SourceResponse"];
type Author = components["schemas"]["AuthorResponse"];
type AuthorPage = components["schemas"]["PageResponseAuthorResponse"];
type Errors = Record<string, string>;

const PROVIDER: Record<string, string> = { GITHUB: "GitHub", GITLAB: "GitLab", AZURE_DEVOPS: "Azure DevOps" };
const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function errorsFrom(issues: { path: PropertyKey[]; message: string }[]): Errors {
  return Object.fromEntries(issues.map((i) => [String(i.path[0] ?? "form"), i.message]));
}
function errorsFromBff(error: unknown): Errors {
  if (error instanceof BffError && error.violations.length) return Object.fromEntries(error.violations.map((v) => [v.field, v.message]));
  return {};
}

export function Repositories() {
  const account = useStudioAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [drawer, setDrawer] = useState<{ mode: "create" } | { mode: "edit"; source: Source } | null>(null);
  const [dirty, setDirty] = useState(false);
  const closeDrawer = () => {
    setDirty(false);
    setDrawer(null);
  };

  const sources = useQuery({ queryKey: ["studio", "sources"], queryFn: () => bff<Source[]>("/api/bff/studio/sources") });
  const authors = useQuery({
    queryKey: ["studio", "authors"],
    queryFn: () => bff<AuthorPage>("/api/bff/studio/authors"),
    enabled: account.admin,
    staleTime: 5 * 60_000,
  });
  const authorName = (id?: string) => authors.data?.content?.find((a) => a.id === id)?.displayName;

  const sync = useMutation({
    mutationFn: (id: string) => bff<void>(`/api/bff/studio/sources/${id}/sync`, { method: "POST" }),
    onSuccess: (_d, id) => {
      toast("Sync started. Follow it in Sync history.");
      void queryClient.invalidateQueries({ queryKey: ["studio", "runs"] });
      void id;
    },
    onError: (error) => toast(error instanceof BffError ? error.message : "Couldn't start the sync.", "err"),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      bff<Source>(`/api/bff/studio/sources/${id}/activate`, { method: active ? "POST" : "DELETE" }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: ["studio", "sources"] });
      const previous = queryClient.getQueryData<Source[]>(["studio", "sources"]);
      queryClient.setQueryData<Source[]>(["studio", "sources"], (list) => list?.map((s) => (s.id === id ? { ...s, active } : s)));
      return { previous };
    },
    onError: (error, _v, ctx) => {
      queryClient.setQueryData(["studio", "sources"], ctx?.previous);
      toast(error instanceof BffError ? error.message : "Couldn't change the repository state.", "err");
    },
    onSuccess: (source) => toast(source.active ? "Repository activated." : "Repository paused."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["studio", "sources"] }),
  });

  if (sources.isPending) return <div className="skel" style={{ height: 200 }} />;
  if (sources.isError) return <ErrorState requestId={sources.error instanceof BffError ? sources.error.requestId : undefined} message={sources.error.message} />;

  return (
    <section aria-labelledby="repos-heading">
      <CopyCommands />
      <div className={styles.toolbar}>
        <h2 id="repos-heading">Repositories</h2>
        <button type="button" className="btn" data-variant="primary" onClick={() => setDrawer({ mode: "create" })} data-testid="connect-repo">
          Connect repository
        </button>
      </div>

      {sources.data.length === 0 ? (
        <EmptyState testId="sources-empty" title="No repositories connected" body="Connect a GitHub, GitLab or Azure DevOps repository to start publishing." />
      ) : (
        <div className={styles.cards}>
          {sources.data.map((s) => (
            <article key={s.id} className={styles.card} data-paused={s.active ? undefined : ""} data-testid="source-card">
              <div className={styles.cardHead}>
                <div>
                  <h3>{s.displayName}</h3>
                  <span className={styles.sub}>
                    {PROVIDER[s.sourceType ?? ""] ?? s.sourceType} · {s.owner}/{s.repository}
                    {s.project ? ` · ${s.project}` : ""}
                  </span>
                </div>
                <StatePill tone={s.active ? "ok" : "neutral"}>{s.active ? "Active" : "Paused"}</StatePill>
              </div>
              <dl className={styles.kv}>
                <dt>Branch</dt>
                <dd>{s.defaultBranch || "default"}</dd>
                <dt>Content path</dt>
                <dd>{s.contentPath || "/"}</dd>
                {account.admin && (
                  <>
                    <dt>Owner author</dt>
                    <dd>{authorName(s.ownerAuthorId) ?? (s.ownerAuthorId ? "…" : "None")}</dd>
                  </>
                )}
                <dt>Last sync</dt>
                <dd>
                  {s.lastSyncedAt ? dateTime.format(new Date(s.lastSyncedAt)) : "Never"}
                  {s.lastSyncedRevision ? <span className="faint"> · {s.lastSyncedRevision.slice(0, 7)}</span> : null}
                </dd>
              </dl>
              {!s.accessTokenConfigured && (
                <p className={styles.notice} data-testid="notice-token">
                  No access token — private repositories can&apos;t be read and rate limits are low.
                </p>
              )}
              {!s.webhookSecretConfigured && (
                <p className={styles.notice} data-testid="notice-webhook">
                  No webhook secret — pushes won&apos;t trigger syncs.
                </p>
              )}
              <div className={styles.cardActions}>
                <button type="button" className="btn" data-size="sm" onClick={() => setDrawer({ mode: "edit", source: s })} data-testid="source-edit">
                  Edit
                </button>
                <button
                  type="button"
                  className="btn"
                  data-size="sm"
                  disabled={!s.active || (sync.isPending && sync.variables === s.id)}
                  onClick={() => s.id && sync.mutate(s.id)}
                  data-testid="source-sync"
                >
                  Sync now
                </button>
                <Link className="btn" data-variant="ghost" data-size="sm" href={`/studio/runs?repositoryId=${s.id}`}>
                  Runs
                </Link>
                <span style={{ marginLeft: "auto" }}>
                  <Switch
                    checked={!!s.active}
                    onChange={(active) => s.id && toggle.mutate({ id: s.id, active })}
                    label={<span className="sr-only">Active: {s.displayName}</span>}
                    testId="source-toggle"
                  />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Drawer
        open={drawer !== null}
        onClose={closeDrawer}
        title={drawer?.mode === "edit" ? `Edit ${drawer.source.displayName}` : "Connect repository"}
        dirty={dirty}
      >
        {drawer?.mode === "create" && <CreateForm onDone={closeDrawer} onDirty={setDirty} />}
        {drawer?.mode === "edit" && (
          <EditForm source={drawer.source} authors={account.admin ? (authors.data?.content ?? []) : null} onDone={closeDrawer} onDirty={setDirty} />
        )}
      </Drawer>
    </section>
  );
}

/** Reports whether `values` differ from the form's initial values (drives the drawer's discard guard). */
function useDirty(values: Record<string, string>, onDirty: (dirty: boolean) => void) {
  const [initial] = useState(values);
  const dirty = Object.keys({ ...initial, ...values }).some((k) => (initial[k] ?? "") !== (values[k] ?? ""));
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
}

function CreateForm({ onDone, onDirty }: { onDone: () => void; onDirty: (dirty: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({ sourceType: "GITHUB", defaultBranch: "main", contentPath: "docs" });
  const [errors, setErrors] = useState<Errors>({});
  const [created, setCreated] = useState<Source | null>(null);
  useDirty(created ? {} : values, onDirty);
  const set = (key: string) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const type = values.sourceType;

  const create = useMutation({
    mutationFn: (body: unknown) => bff<Source>("/api/bff/studio/sources", { method: "POST", json: body }),
    onSuccess: (source) => {
      setCreated(source);
      setValues((v) => ({ ...v, accessToken: "", webhookSecret: "" })); // secrets never kept client-side
      toast(`Connected ${source.displayName}.`);
      void queryClient.invalidateQueries({ queryKey: ["studio", "sources"] });
    },
    onError: (error) => {
      setErrors(errorsFromBff(error));
      toast(error instanceof BffError ? error.message : "Couldn't connect the repository.", "err");
    },
  });

  if (created) {
    const url = `${clientEnv().NEXT_PUBLIC_WEBHOOK_BASE_URL.replace(/\/$/, "")}/api/webhooks/sources/${created.id}`;
    return (
      <div className={styles.formGrid}>
        <p>
          <strong>{created.displayName}</strong> is connected. Run a first sync from its card, and add this webhook in your{" "}
          {PROVIDER[created.sourceType ?? ""] ?? "provider"} repository settings so pushes publish automatically:
        </p>
        <div className={styles.webhook} data-testid="webhook-url">
          <code id="webhook-url">{url}</code>
          <CopyButton targetId="webhook-url" label="Copy webhook URL" />
          <span>Use the same webhook secret you entered here. Content type: application/json.</span>
        </div>
        <button type="button" className="btn" data-variant="primary" onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.formGrid}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = createSourceSchema.safeParse(values);
        if (!parsed.success) {
          setErrors(errorsFrom(parsed.error.issues));
          return;
        }
        setErrors({});
        create.mutate(parsed.data);
      }}
    >
      <div className="field">
        <label htmlFor="src-type">Provider *</label>
        <select id="src-type" value={type} onChange={(e) => set("sourceType")(e.target.value)} data-testid="source-type">
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {PROVIDER[t]}
            </option>
          ))}
        </select>
      </div>
      <TextField name="displayName" label="Display name" required maxLength={200} value={values.displayName ?? ""} onChange={set("displayName")} error={errors.displayName} autoFocus testId="source-displayName" />
      <div className={styles.grid2}>
        <TextField name="owner" label={type === "AZURE_DEVOPS" ? "Organisation" : "Owner"} required maxLength={200} value={values.owner ?? ""} onChange={set("owner")} error={errors.owner} testId="source-owner" />
        <TextField name="repository" label="Repository" required maxLength={200} value={values.repository ?? ""} onChange={set("repository")} error={errors.repository} testId="source-repository" />
      </div>
      {type === "AZURE_DEVOPS" && (
        <TextField name="project" label="Project" required maxLength={200} value={values.project ?? ""} onChange={set("project")} error={errors.project} testId="source-project" />
      )}
      <div className={styles.grid2}>
        <TextField name="defaultBranch" label="Branch" maxLength={200} value={values.defaultBranch ?? ""} onChange={set("defaultBranch")} error={errors.defaultBranch} />
        <TextField name="contentPath" label="Content path" maxLength={500} value={values.contentPath ?? ""} onChange={set("contentPath")} error={errors.contentPath} />
      </div>
      {type !== "GITHUB" && (
        <TextField name="apiBaseUrl" label="API base URL (self-hosted)" type="url" maxLength={500} value={values.apiBaseUrl ?? ""} onChange={set("apiBaseUrl")} error={errors.apiBaseUrl} hint="https:// only" testId="source-apiBaseUrl" />
      )}
      <TextField name="accessToken" label="Access token" type="password" maxLength={500} value={values.accessToken ?? ""} onChange={set("accessToken")} error={errors.accessToken} hint="Write-only. Needed for private repositories." />
      <TextField name="webhookSecret" label="Webhook secret" type="password" maxLength={500} value={values.webhookSecret ?? ""} onChange={set("webhookSecret")} error={errors.webhookSecret} hint="Write-only. Without it, pushes won't trigger syncs." />
      <div className={styles.grid2}>
        <TextField name="ownerAuthorName" label="Owner author name" maxLength={200} value={values.ownerAuthorName ?? ""} onChange={set("ownerAuthorName")} error={errors.ownerAuthorName} hint="Byline for articles without an author field." />
        <TextField name="ownerAuthorEmail" label="Owner author email" type="email" maxLength={320} value={values.ownerAuthorEmail ?? ""} onChange={set("ownerAuthorEmail")} error={errors.ownerAuthorEmail} />
      </div>
      <button type="submit" className="btn" data-variant="primary" disabled={create.isPending} data-testid="source-save">
        {create.isPending ? "Connecting…" : "Connect"}
      </button>
    </form>
  );
}

function EditForm({
  source,
  authors,
  onDone,
  onDirty,
}: {
  source: Source;
  authors: Author[] | null;
  onDone: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({
    displayName: source.displayName ?? "",
    defaultBranch: source.defaultBranch ?? "",
    contentPath: source.contentPath ?? "",
    apiBaseUrl: source.apiBaseUrl ?? "",
    ownerAuthorId: source.ownerAuthorId ?? "",
    accessToken: "",
    webhookSecret: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  useDirty(values, onDirty);
  const set = (key: string) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  const update = useMutation({
    mutationFn: (body: unknown) => bff<Source>(`/api/bff/studio/sources/${source.id}`, { method: "PUT", json: body }),
    onSuccess: (updated) => {
      toast(`Saved ${updated.displayName}.`);
      void queryClient.invalidateQueries({ queryKey: ["studio", "sources"] });
      onDone();
    },
    onError: (error) => {
      setErrors(errorsFromBff(error));
      toast(error instanceof BffError ? error.message : "Couldn't save the repository.", "err");
    },
  });

  return (
    <form
      className={styles.formGrid}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = updateSourceSchema.safeParse(values);
        if (!parsed.success) {
          setErrors(errorsFrom(parsed.error.issues));
          return;
        }
        setErrors({});
        update.mutate(parsed.data);
      }}
    >
      <p className={styles.sub}>
        {PROVIDER[source.sourceType ?? ""]} · {source.owner}/{source.repository} (type, owner and repository can&apos;t change)
      </p>
      <TextField name="displayName" label="Display name" required maxLength={200} value={values.displayName} onChange={set("displayName")} error={errors.displayName} autoFocus />
      <div className={styles.grid2}>
        <TextField name="defaultBranch" label="Branch" maxLength={200} value={values.defaultBranch} onChange={set("defaultBranch")} error={errors.defaultBranch} />
        <TextField name="contentPath" label="Content path" maxLength={500} value={values.contentPath} onChange={set("contentPath")} error={errors.contentPath} />
      </div>
      {source.sourceType !== "GITHUB" && (
        <TextField name="apiBaseUrl" label="API base URL (self-hosted)" type="url" maxLength={500} value={values.apiBaseUrl} onChange={set("apiBaseUrl")} error={errors.apiBaseUrl} hint="https:// only" />
      )}
      {authors && (
        <div className="field">
          <label htmlFor="owner-author">Owner author</label>
          <select id="owner-author" value={values.ownerAuthorId} onChange={(e) => set("ownerAuthorId")(e.target.value)}>
            <option value="">None</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
        </div>
      )}
      <TextField
        name="accessToken"
        label="Access token"
        type="password"
        maxLength={500}
        value={values.accessToken}
        onChange={set("accessToken")}
        error={errors.accessToken}
        hint={source.accessTokenConfigured ? "Configured — leave blank to keep it." : "Not configured."}
      />
      <TextField
        name="webhookSecret"
        label="Webhook secret"
        type="password"
        maxLength={500}
        value={values.webhookSecret}
        onChange={set("webhookSecret")}
        error={errors.webhookSecret}
        hint={source.webhookSecretConfigured ? "Configured — leave blank to keep it." : "Not configured — pushes won't trigger syncs."}
      />
      <button type="submit" className="btn" data-variant="primary" disabled={update.isPending} data-testid="source-save">
        {update.isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
