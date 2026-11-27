import type { Tone } from "@/components/ui/Chips";

export const RUN_STATE: Record<string, { label: string; tone: Tone }> = {
  RUNNING: { label: "Running", tone: "info" },
  SUCCEEDED: { label: "Succeeded", tone: "ok" },
  PARTIALLY_SUCCEEDED: { label: "Partially succeeded", tone: "warn" },
  FAILED: { label: "Failed", tone: "err" },
};

export const TRIGGER: Record<string, string> = { WEBHOOK: "Push (webhook)", MANUAL: "Manual", SCHEDULED: "Scheduled" };

/** Short help for the backend's diagnostic codes (F09-FR-4); unknown codes show only their message. */
export const DIAGNOSTIC_HELP: Record<string, string> = {
  UNRESOLVED_LINK: "A [[wiki link]] points to an article that doesn't exist yet. It renders as plain text until that article is published.",
  UNCHANGED: "The file hasn't changed since the last sync, so it was skipped.",
  RAW_HTML_DROPPED: "Raw HTML in the Markdown was removed for safety. Use Markdown syntax instead.",
  PROVIDER_ERROR: "The Git provider returned an error — check the access token and repository settings.",
  PERSIST_FAILED: "The article couldn't be saved. Try syncing again; if it persists, contact an admin.",
  PARSE_FAILED: "The Markdown couldn't be parsed. Check the front matter and syntax.",
  MISSING_TITLE: "The article has no title. Add `title:` to the front matter.",
  HANDLER_FAILED: "A processing step failed for this file. Try syncing again.",
  ARTICLE_REMOVED: "The file was deleted from the repository, so the article was removed.",
};

export function duration(start?: string, end?: string): string {
  if (!start) return "—";
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
