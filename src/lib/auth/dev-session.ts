/**
 * Dev-only session (AUTH_MODE=dev, APP_ENV local|test — enforced by the env schema).
 * Lets developers and E2E tests use the studio against the local backend's HTTP Basic users without a
 * Supabase project. The cookie holds only the persona name + expiry, HMAC-SHA256 signed; credentials
 * stay server-side in env vars.
 *
 * Web Crypto only, so it runs in proxy.ts and route handlers alike.
 */
import { z } from "zod";

export const DEV_SESSION_COOKIE = "kg_dev_session";
export const DEV_PERSONAS = ["author", "admin"] as const;
export type DevPersona = (typeof DEV_PERSONAS)[number];

const payloadSchema = z.object({ persona: z.enum(DEV_PERSONAS), exp: z.number().int() });
const TTL_SECONDS = 60 * 60 * 8;

const encoder = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDevSession(persona: DevPersona, secret: string, now = Date.now()): Promise<string> {
  const payload = b64url(encoder.encode(JSON.stringify({ persona, exp: Math.floor(now / 1000) + TTL_SECONDS })));
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyDevSession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<DevPersona | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!constantTimeEqual(signature, await hmac(secret, payload))) return null;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(new TextDecoder().decode(fromB64url(payload))));
    if (!parsed.success || parsed.data.exp * 1000 < now) return null;
    return parsed.data.persona;
  } catch {
    return null;
  }
}

export const DEV_SESSION_MAX_AGE = TTL_SECONDS;
