import Link from "next/link";
import { getAccount, getSession, isAuthor } from "@/lib/auth/session";
import { AccountMenu } from "./AccountMenu";

/** Account area (F01-FR-5). Reads the session, so it is rendered behind <Suspense> by the header. */
export async function AccountSlot({ studioEnabled }: { studioEnabled: boolean }) {
  if (!studioEnabled) return null;
  const session = await getSession();
  if (!session.signedIn) {
    return (
      <Link className="btn" href="/signin" data-testid="signin-link">
        Sign in
      </Link>
    );
  }
  const account = await getAccount(session);
  const label = account.ok
    ? account.data.displayName || account.data.email || (session.devPersona ? `Dev ${session.devPersona}` : "Account")
    : session.email || (session.devPersona ? `Dev ${session.devPersona}` : "Account");
  return (
    <AccountMenu
      label={label}
      email={account.ok ? account.data.email : session.email}
      roles={account.ok ? (account.data.roles ?? []) : []}
      canUseStudio={account.ok && isAuthor(account.data)}
    />
  );
}
