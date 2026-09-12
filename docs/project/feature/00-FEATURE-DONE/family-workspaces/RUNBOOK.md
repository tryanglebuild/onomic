# Family Workspaces — Runbook (applying migrations for real)

**Update (2026-09-11):** these migrations have since been applied to the real hosted Supabase project — confirmed by repeated end-to-end signup/handle/workspace-creation runs against it throughout later feature work (Onboarding, Manual Income & Recurring Expenses, Dashboard Overview Widgets), all of which depend on this schema being live. The checklist below is kept as a historical record of what was verified, and §6's known limitation (cascade deletes) is still real and unfixed — read that section before ever building account/workspace deletion.

This feature was originally built with all live Supabase work deliberately deferred (per project-owner decision) — the code, migrations, and tests existed and compiled, but nothing had been applied to or run against a real Postgres/Supabase instance yet. This document was the checklist for the first time that happened.

## 1. Migration order

Both migration files must be applied together, in filename order (the Supabase CLI applies migrations in lexical/timestamp order automatically via `supabase db reset` or `supabase migration up`, so no manual ordering step is needed — this just documents the dependency):

1. `supabase/migrations/20260906120000_001_family_workspaces.sql` — core schema, RLS, `is_workspace_member`/`is_workspace_owner` helpers, RPC functions, triggers.
2. `supabase/migrations/20260906130000_002_workspace_members_with_email.sql` — `get_workspace_members_with_email` function. **Depends on `is_workspace_member` from migration 001** — must not be applied alone.
3. `supabase/migrations/20260907180000_003_profile_signup_fields.sql` — adds `profiles.full_name`/`birth_date`, updates the signup trigger to read them from `auth.users.raw_user_meta_data`.
4. `supabase/migrations/20260907190000_004_user_identity_handle_avatar.sql` (see [`../user-identity/implementation-plan.md`](../user-identity/implementation-plan.md)) — `profiles.handle`/`avatar_path`, `reserved_handles`, `is_handle_available`/`suggest_handle`, first `profiles` UPDATE policy (column-restricted via `GRANT` — verify `role` is NOT in the granted column list), and the public `avatars` Storage bucket + its RLS policies. **Depends on the signup trigger from migration 003.**

## 2. Environment variables

| Variable | Where to get it | Used in |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase status` (local) or Supabase project settings (hosted) | App runtime (`lib/supabase/*.ts`, `middleware.ts`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase status` / project settings | App runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` / project settings | **Tests only** (`tests/helpers/supabase-test-clients.ts`) — never used by `app/` or `lib/` |
| `INVITE_TOKEN_SECRET` | Generate: `openssl rand -base64 32` | Invite token signing (`lib/workspaces/invite-token.ts` callers) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; the deployed URL in production | Invite links (`lib/workspaces/invite-links.ts`) |

Copy `.env.local.example` to `.env.local` and fill in real values before running the app.

## 3. First-time setup steps

```bash
supabase init          # if supabase/config.toml doesn't already exist
supabase start          # starts the local Postgres/Auth/Studio stack
supabase db reset       # applies both migrations above, in order
supabase status         # prints the local API URL, anon key, service_role key
```

Copy the printed values into `.env.local` (app) **and** a separate `.env.test.local` (gitignored, tests-only — `tests/setup.ts` loads it via `dotenv`). Both files need the same `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`; only `.env.test.local` needs `SUPABASE_SERVICE_ROLE_KEY`.

Then generate real TypeScript types to replace the hand-authored placeholder:

```bash
supabase gen types typescript --local > lib/supabase/database.types.ts
```

Review that diff as a real change, not a rubber stamp — the hand-authored file was a best-effort placeholder and the real generated output may differ in shape (e.g. it will correctly categorize the view/function under the right section).

## 4. Running the tests

```bash
npm test                          # currently runs both unit and integration tests
```

`tests/unit/*.test.ts` (e.g. `invite-token.test.ts`) has no database dependency and always runs. `tests/integration/family-workspaces.rls.test.ts` requires the local Supabase stack from step 3 to be running — this is the first time it will actually execute; it has only ever been reviewed by careful reading until now, so expect to iterate on it once it runs for real.

## 5. What to check on the very first real run

These are risks that were flagged during code review but could not be verified without a live database:

- The `is_workspace_member`/`is_workspace_owner` helper functions must actually break the RLS recursion on `workspace_members` — if you see `infinite recursion detected in policy for relation`, a policy still subqueries `workspace_members` directly instead of calling the helpers.
- `get_workspace_members_with_email` must return rows for a genuine member and zero rows (not an error) for a non-member.
- The "expired invite" test path no longer expects `workspace_invites.status` to flip to `'expired'` on read — only that acceptance is rejected. If you see a stale assertion expecting a stored status flip, it's a leftover from before this was corrected.
- A user must not be able to remove their own membership from their personal workspace, and an owner must not be able to remove themselves as the last owner of a family workspace — both are enforced by a trigger (`prevent_unsafe_member_removal`), not just client-side UI hiding.
- **From migration 004:** as `authenticated`, `update profiles set role = 'admin' where id = auth.uid()` must fail (column not granted) while `update profiles set full_name = 'x' where id = auth.uid()` succeeds — this is the single most important thing to verify on first run, since it depends on the `revoke update on profiles ...` actually having run before the narrower `grant update (...)`.
- `insert`/`update` of `profiles.handle = 'admin'` (or any other seeded `reserved_handles` row) must fail with `handle_reserved`, not just get rejected by the app-facing `is_handle_available` check.
- Uploading an avatar over 2MB or of a disallowed MIME type must be rejected by Supabase Storage itself (check the bucket's `file_size_limit`/`allowed_mime_types` took effect), not only by the client-side check in `avatar-upload-form.tsx`.
- `select suggest_handle('Leandro Oliveira')` must start with `leandro`, not `eandroliveira` — an earlier draft applied `lower()` after stripping non-alphanumerics instead of before, which silently deleted the first letter of every capitalized name part. Fixed in the migration and in `implementation-plan.md`'s Task 0 snippet, but only a real run against Postgres proves the fix actually works (a typo re-introducing the wrong order wouldn't fail any build/lint check).
- `suggest_handle` calls `unaccent()`, installed via `create extension if not exists unaccent with schema extensions;` with `search_path = public, extensions` on the function — if you see `function unaccent(text) does not exist`, the extension likely landed in a different schema than expected (check `select extnamespace::regnamespace from pg_extension where extname = 'unaccent';`).

## 6. Known limitation — cascade deletes are currently blocked (fix before building account/workspace deletion)

`prevent_unsafe_member_removal` (the trigger from §5's last point) does not distinguish a direct, user-initiated membership removal from a `workspace_members` row being deleted as part of an `on delete cascade` from `auth.users` or `workspaces`. As written, it blocks **both**:

- Deleting an `auth.users` row cascades into the user's personal-workspace membership → the trigger's personal-workspace check raises → the entire user deletion fails.
- Deleting a `workspaces` row cascades into its members → since every family workspace has exactly one owner (there is no ownership-transfer or multi-owner mechanism yet), the last-owner check always raises → the workspace can never be deleted.

This is why `tests/helpers/supabase-test-clients.ts`'s `deleteTestUser` (used in the integration suite's `afterAll`) will start silently failing once these migrations are actually applied — it discards the error from `auth.admin.deleteUser`, so test users/workspaces will leak across every run rather than being cleaned up.

**This must be fixed before implementing any account-deletion or workspace-deletion feature**, and ideally before relying on the integration suite's automatic cleanup across multiple local runs. Suggested fix (not yet applied — this was found during the final review and deliberately parked rather than rushed into a second fix wave): make the trigger discriminate a direct delete from a cascade by checking whether the parent row is already gone by the time the child delete's trigger fires:

```sql
-- inside prevent_unsafe_member_removal(), before the existing checks:
if not exists (select 1 from workspaces where id = old.workspace_id) then
  return old; -- workspace itself is being deleted (cascade) — allow
end if;

if not exists (select 1 from auth.users where id = old.user_id) then
  return old; -- the user account itself is being deleted (cascade) — allow
end if;
```

Verify this actually works once migrations are applied for real — trigger visibility semantics during a cascading delete should make the parent row invisible to this query at the point the child trigger fires, but this has never been executed against a live Postgres instance and needs confirmation.
