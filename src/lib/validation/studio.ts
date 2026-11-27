/**
 * Studio form schemas (F08, F10, F11), mirroring the backend's request constraints from
 * apim/api-spec.yaml. Shared by the client forms (instant feedback) and the BFF routes (authoritative
 * parse before anything reaches Spring).
 */
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `At most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const httpsUrl = z
  .string()
  .trim()
  .max(500, "At most 500 characters")
  .refine((v) => {
    try {
      return new URL(v).protocol === "https:";
    } catch {
      return false;
    }
  }, "Must be an https:// URL");

export const SOURCE_TYPES = ["GITHUB", "GITLAB", "AZURE_DEVOPS"] as const;

/** CreateSourceRequest (F08-FR-2). Secrets are write-only and never echoed back. */
export const createSourceSchema = z
  .object({
    sourceType: z.enum(SOURCE_TYPES),
    displayName: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
    owner: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
    repository: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
    project: optionalText(200),
    defaultBranch: optionalText(200),
    contentPath: optionalText(500),
    apiBaseUrl: httpsUrl.optional().or(z.literal("").transform(() => undefined)),
    accessToken: optionalText(500),
    webhookSecret: optionalText(500),
    ownerAuthorName: optionalText(200),
    ownerAuthorEmail: z.email("Must be an email address").max(320).optional().or(z.literal("").transform(() => undefined)),
  })
  .superRefine((value, ctx) => {
    if (value.sourceType === "AZURE_DEVOPS" && !value.project) {
      ctx.addIssue({ code: "custom", path: ["project"], message: "Required for Azure DevOps" });
    }
  });
export type CreateSourceInput = z.input<typeof createSourceSchema>;

/** UpdateSourceRequest (F08-FR-3). Blank secret fields mean "keep the current value". */
export const updateSourceSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
  defaultBranch: optionalText(200),
  contentPath: optionalText(500),
  apiBaseUrl: httpsUrl.optional().or(z.literal("").transform(() => undefined)),
  ownerAuthorId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  accessToken: optionalText(500),
  webhookSecret: optionalText(500),
});
export type UpdateSourceInput = z.input<typeof updateSourceSchema>;

/** LinkAuthorRequest (F10-FR-5). */
export const linkAuthorSchema = z.object({ authorId: z.uuid() });

/** UpdateAuthorProfileRequest (F11-FR-2). */
export const authorProfileSchema = z.object({
  displayName: z.string().trim().min(1, "Required").max(200, "At most 200 characters"),
  biography: optionalText(10_000),
  avatarUrl: httpsUrl.max(1000).optional().or(z.literal("").transform(() => undefined)),
  email: z.email("Must be an email address").max(320).optional().or(z.literal("").transform(() => undefined)),
});
export type AuthorProfileInput = z.input<typeof authorProfileSchema>;

export const roleSchema = z.enum(["AUTHOR", "ADMIN"]);
export const articleTransitionSchema = z.enum(["publish", "unpublish", "archive"]);
