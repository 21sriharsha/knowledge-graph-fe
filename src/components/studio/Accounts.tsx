"use client";

/**
 * Studio: accounts and roles (F10, admin only — backend enforces with 403). Role switches are
 * optimistic with rollback; removing your own ADMIN asks first in a native modal dialog; byline
 * linking surfaces the backend's 409 when a byline is already taken.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { components } from "@/lib/api/schema";
import { bff, BffError } from "@/lib/bff-client";
import { Switch } from "@/components/ui/Switch";
import { EmptyState, ErrorState } from "@/components/ui/StateView";
import { useToast } from "@/components/ui/Toast";
import { useStudioAccount } from "./StudioShell";
import styles from "./studio.module.css";

type Account = components["schemas"]["AccountResponse"];
type AuthorPage = components["schemas"]["PageResponseAuthorResponse"];
type Role = "AUTHOR" | "ADMIN";
const QUERY_KEY = ["studio", "accounts"];
const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function Accounts() {
  const me = useStudioAccount();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [pendingSelfRevoke, setPendingSelfRevoke] = useState<Account | null>(null);

  const accounts = useQuery({ queryKey: QUERY_KEY, queryFn: () => bff<Account[]>("/api/bff/studio/accounts") });
  const authors = useQuery({ queryKey: ["studio", "authors"], queryFn: () => bff<AuthorPage>("/api/bff/studio/authors"), staleTime: 5 * 60_000 });

  const setRole = useMutation({
    mutationFn: ({ id, role, on }: { id: string; role: Role; on: boolean }) =>
      bff<Account>(`/api/bff/studio/accounts/${id}/roles/${role}`, { method: on ? "PUT" : "DELETE" }),
    onMutate: async ({ id, role, on }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Account[]>(QUERY_KEY);
      queryClient.setQueryData<Account[]>(QUERY_KEY, (list) =>
        list?.map((a) => (a.id === id ? { ...a, roles: on ? [...new Set([...(a.roles ?? []), role])] : (a.roles ?? []).filter((r) => r !== role) } : a)),
      );
      return { previous };
    },
    onError: (error, _v, ctx) => {
      queryClient.setQueryData(QUERY_KEY, ctx?.previous);
      toast(error instanceof BffError ? error.message : "Couldn't change the role.", "err");
    },
    onSuccess: (account, { role, on }) => toast(`${on ? "Granted" : "Removed"} ${role} ${on ? "to" : "from"} ${account.displayName || account.email || "account"}.`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const link = useMutation({
    mutationFn: ({ id, authorId }: { id: string; authorId: string | null }) =>
      authorId
        ? bff<Account>(`/api/bff/studio/accounts/${id}/author`, { method: "PUT", json: { authorId } })
        : bff<Account>(`/api/bff/studio/accounts/${id}/author`, { method: "DELETE" }),
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY }); // select reverts to server state
      toast(error instanceof BffError ? error.message : "Couldn't change the byline.", "err");
    },
    onSuccess: (account) => {
      toast(account.authorId ? "Byline linked." : "Byline unlinked.");
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  if (accounts.isPending) return <div className="skel" style={{ height: 240 }} />;
  if (accounts.isError) {
    if (accounts.error instanceof BffError && accounts.error.kind === "forbidden") return <ErrorState title="Admins only" message="You need the ADMIN role to manage accounts." />;
    return <ErrorState requestId={accounts.error instanceof BffError ? accounts.error.requestId : undefined} message={accounts.error.message} />;
  }

  const q = search.trim().toLowerCase();
  const list = [...accounts.data]
    .filter((a) => !q || `${a.displayName ?? ""} ${a.email ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => Number((a.roles?.length ?? 0) > 0) - Number((b.roles?.length ?? 0) > 0)); // pending first (F10-FR-2)
  const authorList = authors.data?.content ?? [];

  const toggleRole = (account: Account, role: Role, on: boolean) => {
    if (!account.id) return;
    if (!on && role === "ADMIN" && account.id === me.id) {
      setPendingSelfRevoke(account);
      return;
    }
    setRole.mutate({ id: account.id, role, on });
  };

  return (
    <section aria-labelledby="accounts-heading" data-testid="accounts">
      <div className={styles.toolbar}>
        <h2 id="accounts-heading">Accounts</h2>
        <label className="field" style={{ minWidth: 240 }}>
          <span className="sr-only">Search accounts</span>
          <input type="search" placeholder="Search name or email" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {accounts.data.length === 0 ? (
        <EmptyState
          testId="accounts-empty"
          title="No accounts yet"
          body="Accounts appear here after people sign in with Supabase for the first time. (Local HTTP Basic users are service accounts and are not listed.)"
        />
      ) : (
        <table className={styles.table} data-testid="accounts-table">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Author role</th>
              <th scope="col">Admin role</th>
              <th scope="col">Byline</th>
              <th scope="col">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const roles = a.roles ?? [];
              const name = a.displayName || a.email || a.subject || "Account";
              return (
                <tr key={a.id} data-testid="account-row">
                  <td>
                    <span className={styles.rowTitle}>{name}</span>
                    {roles.length === 0 && <span className="pill" data-tone="warn" style={{ marginLeft: 6 }}>Pending</span>}
                    <span className={styles.sub}>
                      {a.email} · {a.issuer ? new URL(a.issuer).hostname : "unknown issuer"}
                    </span>
                  </td>
                  <td>
                    <Switch checked={roles.includes("AUTHOR")} onChange={(on) => toggleRole(a, "AUTHOR", on)} label={<span className="sr-only">AUTHOR role for {name}</span>} />
                  </td>
                  <td>
                    <Switch checked={roles.includes("ADMIN")} onChange={(on) => toggleRole(a, "ADMIN", on)} label={<span className="sr-only">ADMIN role for {name}</span>} />
                  </td>
                  <td>
                    <select
                      aria-label={`Byline for ${name}`}
                      value={a.authorId ?? ""}
                      onChange={(e) => a.id && link.mutate({ id: a.id, authorId: e.target.value || null })}
                      data-testid="link-author"
                    >
                      <option value="">Not linked</option>
                      {authorList.map((au) => (
                        <option key={au.id} value={au.id}>
                          {au.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{a.lastSeenAt ? dateFmt.format(new Date(a.lastSeenAt)) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <ConfirmSelfRevoke
        account={pendingSelfRevoke}
        onCancel={() => setPendingSelfRevoke(null)}
        onConfirm={() => {
          if (pendingSelfRevoke?.id) setRole.mutate({ id: pendingSelfRevoke.id, role: "ADMIN", on: false });
          setPendingSelfRevoke(null);
        }}
      />
    </section>
  );
}

/** F10-FR-4: removing your own ADMIN role. Native modal dialog; focus starts on the safe action. */
function ConfirmSelfRevoke({ account, onCancel, onConfirm }: { account: Account | null; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (account && !dialog.open) dialog.showModal();
    if (!account && dialog.open) dialog.close();
  }, [account]);
  return (
    <dialog ref={ref} aria-labelledby="self-revoke-title" onClose={onCancel} style={{ maxWidth: 440, borderRadius: 14, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--fg)" }} data-testid="self-revoke-dialog">
      <h1 id="self-revoke-title" style={{ fontSize: 18 }}>
        Remove your own admin access?
      </h1>
      <p>You will immediately lose access to this page and to other admin actions. Another admin would have to grant it back.</p>
      <form method="dialog" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn" value="cancel" autoFocus>
          Keep admin
        </button>
        <button className="btn" data-variant="danger" value="confirm" type="button" onClick={onConfirm}>
          Remove admin
        </button>
      </form>
    </dialog>
  );
}
