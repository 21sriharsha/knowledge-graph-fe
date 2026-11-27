"use client";

import Link from "next/link";
import { useId } from "react";
import { Avatar } from "@/components/ui/Chips";
import styles from "./AccountMenu.module.css";

/**
 * Account popover. It contains navigation links and a sign-out form, so it follows the navbar pattern
 * (links stay in Tab order, no role="menu") rather than an application menu (modern-web-guidance).
 * Native popover gives light-dismiss, Esc and focus return.
 */
export function AccountMenu({
  label,
  email,
  roles,
  canUseStudio,
}: {
  label: string;
  email?: string;
  roles: string[];
  canUseStudio: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const popoverId = `account-${id}`;
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        popoverTarget={popoverId}
        aria-controls={popoverId}
        data-testid="account-menu-btn"
        style={{ anchorName: `--acct-${id}` } as React.CSSProperties}
      >
        <Avatar name={label} size={30} />
        <span className="sr-only">Account menu for {label}</span>
      </button>
      <div
        id={popoverId}
        popover="auto"
        className={styles.menu}
        data-testid="account-menu"
        style={{ positionAnchor: `--acct-${id}` } as React.CSSProperties}
      >
        <div className={styles.head}>
          <strong>{label}</strong>
          {email && <span className="faint">{email}</span>}
          <span className="faint">{roles.length ? roles.join(" · ") : "No access yet"}</span>
        </div>
        {canUseStudio ? (
          <Link href="/studio" data-testid="menu-studio">
            Studio
          </Link>
        ) : (
          <Link href="/studio">Access status</Link>
        )}
        <form action="/auth/signout" method="post">
          <button type="submit" data-testid="menu-signout">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
