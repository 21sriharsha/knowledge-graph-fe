"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
import styles from "./studio.module.css";

export type StudioAccount = { id?: string; displayName: string; email?: string; roles: string[]; authorId?: string; admin: boolean };

const StudioContext = createContext<StudioAccount | null>(null);

/** Current studio account (from GET /api/studio/me via the gate). UX only — the backend enforces access. */
export function useStudioAccount(): StudioAccount {
  const account = useContext(StudioContext);
  if (!account) throw new Error("useStudioAccount outside StudioShell");
  return account;
}

export function StudioShell({ account, children }: { account: StudioAccount; children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/studio/articles", label: "Articles" },
    { href: "/studio/repositories", label: "Repositories" },
    { href: "/studio/runs", label: "Sync history" },
    ...(account.admin ? [{ href: "/studio/accounts", label: "Accounts" }] : []),
    ...(account.authorId ? [{ href: "/studio/profile", label: "Profile" }] : []),
  ];
  return (
    <StudioContext.Provider value={account}>
      <div className={`wrap ${styles.shell}`} data-testid="view-studio">
        <header className={styles.top}>
          <div>
            <div className="eyebrow">Studio</div>
            <p className={styles.who}>
              {account.displayName} <span className="faint">· {account.roles.join(" · ")}</span>
            </p>
          </div>
        </header>
        <nav aria-label="Studio sections" className={styles.tabs}>
          {tabs.map((tab) => (
            <Link key={tab.href} href={tab.href} aria-current={pathname.startsWith(tab.href) ? "page" : undefined}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className={styles.body}>{children}</div>
      </div>
    </StudioContext.Provider>
  );
}
