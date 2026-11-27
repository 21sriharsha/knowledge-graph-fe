import type { Metadata } from "next";
import { Accounts } from "@/components/studio/Accounts";

/** Session-gated (see studio/layout.tsx): opt out of instant-navigation validation for this segment. */
export const instant = false;

export const metadata: Metadata = { title: "Accounts" };

/** Studio: accounts and roles (F10, admin only — the backend answers 403 for others). */
export default function AccountsPage() {
  return <Accounts />;
}
