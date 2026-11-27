# 0008 — Self-serve authoring: every signed-in user can publish

Status: accepted · 2026-11-27 · **Supersedes** the role rules of [0003](0003-supabase-auth-session-model.md)
(the session model in 0003 still stands)

## Context
ADR 0003 followed the backend rule (commit `328a2da`): a first sign-in creates an account with no
roles, and an admin must grant AUTHOR and link a byline before the person can publish. The owner
decided on 2026-11-27 that any signed-in user should be able to publish by default, with reading
staying public. The backend's identity reasoning still holds: Supabase's `role` claim is
`authenticated` for everyone, and `user_metadata` is editable by the user.

## Decision
- **AUTHOR comes from the token.** A Supabase *Custom Access Token hook* adds `app_roles: ["AUTHOR"]`
  to every token. Users can't set that claim. The backend reads only that claim, and accepts only
  AUTHOR from it. Existing accounts pick it up with their next token.
- **ADMIN never comes from the token.** It stays in the backend: bootstrap email and studio grants.
  The backend refuses to start if configured to accept ADMIN from tokens.
- **Each author gets their own byline** on first use, named after their sign-in name. It's editable
  on the studio Profile page (F11), and a rename updates all their article pages.
- **Attribution follows the repository owner.** A repository a user connects is owned by their
  byline, and every article in it is published under that byline. Front-matter `author:` is used
  only in admin-managed repositories that have no owner.
- **Moderation happens in Supabase.** To stop a bad actor, ban the user in Supabase (or exclude
  them in the hook). The studio "revoke AUTHOR" action no longer stops a token-granted AUTHOR.
- The UI still never reads the token. `GET /api/studio/me` now returns *effective* roles (stored
  plus token), and the UI adapts to it exactly as before.

## Consequences
- The pending screen appears only when the hook is disabled or a user has been excluded. Its copy
  now says that.
- Anyone with a GitHub/Google account or an email address can publish to the public site. Abuse
  controls (rate limits, reporting, an in-platform suspend) are in the backlog (BG-24).
- The studio Accounts page shows *stored* grants. A token-granted AUTHOR does not appear there.
- Specs: backend `.claude/specs/self-serve-authoring.md`; F01, F08 and F10 are updated.

## Alternatives considered
- Grant AUTHOR in the backend DB at first sign-in. Rejected: the owner wanted the default
  controlled in Supabase, and existing accounts to inherit it on re-login.
- Accept ADMIN from the token too. Rejected: a hook bug or a dashboard compromise would mint
  administrators.
- Let front-matter `author:` decide the byline. Rejected: anyone could publish under anyone's name.
