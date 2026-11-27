import { describe, expect, it } from "vitest";
import { safeExternalHref, safeImageSrc } from "@/lib/content/safe-url";
import { nextPathSchema, parseSlug } from "@/lib/validation";
import { createSourceSchema, updateSourceSchema, authorProfileSchema } from "@/lib/validation/studio";

describe("F03-FR-2 content URL allow-list", () => {
  it("allows http, https and mailto links", () => {
    expect(safeExternalHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeExternalHref("mailto:a@b.c")).toBe("mailto:a@b.c");
  });
  it.each(["javascript:alert(1)", "data:text/html,<script>", "vbscript:x", "//evil.example", "not a url"])("rejects %s", (url) => {
    expect(safeExternalHref(url)).toBeNull();
  });
  it("allows backend asset paths and https images only", () => {
    expect(safeImageSrc("/api/assets/ab82/docs/images/x.png")).toBe("/api/assets/ab82/docs/images/x.png");
    expect(safeImageSrc("https://cdn.example.com/x.png")).toBe("https://cdn.example.com/x.png");
    expect(safeImageSrc("http://cdn.example.com/x.png")).toBeNull();
    expect(safeImageSrc("/api/assets/../../etc/passwd")).toBeNull();
    expect(safeImageSrc("javascript:alert(1)")).toBeNull();
  });
});

describe("F01-FR-2 open-redirect guard", () => {
  it.each([
    ["/studio/articles", "/studio/articles"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/ok\r\nSet-Cookie:x", "/"],
  ])("%s → %s", (input, expected) => {
    expect(nextPathSchema.parse(input)).toBe(expected);
  });
});

describe("route slug validation", () => {
  it("accepts backend slugs and rejects anything else", () => {
    expect(parseSlug("hybrid-retrieval")).toBe("hybrid-retrieval");
    for (const bad of ["Hybrid", "a_b", "../x", "a--b", "-a", "", "a b", "x".repeat(201)]) expect(parseSlug(bad)).toBeNull();
  });
});

describe("F08 studio source schemas", () => {
  const base = { sourceType: "GITHUB", displayName: "Docs", owner: "me", repository: "repo" };
  it("F08-AC-1 requires a project for Azure DevOps only", () => {
    expect(createSourceSchema.safeParse(base).success).toBe(true);
    const azure = createSourceSchema.safeParse({ ...base, sourceType: "AZURE_DEVOPS" });
    expect(azure.success).toBe(false);
    expect(azure.error?.issues[0].path).toEqual(["project"]);
  });
  it("F08-AC-2 requires https for the API base URL", () => {
    expect(createSourceSchema.safeParse({ ...base, apiBaseUrl: "http://git.example" }).success).toBe(false);
    expect(createSourceSchema.safeParse({ ...base, apiBaseUrl: "https://git.example" }).success).toBe(true);
  });
  it("enforces backend length limits and trims", () => {
    expect(createSourceSchema.safeParse({ ...base, displayName: "x".repeat(201) }).success).toBe(false);
    expect(createSourceSchema.parse({ ...base, displayName: "  Docs  " }).displayName).toBe("Docs");
  });
  it("F08-AC-3 blank secrets on update mean 'keep'", () => {
    const parsed = updateSourceSchema.parse({ displayName: "Docs", accessToken: "", webhookSecret: "" });
    expect(parsed.accessToken).toBeUndefined();
    expect(parsed.webhookSecret).toBeUndefined();
  });
});

describe("F11 author profile schema", () => {
  it("F11-AC-3 rejects a biography over 10 000 characters", () => {
    expect(authorProfileSchema.safeParse({ displayName: "A", biography: "x".repeat(10_001) }).success).toBe(false);
  });
  it("rejects a non-https avatar URL", () => {
    expect(authorProfileSchema.safeParse({ displayName: "A", avatarUrl: "http://x/y.png" }).success).toBe(false);
  });
});
