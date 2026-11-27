import { describe, expect, it } from "vitest";
import { slugify, topicColor } from "@/lib/topic-color";

describe("X02-FR-4 topic colours", () => {
  it("is stable for the same topic regardless of case/spacing", () => {
    expect(topicColor("PostgreSQL")).toBe(topicColor("postgresql"));
    expect(topicColor("Service Mesh")).toBe(topicColor("service-mesh"));
  });

  it("always yields a valid OKLCH colour", () => {
    for (const name of ["a", "kubernetes", "operations", "search", "x".repeat(200)]) {
      expect(topicColor(name)).toMatch(/^oklch\(60% 0\.15 \d{1,3}\)$/);
    }
  });

  it("uses a neutral colour for unknown topics", () => {
    expect(topicColor(undefined)).toBe("var(--faint)");
  });

  it("slugifies like the backend", () => {
    expect(slugify("PostgreSQL Full Text Search")).toBe("postgresql-full-text-search");
    expect(slugify("Anita Rao")).toBe("anita-rao");
  });
});
