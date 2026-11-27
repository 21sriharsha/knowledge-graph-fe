# 0003 — Supabase Auth and the session model

Status: accepted · 2026-11-26

## Context
The backend validates OIDC JWTs against a JWKS (`OIDC_ISSUER_URI`, `OIDC_JWK_SET_URI`, optional
`OIDC_AUDIENCE`). It never trusts role claims: roles live in the platform DB, a first sign-in creates
an account with no roles, and `BOOTSTRAP_ADMIN_EMAILS` seeds admins.

## Decision
- Supabase Auth is the identity provider: GitHub, Google and email magic link, PKCE flow.
- `@supabase/ssr` stores the session in httpOnly cookies; Next.js middleware refreshes it.
- The Supabase project **must use asymmetric JWT signing keys** so the backend can verify via JWKS.
- After sign-in the app calls `GET /api/studio/me` to learn roles and linked author; an account with
  no roles sees the "waiting for access" screen.
- Sign-out clears the Supabase session and all studio Query caches.

## Consequences
- The frontend never decides access; it only adapts the UI to `/api/studio/me`.
- Local development needs either a Supabase project or the Supabase CLI; HTTP Basic (`author/author`,
  `admin/admin`) remains available for backend-only testing.

## Alternatives considered
- Auth.js/NextAuth with its own session: duplicates what Supabase provides and complicates JWKS.
- Clerk/Auth0: viable, but Supabase also hosts the database (ADR 0006), keeping one vendor.
