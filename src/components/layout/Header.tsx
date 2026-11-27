import Link from "next/link";
import { Suspense } from "react";
import { serverEnv } from "@/lib/env/server";
import { NavLinks } from "./NavLinks";
import { ThemeToggle } from "./ThemeToggle";
import { AccountSlot } from "./AccountSlot";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import styles from "./Header.module.css";

/** Site header. Static except the account area, which reads the session behind <Suspense>. */
export function Header() {
  const env = serverEnv();
  return (
    <header className={styles.header} data-testid="app-header">
      <div className={`wrap ${styles.inner}`}>
        <Link href="/" className={styles.brand} data-testid="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <circle cx="6" cy="7" r="2.6" fill="var(--t-1)" />
            <circle cx="18" cy="6" r="2.2" fill="var(--t-2)" />
            <circle cx="12" cy="18" r="2.8" fill="var(--t-4)" />
            <path d="M7.8 8.6l3.1 7M16.6 7.8l-3.3 8M8.6 7h7" stroke="currentColor" strokeWidth="1.3" fill="none" />
          </svg>
          <span>Knowledge</span>
        </Link>
        <NavLinks explorer={env.FEATURE_EXPLORER} />
        {env.FEATURE_SEARCH ? <HeaderSearch /> : <span className={styles.spacer} />}
        <div className={styles.actions}>
          <ThemeToggle />
          <Suspense fallback={<span className={styles.accountPlaceholder} />}>
            <AccountSlot studioEnabled={env.FEATURE_STUDIO} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
