import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAccount, getSession, isAdmin, isAuthor } from "@/lib/auth/session";
import { ErrorState } from "@/components/ui/StateView";
import { StudioShell } from "@/components/studio/StudioShell";
import { PendingAccess } from "@/components/studio/PendingAccess";

const pathSchema = z.string().regex(/^\/studio(\/[A-Za-z0-9._~\-/]*)?$/).catch("/studio");

/**
 * Studio access gate (F01-FR-3…7). Reads the session (request-time, behind Suspense in the layout):
 * signed out → sign-in with `next`; no roles → pending screen; otherwise the studio shell. Roles come
 * only from GET /api/studio/me — never from the token. The backend enforces everything again.
 */
export async function StudioGate({ children }: { children: React.ReactNode }) {
  const path = pathSchema.parse((await headers()).get("x-pathname") ?? "/studio");
  const session = await getSession();
  if (!session.signedIn) redirect(`/signin?next=${encodeURIComponent(path)}`);
  const account = await getAccount(session);
  if (!account.ok) {
    if (account.kind === "unauthenticated") redirect(`/signin?next=${encodeURIComponent(path)}`);
    return <ErrorState title="Studio is unavailable" requestId={account.requestId} retryHref={path} />;
  }
  const a = account.data;
  if (!isAuthor(a)) return <PendingAccess email={a.email ?? session.email} />;
  return (
    <StudioShell
      account={{
        id: a.id,
        displayName: a.displayName || a.email || (session.devPersona ? `Dev ${session.devPersona}` : "Account"),
        email: a.email,
        roles: a.roles ?? [],
        authorId: a.authorId,
        admin: isAdmin(a),
      }}
    >
      {children}
    </StudioShell>
  );
}
