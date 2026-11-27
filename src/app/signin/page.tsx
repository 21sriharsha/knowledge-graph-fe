import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { serverEnv } from "@/lib/env/server";
import { first, nextPathSchema } from "@/lib/validation";
import { SupabaseSignIn } from "@/components/auth/SupabaseSignIn";
import { signInAsDevPersona } from "./actions";
import styles from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = PageProps<"/signin">;

/** Sign-in (F01-FR-1). Supabase OAuth / magic link, or local dev personas when AUTH_MODE=dev. */
export default function SignInPage({ searchParams }: Props) {
  if (!serverEnv().FEATURE_STUDIO) notFound();
  return (
    <main id="main" data-view="signin" className={styles.page}>
      <section className={styles.card} data-testid="view-signin">
        <h1>Sign in</h1>
        <p className="muted">Authors and admins sign in to manage articles and repositories. Reading never needs an account.</p>
        <Suspense fallback={<div className="skel" style={{ height: 160 }} />}>
          <Options searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

const ERRORS: Record<string, string> = {
  invalid: "That sign-in request wasn't valid. Please try again.",
  callback: "We couldn't complete the sign-in. The link may have expired — please try again.",
  provider: "The sign-in provider returned an error. Please try again.",
};

async function Options({ searchParams }: { searchParams: Props["searchParams"] }) {
  const raw = await searchParams;
  const next = nextPathSchema.parse(first(raw.next) ?? "/studio");
  const errorKey = first(raw.error);
  const error = errorKey && ERRORS[errorKey];
  const env = serverEnv();
  return (
    <>
      {error && (
        <p role="alert" className={styles.error} data-testid="error-signin">
          {error}
        </p>
      )}
      {env.AUTH_MODE === "dev" ? (
        <div className={styles.dev}>
          <p className={styles.devNote}>
            <strong>Local development sign-in.</strong> Uses the backend&apos;s local HTTP Basic users. Not available on deployed environments.
          </p>
          {env.DEV_AUTH_AUTHOR_CREDENTIALS && (
            <form action={signInAsDevPersona}>
              <input type="hidden" name="persona" value="author" />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="btn" data-testid="signin-dev-author">
                Continue as dev author
              </button>
            </form>
          )}
          {env.DEV_AUTH_ADMIN_CREDENTIALS && (
            <form action={signInAsDevPersona}>
              <input type="hidden" name="persona" value="admin" />
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="btn" data-variant="primary" data-testid="signin-dev-admin">
                Continue as dev admin
              </button>
            </form>
          )}
        </div>
      ) : (
        <SupabaseSignIn next={next} />
      )}
    </>
  );
}
