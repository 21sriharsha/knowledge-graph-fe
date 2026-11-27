"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import styles from "@/components/ui/StateView.module.css";

/** Signed in but no roles yet (F01-FR-6): explains next steps; "Check again" re-reads /me. */
export function PendingAccess({ email }: { email?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <section className={styles.state} data-testid="pending-access">
      <h2>No author access yet</h2>
      <p>
        Every signed-in account gets author access automatically. If you just signed in, sign out and back in to refresh
        it.
      </p>
      {email && (
        <p>
          If it still doesn&apos;t appear, your account may have been restricted — an admin can look for <strong>{email}</strong>{" "}
          under Accounts.
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" data-variant="primary" onClick={() => start(() => router.refresh())} aria-busy={pending}>
          {pending ? "Checking…" : "Check again"}
        </button>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>
    </section>
  );
}
