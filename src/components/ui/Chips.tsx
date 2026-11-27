import Link from "next/link";
import { avatarColor, topicColor } from "@/lib/topic-color";

export function TopicChip({ slug, name }: { slug: string; name: string }) {
  return (
    <Link className="chip" href={`/topics/${encodeURIComponent(slug)}`} data-testid="topic-chip">
      <span className="dot" style={{ background: topicColor(slug) }} aria-hidden="true" />
      {name}
    </Link>
  );
}

export function TagChip({ slug, name }: { slug: string; name: string }) {
  return (
    <Link className="chip" href={`/tags/${encodeURIComponent(slug)}`} data-testid="tag-chip">
      #{name}
    </Link>
  );
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-grid",
        placeItems: "center",
        fontSize: Math.round(size * 0.38),
        fontWeight: 600,
        color: "#fff",
        flex: "none",
        background: avatarColor(name),
      }}
    >
      {initials}
    </span>
  );
}

export type Tone = "ok" | "warn" | "err" | "info" | "neutral";

export function StatePill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className="pill" data-tone={tone} data-testid="state-pill">
      {children}
    </span>
  );
}
