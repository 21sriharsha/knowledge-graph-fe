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
      <h2>Waiting for access</h2>
      <p>Your account exists, but an admin needs to grant you author access before you can use the studio.</p>
      {email && (
        <p>
          Ask an admin to look for <strong>{email}</strong> under Accounts.
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
