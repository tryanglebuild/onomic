# Backend & Supabase Roadmap — Onomic

**Created:** 2026-09-09
**Last updated:** 2026-09-09
**Purpose:** A single gap-analysis document answering "what backend/Supabase work is still pending, and in what order should it be built" — synthesized from `docs/project/feature/*`, `docs/project/fix/*`, `docs/project-idea/onomic/ARCHITECTURE.md`, `docs/project-idea/stack/STACK.md`, and the actual current state of `supabase/migrations/` and the codebase (as of this date).

This is **not** a feature spec or an implementation plan — it's the precursor document meant to feed into writing those. Each section below points at what already exists (spec-only, or spec+plan, or shipped) so the next planning session doesn't have to re-derive it from eight separate folders.

---

## 1. How to read this document

- **Section 2** — the one correction to make to the existing docs before anything else: they claim something that is no longer true.
- **Section 3** — the dependency graph across every feature, live or planned. This determines build order.
- **Section 4** — per-feature backend gap breakdown, one subsection each, in dependency order.
- **Section 5** — infrastructure that zero features have started yet, needed by several of them (AI layer, scheduled jobs, domain logic).
- **Section 6** — known defects/parked issues that aren't tracked in `docs/project/fix/` yet, despite being real and documented findings.
- **Section 7** — recommended build order with reasoning.
- **Section 8** — open decisions someone needs to make before implementation-plan.md files can be written for the next feature.

---

## 2. Correction to existing docs: migrations ARE applied

`docs/project/feature/INDEX.md`, `family-workspaces/RUNBOOK.md`, and `user-identity/feature-spec.md` all currently state that migrations 001–004 have "never been applied to a live database (deliberately deferred)."

**This is stale.** During this session, all four existing migrations were applied for real, manually, via the Supabase SQL Editor, against the linked project (`ksagwqewkodflplzdplk`):

- `20260906120000_001_family_workspaces.sql`
- `20260906130000_002_workspace_members_with_email.sql`
- `20260907180000_003_profile_signup_fields.sql`
- `20260907190000_004_user_identity_handle_avatar.sql`

Confirmed live and working: `is_handle_available`, `suggest_handle` (both tested directly against the REST endpoint, returned correct results), signup/login flows, the dashboard shell built this session.

**Action before the next planning session:** update `INDEX.md`, `RUNBOOK.md`, and both feature-specs' status lines to reflect this. It also means every item in `RUNBOOK.md` §5 ("what to check on the very first real run") should actually be verified now that it's possible to verify them — none of those checks are confirmed done, they were just unblocked by this session's manual apply. In particular:

- The RBAC column-restriction check (`update profiles set role = 'admin' ...` must fail) — **not yet verified**, and it's the single most important one per the RUNBOOK's own words.
- `reserved_handles` rejection, avatar upload size/MIME rejection, `suggest_handle` accent-stripping correctness — **not yet verified**.
- The RLS integration test suite (`tests/integration/family-workspaces.rls.test.ts`) still cannot run — it needs `SUPABASE_SERVICE_ROLE_KEY` in a gitignored `.env.test.local`, which doesn't exist in this environment. Either point it at the same linked hosted project (service-role key from Supabase project settings) or set up the local Supabase CLI stack (`supabase start`) and re-point at that instead.

The migration file naming sequence continues from `004` — the next migration (whichever feature ships first) is `005_<name>.sql`.

---

## 3. Dependency graph (all features, shipped and planned)

```
Family Workspaces  (🔵 in progress, applied)
  └─ User Identity: Handle & Avatar  (🔵 in progress, applied)
  └─ Manual Transactions  (🟠 spec only, no plan)          ← the critical-path bottleneck
       ├─ Recurring Transactions  (🟠 spec only, no plan)
       ├─ CSV Import  (🟠 spec only, no plan)
       ├─ AI Transaction Categorization  (🟠 spec only, no plan)
       └─ Financial Challenges  (🟠 spec only, no plan) ──┐
  └─ Savings Vaults  (🟠 spec only, no plan) ──────────────┘ (optional link via challenges.vault_id)

Backlog (no spec written yet — see feature/INDEX.md "Backlog / Ideas"):
  Investment Profile Onboarding, Investment Watchlist & Portfolio, Investment Challenges,
  AI Financial Advisor Layer, Financial Health Score, "What if" Simulator, Monthly Recap,
  Deviation Alerts, Data Export, Revolut Open Banking Integration
```

**The single most important fact for planning:** five of the six drafted-but-unbuilt features (Recurring Transactions, CSV Import, AI Categorization, and — transitively through either of those two or directly — Financial Challenges) all sit **behind Manual Transactions**. Nothing else meaningful can be built in the finance domain until `categories` and `transactions` exist. Savings Vaults is the only drafted feature that does **not** depend on Manual Transactions (it only needs Family Workspaces, already live) — it could be built in parallel with or even before Manual Transactions if there's a reason to sequence it first, though `vault_contributions.transaction_id` (optional FK) means full richness still wants `transactions` to exist.

---

## 4. Per-feature backend gap breakdown

### 4.1 Manual Transactions — 🟠 Draft, spec only, no implementation-plan.md

**Status:** `feature-spec.md` approved 2026-09-06. No `implementation-plan.md` exists yet — this is the next planning task.

**Schema needed (migration `005`):**

```
categories
  id            uuid PK
  workspace_id  uuid FK -> workspaces, nullable (null = system-global category)
  name          text
  type          enum('expense','income')
  icon          text
  color         text
  parent_id     uuid FK -> categories (self-referencing, nullable — subcategories)
  is_system     boolean

transactions
  id                 uuid PK
  workspace_id       uuid FK -> workspaces, cascade delete
  created_by         uuid FK -> auth.users
  category_id        uuid FK -> categories
  type               enum('expense','income')
  amount             numeric(12,2)
  currency           text (ISO 4217, default 'EUR')
  description        text, nullable
  occurred_at        date
  source             enum('manual','recurring','csv_import','ai_suggested','revolut_sync')
  recurring_rule_id  uuid FK -> recurring_rules, nullable   -- FK target doesn't exist until Recurring Transactions ships; nullable + added later, or create the column now and defer the FK constraint
  metadata           jsonb, nullable
  created_at         timestamptz
```

**RLS:** workspace-membership-scoped read/write on both tables (same `is_workspace_member` helper pattern already established in `family-workspaces` migration 001). Global categories (`workspace_id IS NULL`) readable by everyone, writable by no client role.

**Confirmed decisions already locked in the spec** (do not re-litigate during planning): transactions belong to the workspace not an individual owner (any member can edit/delete); categories are both system-global and per-workspace; subcategories via self-referencing `parent_id`; `currency` field present from day one even though only EUR is used initially.

**Open implementation questions not yet answered anywhere:**
- Should `transactions.recurring_rule_id` and the other `source` enum values (`csv_import`, `ai_suggested`, `revolut_sync`) be added to the schema now (nullable, no FK yet where the target table doesn't exist) or deferred to each dependent feature's own migration? The spec's Out-of-Scope section explicitly says these are "prepared in the schema but implemented by their own features" — meaning the intent is to add them now. Decide during the implementation-plan write-up.
- No API routes are specified — this being a Next.js app with Server Actions already the established pattern (see `app/(auth)/actions.ts`, `app/(dashboard)/*/actions.ts`), the plan should default to Server Actions for create/edit/delete, not a REST `app/api/` route, unless a reason emerges (none currently does).

**UI already scaffolded, waiting on this:** `/transactions` and `/accounts` currently render `<ComingSoon>` placeholders (built this session, `app/(dashboard)/transactions/page.tsx`, `app/(dashboard)/accounts/page.tsx`) — this feature is what turns them real.

---

### 4.2 Recurring Transactions — 🟠 Draft, spec only, no implementation-plan.md

**Depends on:** Manual Transactions (hard dependency — needs `transactions`/`categories` to exist).

**Schema needed:**

```
recurring_rules
  id            uuid PK
  workspace_id  uuid FK -> workspaces, cascade delete
  category_id   uuid FK -> categories
  amount        numeric(12,2)
  currency      text
  description   text
  frequency     enum('monthly','weekly','yearly')
  anchor_date   date
  start_date    date
  end_date      date, nullable
  active        boolean
  created_by    uuid FK -> auth.users
```

**Idempotency constraint (already decided in spec):** unique `(recurring_rule_id, period_key)` on the generated transaction, upserted by the job — never double-posts if the job runs twice for the same period.

**Infrastructure gap — this is the important one:** the materialization job (turns a due `recurring_rule` into a real `transactions` row) needs **scheduled-job infrastructure that does not exist anywhere in this codebase yet.** `STACK.md` names Supabase Edge Functions with cron as the intended mechanism (`supabase/functions/` — confirmed empty/nonexistent right now). This is the first feature that needs it. Building it requires:
- `supabase functions new <name>` scaffold + `supabase/functions/<name>/index.ts` (Deno runtime, different from the Next.js app code)
- A `pg_cron` schedule (Postgres extension) or Supabase's dashboard-configured cron trigger calling the function on a daily schedule
- The function needs elevated privilege (service role) to write transactions across every workspace with a due rule, while never exposing that privilege to any client-reachable endpoint (per the spec's own Security Considerations)

**Recommendation:** treat "set up the Edge Functions + cron scheduling mechanism" as its own first phase of this feature's implementation-plan, since Financial Challenges will need the exact same mechanism (a different scheduled job — progress recalculation) shortly after. Consider whether the *mechanism* (how a cron-triggered Edge Function authenticates and writes across workspaces) should be built once, generically, rather than twice.

---

### 4.3 CSV Import — 🟠 Draft, spec only, no implementation-plan.md

**Depends on:** Manual Transactions.

**Schema needed:**

```
import_presets
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  name            text
  column_mapping  jsonb
  created_by      uuid FK -> auth.users
```

No other new tables — reuses `transactions`.

**Infrastructure gap:** server-side CSV parsing (spec explicitly requires server-side, not client-side, "to avoid exposing parsing logic and allow consistent validation"). This is a Next.js Route Handler (`app/api/import/*` or a Server Action accepting a `File`) — nothing like this exists in the codebase yet (no file-upload handling at all beyond the avatar upload in `user-identity`, which is a much simpler single-image-to-Storage flow, not a parse-and-preview pipeline). The avatar upload flow (`components/settings/avatar-upload-form.tsx`, `lib/storage/avatar.ts`) is the closest existing reference for the Storage-interaction half, but the CSV parsing/preview/duplicate-detection logic is entirely new.

**Note on file handling:** per spec, the uploaded file is never stored permanently — parsed in memory/temp storage, discarded after confirmation or abandonment. This means no Storage bucket is needed for this feature (unlike avatars), just size/type validation at the upload boundary.

---

### 4.4 AI Transaction Categorization — 🟠 Draft, spec only, no implementation-plan.md

**Depends on:** Manual Transactions.

**Schema needed:** none. Reuses `transactions.metadata` (jsonb) to optionally record `{ ai_suggested_category_id, ai_confidence }`.

**Infrastructure gap — the biggest one in this document:** this is **the first AI integration anywhere in the app.** Confirmed via this session's codebase check: no `lib/ai/` directory, no OpenRouter or OpenAI SDK dependency in `package.json`, no `OPENROUTER_API_KEY` (or equivalent) in `.env.local`. Everything named below needs to be built from zero:

- `lib/ai/AIService` module (per `ARCHITECTURE.md` §4 and `STACK.md` §"OpenRouter para IA" — the **single, isolated port of entry** to OpenRouter; nothing else in the app is meant to call the LLM API directly)
- `categorizeTransaction(description, amount, categories[]) → { categoryId, confidence }` as this module's first method
- `POST /api/ai/categorize` Route Handler — validates the authenticated user is a member of the `workspaceId` in the request body before exposing that workspace's category list to the prompt
- `OPENROUTER_API_KEY` env var, server-side only
- Rate limiting on the endpoint (spec requirement, mechanism not yet decided — see Open Decisions §8)
- Model choice: spec explicitly defers this ("a definir na fase de implementação... recomenda-se um modelo económico/rápido") — needs a decision during the implementation-plan write-up, not before

**Why this one matters beyond itself:** per `ARCHITECTURE.md` §4 ("Dados → Cálculo → IA → Apresentação") and the spec's own §10, this feature is the **architectural precedent** the future AI Financial Advisor Layer (currently just a backlog bullet, no spec) will extend. Getting `lib/ai/AIService`'s shape right here — structured data in, structured confirmable suggestion out, human always confirms — matters beyond this one feature's scope. Worth deliberately designing `AIService` as a class/module that can grow additional methods (e.g. a future `explainPortfolio`, `summarizeMonth`) rather than a single-purpose function, even though only one method is needed for v1.

---

### 4.5 Savings Vaults — 🟠 Draft, spec only, no implementation-plan.md

**Depends on:** Family Workspaces only (already live). Optional soft link to Manual Transactions via `vault_contributions.transaction_id`.

**Schema needed:**

```
vaults
  id             uuid PK
  workspace_id   uuid FK -> workspaces, cascade delete
  name           text
  icon           text
  color          text
  target_amount  numeric(12,2), nullable
  target_date    date, nullable
  status         enum('active','completed','archived')
  created_by     uuid FK -> auth.users
  created_at     timestamptz

vault_contributions
  id              uuid PK
  vault_id        uuid FK -> vaults, cascade delete
  user_id         uuid FK -> auth.users
  amount          numeric(12,2)  -- can be negative (withdrawal from the virtual allocation)
  occurred_at     date
  note            text, nullable
  transaction_id  uuid FK -> transactions, nullable  -- FK target doesn't exist until Manual Transactions ships
  created_at      timestamptz
```

**Balance/progress:** always derived via `SUM(vault_contributions.amount)` — never a stored column. This is the same "derive, never store" principle the spec for Financial Challenges also follows for progress, and matches `ARCHITECTURE.md`'s core principle: no score/progress is ever written directly, only computed from source rows.

**This is the one drafted feature that could ship independently of Manual Transactions** if there's a product reason to prioritize it (e.g. a visible savings-goal feature before transaction tracking is ready) — the `transaction_id` link is nullable and optional. Its RLS pattern is a straight copy of the already-proven `is_workspace_member` approach.

---

### 4.6 Financial Challenges — 🟠 Draft, spec only, no implementation-plan.md

**Depends on:** Manual Transactions (hard, for progress calculation) + optionally Savings Vaults (soft, via `vault_id`).

**Schema needed:**

```
challenge_templates
  id              uuid PK
  key             text (unique)
  name            text
  description     text
  metric_type     enum('spending_limit','savings_target','category_reduction','no_spend_streak')
  default_params  jsonb

challenges
  id             uuid PK
  workspace_id   uuid FK -> workspaces, cascade delete
  template_id    uuid FK -> challenge_templates, nullable
  name           text
  metric_type    enum('spending_limit','savings_target','category_reduction','no_spend_streak')
  target_value   numeric(12,2)
  category_id    uuid FK -> categories, nullable
  vault_id       uuid FK -> vaults, nullable
  start_date     date
  end_date       date
  status         enum('active','completed','failed','abandoned')
  created_by     uuid FK -> auth.users
```

**RLS:** `challenges` scoped to workspace members; `challenge_templates` is a global read-only catalog (no `workspace_id`, no sensitive data — public read).

**Infrastructure gap:** same class of problem as Recurring Transactions — a **progress-recalculation job** running on an elevated-privilege schedule (Edge Function), reading each active challenge's linked `transactions` and computing `status`. This is a second consumer of whatever scheduled-job mechanism gets built for Recurring Transactions — strong argument for designing that mechanism generically the first time (see §4.2 recommendation and §7 build order).

---

## 5. Infrastructure that no feature has started yet

None of these exist anywhere in the current codebase (verified this session: `supabase/functions/`, `lib/ai/`, `lib/domain/`, `lib/market/` are all absent). Multiple planned features need them, so each is a shared foundation piece, not a single feature's job:

| Piece | Needed by | Notes |
|---|---|---|
| **Supabase Edge Functions + scheduling** (`supabase/functions/`, cron trigger) | Recurring Transactions (materialize rules), Financial Challenges (recalculate progress) | First real use of Deno-runtime Edge Functions in this project. Consider building the auth/elevated-privilege pattern once, generically, rather than per-feature. |
| **`lib/ai/AIService`** | AI Transaction Categorization (first consumer), future AI Financial Advisor Layer (backlog) | Isolated OpenRouter port per `ARCHITECTURE.md`. Design for a second method even though v1 only needs one. |
| **`lib/domain/`** (pure business logic — challenge progress rules, vault math) | Financial Challenges, Savings Vaults | Named in `STACK.md`'s intended folder structure but not yet created. Keeps calculation logic testable/pure, separate from the Edge Function/route-handler plumbing that calls it. |
| **`lib/market/CoinGeckoService`** | Investment Tracking (backlog, no spec yet) | Not urgent — no drafted feature needs it yet. Listed here only so it isn't rediscovered as a surprise later. |
| **`OPENROUTER_API_KEY`** env var | AI Transaction Categorization | Add to `.env.local`, `.env.local.example`, and the RUNBOOK-style checklist for whichever feature ships it first. |

---

## 6. Known defects/parked issues not tracked in `docs/project/fix/`

`docs/project/fix/INDEX.md` currently says *"No fixes identified yet — the project has not started implementation."* That line is also stale — at least one concrete, documented defect already exists and should be formally tracked:

### 6.1 `prevent_unsafe_member_removal` blocks cascade deletes (family-workspaces)

Documented in `docs/project/feature/family-workspaces/RUNBOOK.md` §6, found during that feature's final review and deliberately parked rather than rushed into a fix wave. The trigger cannot currently distinguish a direct, user-initiated membership removal from a `workspace_members` row being deleted as a side effect of `auth.users` or `workspaces` cascading. As written, it blocks **both** — meaning deleting a user account, or deleting a family workspace, currently fails outright. A suggested SQL fix is written out in the RUNBOOK but has never been verified against a live database.

**This blocks any future account-deletion or workspace-deletion feature**, and it also explains why the integration test suite's `afterAll` cleanup (`deleteTestUser`) silently leaks test users/workspaces on every run once the migrations are live — worth fixing before that test suite gets real use.

**Recommendation:** create `docs/project/fix/cascade-delete-blocked/` following `fix/TEMPLATE.md` (`current-state.md` / `objective.md` / `implementation-plan.md`), add it to `fix/INDEX.md`, and treat it as a small, high-priority, standalone fix — it's a few lines of SQL, already drafted, just needs to be applied and verified against the now-live database.

### 6.2 RUNBOOK §5 verification items — not yet confirmed against the live database

Section 2 of this document already covers this in detail (the migrations are applied now, but the specific behavioral checks RUNBOOK §5 lists were written *for* that first real run and have not actually been executed/confirmed). Not a defect yet — but each unverified item is a candidate defect until someone runs the check. Worth a lightweight tracked item, or folding into whichever feature's implementation-plan touches that code path next.

---

## 7. Recommended build order

Based purely on the dependency graph in §3 (not on product priority, which is a separate call):

1. **Fix §6.1** (cascade-delete trigger) — small, already-drafted, unblocks nothing else specifically but removes a landmine before any workspace/account-lifecycle work happens, and fixes the test-suite leak.
2. **Manual Transactions** — the load-bearing dependency for four of the six drafted features. Nothing else in the finance domain can start in earnest until `categories`/`transactions` exist. Write its `implementation-plan.md` next.
3. **Savings Vaults** — could run in parallel with step 2 (only depends on Family Workspaces, already live), or immediately after. Independent of the Edge Functions infrastructure work.
4. **Scheduled-job infrastructure** (Edge Functions + cron mechanism, §5) — build once, generically, as its own small infrastructure phase, ideally as part of whichever of Recurring Transactions / Financial Challenges is tackled first, but designed for reuse by the second.
5. **Recurring Transactions** and **CSV Import** — both depend only on Manual Transactions, no dependency on each other; can be sequenced in either order or parallelized once step 2 is done.
6. **AI Transaction Categorization** — depends only on Manual Transactions too, but is architecturally the highest-leverage of the remaining drafted features (establishes `lib/ai/AIService`, the pattern the future AI Advisor Layer extends). Consider prioritizing it earlier than its dependency graph strictly requires, if establishing that pattern correctly matters more than shipping order.
7. **Financial Challenges** — depends on Manual Transactions (required) and benefits from Savings Vaults existing (optional `vault_id` link) and from the scheduled-job mechanism already existing (step 4). Naturally the last of the six drafted features to land.

None of the **Backlog / Ideas** items (Investment Tracking sub-project, AI Financial Advisor Layer, Financial Health Score, etc.) have a spec yet — per `feature/TEMPLATE.md`'s own rule, a feature that isn't documented with a spec+plan "is invisible to future development sessions." They stay out of this roadmap's ordering until someone writes their `feature-spec.md`.

---

## 8. Open decisions needed before writing the next `implementation-plan.md`

These are genuine unknowns the specs deliberately left open — not things this document can resolve on its own:

1. **Manual Transactions:** add the `recurring_rule_id` column and the full `source` enum to `transactions` now (nullable, no premature FK), or let each dependent feature alter the table when it ships? The spec's wording implies "now," but this should be an explicit implementation-plan decision, not an inferred one.
2. **API surface pattern:** confirm Server Actions (the established pattern in this codebase — see `app/(auth)/actions.ts`, `app/(dashboard)/settings/*/actions.ts`) as the default for Manual Transactions CRUD, reserving `app/api/*` Route Handlers only for cases that genuinely need them (AI Categorization's endpoint is explicitly a Route Handler per its spec; CSV Import's server-side parse likely needs one too, for `multipart/form-data` handling).
3. **Scheduled-job auth pattern:** how does a cron-triggered Edge Function authenticate to write across every workspace with a due rule/challenge, without ever exposing that elevated privilege to a client-reachable path? Needs a concrete design (likely: Edge Function uses the service-role key internally, is invoked only by Supabase's own cron trigger — never has an HTTP-reachable endpoint a client could hit) before Recurring Transactions' implementation-plan can be written.
4. **Rate limiting mechanism:** both `is_handle_available`/`suggest_handle` (already shipped, flagged as an open question in `user-identity/implementation-plan.md`) and the future `/api/ai/categorize` endpoint need rate limiting, and no mechanism has been chosen anywhere in the codebase yet (no middleware, no Supabase-side throttling configured). Worth deciding once, generically, rather than per-endpoint.
5. **AI model choice for categorization:** explicitly deferred by the spec to implementation time. Needs an actual OpenRouter model id chosen (spec recommends "an economical/fast model" given it's simple classification, not long-form generation).
6. **Test environment for RLS/integration tests:** per §2, decide whether `tests/integration/*` should run against a local Supabase CLI stack (`supabase start`) or against the linked hosted project via a service-role key in `.env.test.local`. This blocks re-verifying anything in `RUNBOOK.md` §5, and will block the same class of check for every future feature's own RLS tests.
