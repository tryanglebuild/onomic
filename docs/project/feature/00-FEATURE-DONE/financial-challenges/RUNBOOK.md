# Financial Challenges — Runbook

**Status:** Implemented, tested, code-reviewed. **Correction (2026-09-12):** an earlier version of this doc claimed migrations 008/009 had not been applied to the hosted project — that was wrong. `.env.local` actually points `next dev` at the real hosted Supabase project (`ksagwqewkodflplzdplk.supabase.co`), not the local Docker stack, and migrations 008/009 were already live there. Not yet committed (per standing no-autonomous-commit rule) — everything is in the working tree on `feature/user-identity`.

## 1. Migrations

- `supabase/migrations/20260912120000_008_financial_challenges.sql` — `challenge_templates`, `financial_challenges`, `challenge_entries`, triggers, RLS, grants (including the delete policy/grant added during the final fix round). **Already applied to hosted** — do not edit in place going forward; ship further changes as new migrations, same as 009/010.
- `supabase/migrations/20260913000000_009_challenge_member_labels.sql` — replaces `get_workspace_members_with_email` to add `full_name`/`handle` columns via a `left join profiles`. Safe: only 2 other callers of that function exist (`app/(dashboard)/settings/family/page.tsx`, `app/(dashboard)/dashboard/page.tsx`), both unaffected by additive columns. **Already applied to hosted.**
- `supabase/migrations/20260914000000_010_no_spend_streak_target_zero.sql` — relaxes `financial_challenges`'s target-value CHECK so `no_spend_streak` alone may target 0 days; every other metric type still requires a strictly positive target. **Applied to hosted** (2026-09-12, via `supabase db push` after the project was linked and 001-009 were marked `applied` in the remote migration history with `supabase migration repair` — the remote history table was previously empty, since 001-009 had been applied out-of-band without ever going through the CLI). `supabase migration list` now shows all 10 migrations matched local↔remote.

## 1a. Dev server points at the hosted project, not local

`.env.local` carries the real project's URL/keys, and `next dev` reads `.env.local` — so testing locally (signup, creating challenges, etc.) writes to the same hosted database production code will eventually run against, not a disposable local copy. `.env.test.local` (local Docker stack creds) is only used by the Vitest RLS integration suite, not by the running dev server. Keep this in mind before creating test accounts/data by hand or via browser automation — they land on the real project. A `supabase db reset` only rebuilds the *local* stack (`127.0.0.1:54322`) and has no effect on hosted data or schema.

## 2. Local dev-stack quirk (recurring across this repo's features)

Fresh local Supabase Docker images do not auto-grant `select`/`insert`/`update`/`delete` to `anon`/`authenticated`/`service_role`. Migration 008 includes its own explicit grants, but a `supabase db reset` will also wipe any *runtime* grant fix previously applied by hand to older, already-committed tables (`workspaces`, `workspace_members`, `workspace_invites`, `profiles`, `reserved_handles`). If you reset the local stack and see permission-denied errors on those tables, reapply:

```sql
grant select, insert, update, delete on workspaces, workspace_members, workspace_invites, profiles, reserved_handles to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
-- then immediately re-narrow profiles.role (do not leave it blanket-writable):
revoke update on profiles from authenticated, anon;
grant update (full_name, handle, birth_date, avatar_path) on profiles to authenticated;
```

This is **local-only** — never run on the real hosted Supabase project, and never add it as a migration.

## 3. Known, deliberately deferred technical debt

`lib/challenges/queries.ts`'s `getChallengeEntries` (and the summary-building path that calls it) fetches all entries for a challenge with an unbounded `select *` and reduces in JS, rather than paginating the entry list or computing the sum via SQL `SUM()`. The original spec (§6) required both. This was flagged in the final whole-branch review and deliberately not fixed in this feature's SDD run — the fix needs a small architectural addition (a SQL aggregate RPC or view), not a mechanical patch.

**Cost if left as-is:** fine at expected single-family data volumes (a handful of active challenges, entries in the dozens-to-low-hundreds per challenge). Becomes a real query-count/latency problem at larger scale (many challenges, hundreds+ entries each — e.g. if this pattern were reused for a busier workspace or a longer-lived challenge history). Fix before reusing this pattern for a higher-volume feature (e.g. the planned Investment Challenges).

## 4. Environment/grant history during implementation (for context, not action)

- Task 1: migration written with `service_role` grants included from the start (lesson carried over from an earlier feature's SDD run in this repo).
- Task 4: user explicitly authorized a one-time local-only `GRANT` fix on pre-existing tables to unblock RLS integration tests (see §2 above).
- Final fix round: the same local-only GRANT fix was reapplied after a `supabase db reset` wiped it; the fix round's implementer was careful to re-run migration 004's `profiles.role` column-scoped revoke/grant afterward so that column didn't get reopened to blanket UPDATE. Independently verified by the scoped re-review.

## 4a. Test-account cleanup attempted, partially blocked

This session's UI polish work (dialog redesign, date picker, etc.) was verified via browser automation against the hosted project (see §1a) — this created ~49 throwaway `*@example.com` accounts between 2026-09-09 and 2026-09-12. With explicit user authorization, cleanup was attempted via the Auth Admin API (service role key): child rows in `financial_challenges`/`challenge_entries`/`workspace_invites` (the only non-cascading FKs to `auth.users`) were deleted first, but `admin.auth.admin.deleteUser()` still failed for every account with a generic "Database error deleting user" (500) — the real cause wasn't identifiable from the client-visible error, and diagnosing further would need direct access to the project's Postgres/Auth logs (Supabase Studio), which wasn't available in this session. **The ~49 test accounts are still present on the hosted project** — cost if left as-is: harmless clutter (recognizable by their `@example.com`/test-prefixed emails), but should be cleaned up via Supabase Studio (Auth → Users) or by someone with dashboard/log access when convenient.

## 5. Test coverage

`tests/unit/challenges-summary.test.ts` + `tests/integration/financial-challenges.rls.test.ts` — 38/38 passing (verified 2026-09-12). Covers: progress/status computation for all 4 metric types, RLS isolation (workspace-move block, `created_by` spoofing block on both challenge and entry insert, creator-only update/delete, entry immutability).
