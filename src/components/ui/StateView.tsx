import Link from "next/link";
import styles from "./StateView.module.css";

type Action = { label: string; href: string };

export function EmptyState({
  title,
  body,
  action,
  testId = "empty-state",
}: {
  title: string;
  body?: string;
  action?: Action;
  testId?: string;
}) {
  return (
    <section className={styles.state} data-testid={testId}>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      {action && (
        <Link className="btn" href={action.href}>
          {action.label}
        </Link>
      )}
    </section>
  );
}

/**
 * Unexpected failure (X03-FR-7). Shows the backend request id when known so support can find the log.
 * `retryHref` reloads the same URL (server-rendered pages) — client views pass their own control.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this right now. Please try again.",
  requestId,
  retryHref,
  children,
}: {
  title?: string;
  message?: string;
  requestId?: string;
  retryHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={styles.state} role="alert" data-testid="error-state">
      <h2>{title}</h2>
      <p>{message}</p>
      {retryHref && (
        <a className="btn" href={retryHref} data-testid="error-retry">
          Try again
        </a>
      )}
      {children}
      {requestId && <p className={styles.code}>Reference: {requestId}</p>}
    </section>
  );
}
