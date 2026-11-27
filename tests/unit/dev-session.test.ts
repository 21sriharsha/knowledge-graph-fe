import { describe, expect, it } from "vitest";
import { signDevSession, verifyDevSession } from "@/lib/auth/dev-session";

const secret = "k".repeat(40);

describe("dev session cookie (local-only auth)", () => {
  it("round-trips a persona", async () => {
    const token = await signDevSession("admin", secret);
    expect(await verifyDevSession(token, secret)).toBe("admin");
  });

  it("rejects a tampered payload", async () => {
    const token = await signDevSession("author", secret);
    const [, signature] = token.split(".");
    const forged = `${btoa(JSON.stringify({ persona: "admin", exp: 9_999_999_999 })).replace(/=+$/, "")}.${signature}`;
    expect(await verifyDevSession(forged, secret)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signDevSession("admin", "z".repeat(40));
    expect(await verifyDevSession(token, secret)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const issued = Date.now() - 9 * 60 * 60 * 1000;
    const token = await signDevSession("admin", secret, issued);
    expect(await verifyDevSession(token, secret)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyDevSession("not-a-token", secret)).toBeNull();
    expect(await verifyDevSession(undefined, secret)).toBeNull();
  });
});
