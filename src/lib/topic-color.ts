/**
 * Topics are open-ended (new ones can appear with any ingestion), so a topic's colour is derived from
 * a stable FNV-1a hash of its slug (X02-FR-4). The hash picks a HUE for a mid-lightness OKLCH colour:
 * an 8-slot palette collided visibly with only four real topics, a continuous hue rarely does.
 * Lightness 60% / chroma 0.15 keeps ≥3:1 against both the light and the dark background, so one value
 * works in both schemes (dots and graph nodes are non-text, always paired with the topic name).
 * Trade-off: hashing cannot guarantee distinct hues for every topic set (two of four topics land within
 * 30° about half the time); guaranteeing it would need the full topic list at every render site. Colour
 * is a secondary cue only — the topic name is always shown with it.
 */
export function topicColor(slugOrName: string | undefined | null): string {
  if (!slugOrName) return "var(--faint)";
  return `oklch(60% 0.15 ${hueOf(slugOrName)})`;
}

/** Background for white initials (avatars): same hue, darker so white text stays ≥ 4.5:1. */
export function avatarColor(name: string): string {
  return `oklch(46% 0.13 ${hueOf(name)})`;
}

function hueOf(slugOrName: string): number {
  const key = slugify(slugOrName);
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // murmur3 fmix32 avalanche: FNV's low bits spread poorly for short strings under `% 360`.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35) >>> 0;
  hash ^= hash >>> 16;
  return (hash >>> 0) % 360;
}

/** Converts a display name to the slug form the backend uses ("PostgreSQL" → "postgresql"). */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
