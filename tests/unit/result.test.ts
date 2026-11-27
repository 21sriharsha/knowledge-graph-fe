import { describe, expect, it } from "vitest";
import { kindForStatus, toFailure } from "@/lib/api/result";

describe("X01-FR-5 result mapping", () => {
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [400, "validation"],
    [500, "unavailable"],
    [503, "unavailable"],
  ])("maps %i to %s", (status, kind) => {
    expect(kindForStatus(status)).toBe(kind);
  });

  it("X01-AC-3 keeps the backend message and request id for a 409", () => {
    const failure = toFailure(409, { code: "DOMAIN_RULE_VIOLATION", message: "Byline already linked", requestId: "r-1" });
    expect(failure).toMatchObject({ kind: "conflict", code: "DOMAIN_RULE_VIOLATION", message: "Byline already linked", requestId: "r-1" });
  });

  it("X01-AC-4 exposes field violations for a 400", () => {
    const failure = toFailure(400, {
      code: "VALIDATION_FAILED",
      message: "Invalid",
      violations: [{ field: "displayName", message: "must not be blank" }],
    });
    expect(failure.violations).toEqual([{ field: "displayName", message: "must not be blank" }]);
  });

  it("never surfaces 5xx backend messages (may leak internals)", () => {
    const failure = toFailure(500, { message: "NullPointerException at Foo.java:12" });
    expect(failure.message).not.toContain("NullPointer");
  });

  it("tolerates a non-JSON error body", () => {
    expect(toFailure(502, "Bad Gateway").kind).toBe("unavailable");
  });
});
