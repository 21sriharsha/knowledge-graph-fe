"use client";

/**
 * Supabase sign-in (F01-FR-1/2/9): GitHub, Google (OAuth, PKCE) and email magic link. The browser
 * client only starts the flow; the code is exchanged server-side in /auth/callback, which sets httpOnly
 * cookies. `next` was validated server-side as a same-origin path before reaching this component.
 */
import { createBrowserClient } from "@supabase/ssr";
import { useState } from "react";
import { z } from "zod";
import { clientEnv } from "@/lib/env/client";
import styles from "./auth.module.css";
import { ProviderLogo } from "./ProviderLogo";

const emailSchema = z.email().max(320);

export function SupabaseSignIn({ next }: { next: string }) {
  const [status, setStatus] = useState<"idle" | "redirecting" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const client = () => {
    const env = clientEnv();
    return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  };
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const oauth = async (provider: "github" | "google") => {
    setStatus("redirecting");
    setMessage(`Redirecting to ${provider === "github" ? "GitHub" : "Google"}…`);
    const { error } = await client().auth.signInWithOAuth({ provider, options: { redirectTo: callback() } });
    if (error) {
      setStatus("error");
      setMessage("The sign-in provider returned an error. Please try again.");
    }
  };

  const magicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = emailSchema.safeParse(email.trim());
    if (!parsed.success) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError(null);
    const { error } = await client().auth.signInWithOtp({
      email: parsed.data,
      options: { emailRedirectTo: callback() },
    });
    if (error) {
      setStatus("error");
      setMessage(
        error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : "We couldn't send the link. Please try again.",
      );
    } else {
      setStatus("sent");
      setMessage("Check your inbox for a sign-in link.");
    }
  };

  return (
    <div className={styles.options}>
      <button
        type="button"
        className="btn"
        onClick={() => oauth("github")}
        disabled={status === "redirecting"}
        data-testid="signin-github"
      >
        <ProviderLogo provider="github" />
        Continue with GitHub
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => oauth("google")}
        disabled={status === "redirecting"}
        data-testid="signin-google"
      >
        <ProviderLogo provider="google" />
        Continue with Google
      </button>
      <div className={styles.divider}>or</div>
      <form onSubmit={magicLink} className={styles.magic} noValidate>
        <label className="field">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            maxLength={320}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? "email-error" : undefined}
            data-testid="signin-email"
          />
          {emailError && (
            <span id="email-error" className="error">
              {emailError}
            </span>
          )}
        </label>
        <button type="submit" className="btn" data-variant="primary" data-testid="signin-magic">
          Email me a sign-in link
        </button>
      </form>
      <p
        aria-live="polite"
        className={status === "error" ? styles.error : styles.status}
        data-testid={status === "sent" ? "magic-sent" : "oidc-progress"}
      >
        {message}
      </p>
    </div>
  );
}
