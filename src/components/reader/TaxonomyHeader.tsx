import Link from "next/link";
import styles from "./taxonomy.module.css";

/** Shared header for topic / tag / author listing pages (F04). */
export function TaxonomyHeader({
  eyebrow,
  title,
  description,
  count,
  color,
  graphHref,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  count?: number;
  color?: string;
  graphHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className={styles.title}>
        {color && <span className="dot" style={{ background: color, width: 12, height: 12 }} aria-hidden="true" />}
        {title}
      </h1>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.meta}>
        {count !== undefined && (
          <span className="tabular">
            {count} {count === 1 ? "article" : "articles"}
          </span>
        )}
        {graphHref && (
          <Link href={graphHref} className={styles.graphLink}>
            See in graph
          </Link>
        )}
      </div>
      {children}
    </header>
  );
}
