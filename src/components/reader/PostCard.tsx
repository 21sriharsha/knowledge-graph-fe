import Link from "next/link";
import { Avatar } from "@/components/ui/Chips";
import styles from "./PostCard.module.css";

export type PostCardData = {
  slug?: string;
  title?: string;
  summary?: string;
  authorName?: string;
};

/**
 * Article card (F02-FR-4). The current API (`ArticleReference`) carries only slug, title, summary and
 * author name, so this is the compact card from F04-FR-4. Date, reading time, topics, tags and link
 * count arrive with BG-2. The author link uses the slug from /api/navigation (passed in) — never a
 * slug guessed from the name.
 */
export function PostCard({ article, authorSlug }: { article: PostCardData; authorSlug?: string }) {
  if (!article.slug) return null;
  return (
    <article className={styles.post} data-testid="post-card" data-slug={article.slug}>
      {article.authorName && (
        <div className={styles.by}>
          <Avatar name={article.authorName} size={24} />
          {authorSlug ? (
            <Link href={`/authors/${authorSlug}`} className={styles.author}>
              {article.authorName}
            </Link>
          ) : (
            <span className={styles.author}>{article.authorName}</span>
          )}
        </div>
      )}
      <h2 className={styles.title}>
        <Link href={`/articles/${article.slug}`}>{article.title ?? article.slug}</Link>
      </h2>
      {article.summary && <p className={styles.summary}>{article.summary}</p>}
    </article>
  );
}
