"use client";

/**
 * Studio: author profile (F11). Authors edit their own byline (resolved from /me's authorId); admins can
 * edit any author via /studio/authors/[slug]. Backend enforces ownership (404 otherwise).
 */
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { authorProfileSchema } from "@/lib/validation/studio";
import { TextField } from "@/components/ui/TextField";
import { ErrorState } from "@/components/ui/StateView";
import { Avatar } from "@/components/ui/Chips";
import { useToast } from "@/components/ui/Toast";
import { useStudioAccount } from "./StudioShell";
import styles from "./studio.module.css";

type Author = components["schemas"]["AuthorResponse"];
type AuthorPage = components["schemas"]["PageResponseAuthorResponse"];

export function AuthorProfile({ slug }: { slug?: string }) {
  const me = useStudioAccount();
  const authors = useQuery({ queryKey: ["studio", "authors"], queryFn: () => bff<AuthorPage>("/api/bff/studio/authors"), staleTime: 5 * 60_000 });
  const targetSlug = slug ?? authors.data?.content?.find((a) => a.id === me.authorId)?.slug;

  if (!slug && !me.authorId) {
    return <ErrorState title="Not linked to a byline" message="Your account isn't linked to a byline yet — ask an admin to link it under Accounts." />;
  }
  if (authors.isPending && !slug) return <div className="skel" style={{ height: 240 }} />;
  if (!targetSlug) return <ErrorState title="Byline not found" message="We couldn't find the byline linked to your account." />;
  return <ProfileForm key={targetSlug} slug={targetSlug} />;
}

function ProfileForm({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const author = useQuery({ queryKey: ["studio", "author", slug], queryFn: () => bff<Author>(`/api/bff/studio/authors/${slug}`) });

  if (author.isPending) return <div className="skel" style={{ height: 240 }} />;
  if (author.isError) {
    if (author.error instanceof BffError && author.error.kind === "not_found") return <ErrorState title="Author not found" message="It may not be yours to edit." />;
    return <ErrorState requestId={author.error instanceof BffError ? author.error.requestId : undefined} message={author.error.message} />;
  }
  return <Form slug={slug} author={author.data} onSaved={() => void queryClient.invalidateQueries({ queryKey: ["studio", "author", slug] })} toast={toast} />;
}

function Form({ slug, author, onSaved, toast }: { slug: string; author: Author; onSaved: () => void; toast: (m: string, t?: "ok" | "err" | "info") => void }) {
  const [values, setValues] = useState({
    displayName: author.displayName ?? "",
    biography: author.biography ?? "",
    avatarUrl: author.avatarUrl ?? "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (key: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [key]: value }));

  const save = useMutation({
    mutationFn: (body: unknown) => bff<Author>(`/api/bff/studio/authors/${slug}`, { method: "PUT", json: body }),
    onSuccess: () => {
      toast("Profile saved.");
      onSaved();
    },
    onError: (error) => {
      if (error instanceof BffError && error.violations.length) setErrors(Object.fromEntries(error.violations.map((v) => [v.field, v.message])));
      toast(error instanceof BffError ? error.message : "Couldn't save the profile.", "err");
    },
  });

  return (
    <section aria-labelledby="profile-heading" style={{ maxWidth: 640 }} data-testid="author-profile">
      <div className={styles.toolbar}>
        <h2 id="profile-heading">Author profile</h2>
        <Link href={`/authors/${slug}`}>View public page</Link>
      </div>
      <div className={styles.card} style={{ marginBottom: 16 }} aria-label="Preview">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar name={values.displayName || "?"} size={48} />
          <div>
            <strong>{values.displayName || "Display name"}</strong>
            <p className="muted" style={{ margin: "4px 0 0", whiteSpace: "pre-line" }}>
              {values.biography || "Your biography appears here."}
            </p>
          </div>
        </div>
      </div>
      <form
        className={styles.formGrid}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = authorProfileSchema.safeParse(values);
          if (!parsed.success) {
            setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
            return;
          }
          setErrors({});
          save.mutate(parsed.data);
        }}
      >
        <TextField name="displayName" label="Display name" required maxLength={200} value={values.displayName} onChange={set("displayName")} error={errors.displayName} />
        <TextField name="biography" label="Biography" multiline maxLength={10_000} value={values.biography} onChange={set("biography")} error={errors.biography} hint="Plain text; line breaks are kept." />
        <TextField name="avatarUrl" label="Avatar URL" type="url" maxLength={1000} value={values.avatarUrl} onChange={set("avatarUrl")} error={errors.avatarUrl} hint="https:// only" />
        <TextField name="email" label="Contact email (private)" type="email" maxLength={320} value={values.email} onChange={set("email")} error={errors.email} hint="Not shown publicly. Leave blank to keep the current value." />
        <button type="submit" className="btn" data-variant="primary" disabled={save.isPending} data-testid="profile-save">
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}
