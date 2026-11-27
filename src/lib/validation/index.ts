/**
 * zod schemas for every user-controlled input (CLAUDE.md "Input validation"): route params, search
 * params, BFF request bodies. Parse first, use second — nothing downstream sees raw input.
 */
import { z } from "zod";

/** Backend slugs: lowercase alphanumerics separated by single hyphens. */
export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid slug");

export const uuidSchema = z.uuid();

export const pageSchema = z.coerce.number().int().min(0).max(10_000).default(0);
export const pageSizeSchema = z.coerce.number().int().min(1).max(50).default(8);

export const searchQuerySchema = z.string().trim().min(1).max(200);

export const depthSchema = z.coerce.number().int().min(1).max(2).default(1);

/** "true"/"1"/"on" → true, "false"/"0"/"off" → false; anything else → default. */
export const flagSchema = (fallback: boolean) =>
  z
    .enum(["true", "false", "1", "0", "on", "off"])
    .optional()
    .transform((v) => (v === undefined ? fallback : v === "true" || v === "1" || v === "on"));

/** Same-origin relative path for post-sign-in redirects (open-redirect guard, F01-FR-2). */
export const nextPathSchema = z
  .string()
  .max(500)
  .refine((v) => v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") && !/[\r\n]/.test(v), "must be a relative path")
  .catch("/");

/** First value of a search param that may be repeated. */
export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses a route slug or returns null (callers then render 404). */
export function parseSlug(value: string | undefined): string | null {
  const parsed = slugSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
