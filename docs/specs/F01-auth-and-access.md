# F01 — Authentication and access

Status: draft · Wave: W4 · ADR: 0003 · Prototype: `#signin`, account menu, pending screen

## Summary
Sign in with Supabase Auth (GitHub, Google, email magic link). The backend creates an account on first
authenticated call and assigns roles only through admins or `BOOTSTRAP_ADMIN_EMAILS`. The frontend
adapts navigation and studio access to the roles returned by `GET /api/studio/me`.

## Personas and access
| Persona | `/api/studio/me` | Sees |
|---|---|---|
| anon | not called | "Sign in" button; `/studio/**` redirects to `/signin?next=` |
| pending | `roles: []` | Account menu; studio shows "waiting for access" |
| author | `roles: [AUTHOR]`, `authorId` set | Studio: own articles, repositories, runs; own profile |
| admin | `roles` include `ADMIN` | Everything, including Accounts |

## User stories
- As a reader, I can sign in with GitHub, Google or an email link without creating a password.
- As a new user, I understand that my account exists but needs an admin to grant access.
- As an author, after sign-in I land where I was going (e.g. a studio deep link).

## Functional requirements
- F01-FR-1 `/signin` offers GitHub, Google and email magic link; shows which provider is in progress
  and errors from the provider (cancelled, expired link) with a retry.
- F01-FR-2 PKCE flow via `@supabase/ssr`; `/auth/callback` exchanges the code, sets httpOnly cookies,
  then redirects to the stored `next` path. `next` must be a same-origin relative path (open-redirect
  guard); otherwise `/`.
- F01-FR-3 Middleware refreshes the session on navigation; expired/invalid refresh → session cleared;
  studio pages then redirect to `/signin?next=`.
- F01-FR-4 After sign-in, the server loads `/api/studio/me` once per request (cached per request) and
  exposes `{ account, roles, authorId }` to layouts.
- F01-FR-5 Navigation: account menu with display name/email, "Studio" (if AUTHOR or ADMIN), "Sign out".
- F01-FR-6 Pending screen (`roles: []`): explains access must be granted by an admin, shows the email
  the admin should look for, a "Check again" button (re-fetches `/me`) and sign-out.
- F01-FR-7 Admin-only routes (`/studio/accounts`) render 403 page for non-admins (backend still
  enforces with 403).
- F01-FR-8 Sign-out: Supabase sign-out, clear cookies, clear TanStack Query cache, redirect to `/`.
- F01-FR-9 Magic link: after submit show "check your inbox" state; rate-limit message when Supabase
  returns a rate-limit error.

## API contract
| Call | Success | Errors handled |
|---|---|---|
| Supabase `signInWithOAuth` / `signInWithOtp` / `exchangeCodeForSession` | session | provider error, expired link, rate limit |
| `GET /api/studio/me` | `AccountResponse` | 401 → treat as signed out; 5xx → studio error state |

## UI and states
- Sign-in card centred, three provider buttons + email field; progress text during redirect.
- Error: inline message + retry; never shows raw provider payloads.

## Accessibility
- Buttons have provider names; the email field has a label and `autocomplete="email"`.
- Status changes ("Check your inbox") announced via a polite live region.

## Observability
- Counter `auth.signin` by provider and outcome; no user identifiers in metrics or logs.
- WARN when `/me` fails for a valid session (indicates backend/JWKS misconfiguration).

## Acceptance criteria
- F01-AC-1 Given anon opens `/studio/articles`, then they are redirected to `/signin?next=/studio/articles`,
  and after GitHub sign-in land on `/studio/articles`.
- F01-AC-2 Given `next=https://evil.example`, then after sign-in the user lands on `/`.
- F01-AC-3 Given a first-time user (`roles: []`), when opening `/studio`, then the pending screen shows
  with their email and "Check again".
- F01-AC-4 Given an author, when opening `/studio/accounts`, then a 403 page shows; the account menu has
  no Accounts entry.
- F01-AC-5 Given a signed-in user signs out, then studio data is not visible via back navigation and
  `/studio` redirects to sign-in.
- F01-AC-6 Given an expired magic link, then the error explains it and offers to send a new link.

## Test hooks
`view-signin`, `signin-github`, `signin-google`, `signin-email`, `signin-magic`, `magic-sent`,
`oidc-progress`, `error-signin`, `account-menu`, `account-menu-btn`, `menu-studio`, `menu-signout`,
`pending-access`.

## Local development mode
`AUTH_MODE=dev` (refused by the env schema unless `APP_ENV` is `local` or `test`) replaces Supabase
with two personas (dev author, dev admin) mapped to the backend's local HTTP Basic users. The
persona cookie is HMAC-signed and holds no credentials. Used for local work and the E2E suite.

## Out of scope
Account deletion, profile photos upload, MFA (Supabase supports it; revisit later).

## Open questions
- Should email magic link be enabled at launch or only OAuth providers?
- Supabase project must use asymmetric signing keys (deployment checklist, W0).
