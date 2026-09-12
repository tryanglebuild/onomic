# Feature Index — Onomic

**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-12 00:00

This is a living document. It tracks every feature that has been conceived, planned, or shipped in the Onomic project. Update this file whenever a feature is created, progresses to a new status, or is completed.

Use this index to maintain a clear picture of the product backlog and its progress. A feature that appears here has been thought through — it has a spec, a plan, and a clear user objective. A feature that is not here is invisible to future development sessions.

For instructions on how to create a new feature folder and what each document should contain, see [TEMPLATE.md](./TEMPLATE.md). For the overall system architecture these features fit into, see [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## Active Features

| Feature | Status | Description | Created | Last Updated |
|---|---|---|---|---|
| [Manual Transactions](#manual-transactions) | 🟠 Draft | Record categorized expenses/income within a workspace | 2026-09-06 | 2026-09-06 |
| [Recurring Transactions](#recurring-transactions) | 🟠 Draft | Auto-generate fixed monthly/weekly/yearly expenses and income | 2026-09-06 | 2026-09-06 |
| [CSV Import](#csv-import) | 🟠 Draft | Bulk-import transaction history from a bank-exported CSV | 2026-09-06 | 2026-09-06 |
| [AI Transaction Categorization](#ai-transaction-categorization) | 🟠 Draft | Suggest a transaction's category via LLM, confirmed by the user | 2026-09-06 | 2026-09-06 |
| [Savings Vaults](#savings-vaults) | 🟠 Draft | Revolut/Nubank-style savings goals via virtual allocation, individual + shared | 2026-09-06 | 2026-09-06 |

---

## Shipped Features

| Feature | Status | Description | Created | Last Updated |
|---|---|---|---|---|
| [Family Workspaces](#family-workspaces) | 🟢 Shipped | Multi-tenant foundation — personal + shared family spaces with isolated data (RLS) + platform RBAC foundation | 2026-09-06 | 2026-09-11 |
| [User Identity: Handle & Avatar](#user-identity-handle--avatar) | 🟢 Shipped | Unique `@handle` chosen at signup + self-service avatar upload, extending `profiles` | 2026-09-07 | 2026-09-11 |
| [Onboarding](#onboarding) | 🟢 Shipped | Resumable 8-step onboarding modal over /dashboard — objective, computed risk profile via behavioral questions, investment target, asset preference | 2026-09-10 | 2026-09-11 |
| [Financial Challenges](#financial-challenges) | 🟢 Shipped | Time-boxed financial goals (templates + custom), progress derived from a per-challenge entries log — no Manual Transactions/Savings Vaults dependency | 2026-09-06 | 2026-09-12 |

Docs for shipped features move to [`00-FEATURE-DONE/`](./00-FEATURE-DONE/).

---

## Backlog / Ideas

_Features mentioned during planning but not yet documented with a spec of their own:_

- **Investment Profile Onboarding** — risk profile, monthly/quarterly investment target, purpose, asset type preference (multi-select: crypto, stocks, ETFs). Steps 2–4 of this are now delivered by the [Onboarding](#onboarding) feature's `onboarding_profiles` table — when Investment Tracking gets its own spec, it should read from there rather than re-collecting the same fields.
- **Investment Watchlist & Portfolio** — carried over and generalized from `docs/project-idea/AI_Crypto_Analyst_Proposta.md` (Opportunity Score, Risk Score, portfolio tracking) beyond crypto-only. Part of **Investment Tracking**.
- **Investment Challenges** — same template+custom pattern as Financial Challenges, applied to investment targets (e.g. "invest X€ in N months"). Part of **Investment Tracking**.
- **AI Financial Advisor Layer** — cross-domain AI that reads both spending and investment data to produce recommendations. Depends on Personal/Family Finance and Investment Tracking both existing.
- **Financial Health Score** — a single workspace-level score combining savings rate, goal progress, investment diversification, and challenge adherence.
- **"What if" Simulator** — simulate the impact of a spending change on a goal/challenge before committing to it.
- **Monthly Recap** — AI-generated periodic summary (spending vs. last month, goal progress, budget suggestions).
- **Deviation Alerts** — proactively warn when the current pace won't hit a goal/challenge deadline, not just on completion.
- **Data Export** — CSV/PDF export of the user's own data, as a trust/transparency feature.
- **Revolut Open Banking Integration** — future, non-MVP. Requires a certified Open Banking/PSD2 aggregator (e.g. TrueLayer, Salt Edge); data always scoped to the account owner's personal workspace only. See `docs/project-idea/stack/STACK.md` §6.

---

---

## Feature Details

---

### Onboarding

**Folder:** [`00-FEATURE-DONE/onboarding/`](./00-FEATURE-DONE/onboarding/)
**Status:** 🟢 Shipped (v2 — modal + expanded investor profile) — all 7 phases implemented, code-reviewed, and verified against the spec (schema, types, risk scoring, step UI, modal behavior, auto-open, route stub, signup redirect, navbar reminder, RLS all confirmed live in the codebase). v1 (5-step page) is superseded by this revision.
**Created:** 2026-09-10 00:00
**Last updated:** 2026-09-11 00:00

#### What It Enables

An 8-step modal shown over `/dashboard` right after signup — objective, investment horizon, experience, a behavioral loss-reaction question, purpose, investment target, and asset preference — with `risk_profile` calculated from the behavioral answers rather than self-declared. Resumable via a navbar badge, cannot be dismissed except through its own buttons, never blocks the dashboard underneath.

#### Why It Matters

Every future AI/recommendation feature (Investment Tracking, AI Financial Advisor Layer) needs these signals and there is currently nowhere they're captured. This delivers the Investment Profile Onboarding backlog item with a real suitability questionnaire instead of a single self-declared label.

#### Scope

- `onboarding_profiles` table (1:1 with `auth.users`, typed columns + `CHECK` constraints, no `jsonb`) — migration edited in place, never applied to any database
- Modal (`@radix-ui/react-dialog`) over `/dashboard`, auto-opened once via `?onboarding=1` on the post-signup redirect
- `risk_profile` computed server-side from horizon + experience + loss-reaction, never chosen directly
- Quiet "Completar perfil" indicator in the dashboard navbar whenever `completed_at` is unset — opens the same modal
- Excludes: editing answers after completion, any feature reading this data yet, mid-step autosave, gamification, explaining the scoring formula to the user

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./00-FEATURE-DONE/onboarding/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved (v2) |
| [implementation-plan.md](./00-FEATURE-DONE/onboarding/implementation-plan.md) | 7-phase technical plan with SQL, Server Actions, and UI | Implemented |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| 1 | Migration edit: 4 new columns, drop `skipped_at`, `current_step` range 1–8 | ✅ Done |
| 2 | Hand-authored types | ✅ Done |
| 3 | Risk scoring (tested) + step data + Server Actions | ✅ Done |
| 4 | 8 step components (4 new, 3 edited, 1 deleted) | ✅ Done |
| 5 | Radix Dialog modal, flow controller, auto-open detector, route stub | ✅ Done |
| 6 | Dashboard shell/navbar/reminder integration | ✅ Done |
| 7 | Signup redirect | ✅ Done |

Note: the modal's final visual design (navy split-panel with an integrated step indicator) and the flow controller (owns `current_step` as internal state rather than a parent-supplied prop) evolved past this plan's original code during a later design pass — the phases above are functionally complete against the feature spec, not necessarily byte-for-byte against this plan's original snippets.

---

### Family Workspaces

**Folder:** [`00-FEATURE-DONE/family-workspaces/`](./00-FEATURE-DONE/family-workspaces/)
**Status:** 🟢 Shipped — all 11 tasks implemented, code-reviewed, and confirmed live on the real hosted Supabase project (verified via repeated end-to-end signup/workspace-creation runs during later feature work). One known limitation remains genuinely open, not just documentation staleness: cascade deletes are still blocked (see [`RUNBOOK.md`](./00-FEATURE-DONE/family-workspaces/RUNBOOK.md) §6) — fix before building any account/workspace deletion feature.
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-11 00:00 (confirmed live; migrations were applied to the real project at some point between 2026-09-07 and 2026-09-11 — see RUNBOOK.md)

#### What It Enables

A user can manage their own finances in an isolated personal space and, independently, participate in one or more shared family spaces — switching context via a workspace selector, with data isolation enforced at the database level.

#### Why It Matters

Every other feature in the product depends on a workspace to attach data to. Without this foundation, there is no safe way to let multiple people share financial data without risking cross-family data leaks.

#### Scope

- Personal workspace auto-created on signup, 1:1, never accepts members
- Family workspace creation, invites (signed token, expiring), member roles (owner/member)
- Row Level Security as the isolation mechanism, not just app-level checks
- `profiles` table with a platform-level `role` column (`user`/`admin`/`support`) — RBAC foundation for a future backoffice, not editable by any client yet
- Excludes: granular permission levels beyond owner/member, workspace ownership transfer, any backoffice UI or admin-role-based access logic

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./00-FEATURE-DONE/family-workspaces/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| [implementation-plan.md](./00-FEATURE-DONE/family-workspaces/implementation-plan.md) | 11-task technical plan with SQL, RLS, RPCs, and UI | Implemented |
| [RUNBOOK.md](./00-FEATURE-DONE/family-workspaces/RUNBOOK.md) | Migration checklist + known-limitations record | Migrations applied; §6 limitation still open |

#### Phase Tracker

All 11 tasks are code-complete and passed task-scoped review (some with fix rounds) plus a final whole-branch review with its own fix wave. Migrations are confirmed applied to the live project — see [RUNBOOK.md](./00-FEATURE-DONE/family-workspaces/RUNBOOK.md).

| Phase | Description | Status |
|---|---|---|
| 0 | Next.js scaffold | ✅ Done |
| 1 | Supabase deps + test tooling | ✅ Done |
| 2 | Supabase client helpers + middleware | ✅ Done |
| 3 | Schema, RLS, profiles/RBAC foundation, workspace RPC functions | ✅ Done |
| 4 | Invite token signing utility | ✅ Done |
| 5 | Auth pages | ✅ Done |
| 6 | Workspace queries + selector UI | ✅ Done |
| 7 | Create family workspace flow | ✅ Done |
| 8 | Invite creation | ✅ Done |
| 9 | Invite acceptance | ✅ Done |
| 10 | Members management UI | ✅ Done |

---

### User Identity: Handle & Avatar

**Folder:** [`00-FEATURE-DONE/user-identity/`](./00-FEATURE-DONE/user-identity/)
**Status:** 🟢 Shipped — all 7 tasks implemented, code-reviewed, and confirmed live: the signup form genuinely collects and validates a handle end-to-end against the real hosted project (verified repeatedly during later feature work). See [`RUNBOOK.md`](./00-FEATURE-DONE/family-workspaces/RUNBOOK.md) (shared with Family Workspaces, since migration 004 depends on 001-003).
**Created:** 2026-09-07 00:00
**Last updated:** 2026-09-11 00:00 (confirmed live; see RUNBOOK.md)

#### What It Enables

Every user gets a unique, human-readable `@handle` chosen at signup (with a "suggest" button deriving one from their name) and a self-service avatar they can upload on a new `/settings/profile` page.

#### Why It Matters

An email address and a UUID aren't an identity users recognize each other by. This gives the platform a stable, unique handle and a visual identity, both self-service, without weakening the RLS guarantees already established on `profiles`.

#### Scope

- `profiles.handle` (unique, validated format, reserved-word list) + `profiles.avatar_path`
- `is_handle_available`/`suggest_handle` `SECURITY DEFINER` functions (same pattern as `get_workspace_members_with_email`)
- First-ever `UPDATE` policy on `profiles`, column-restricted via `GRANT` so `role` stays server-only
- Public `avatars` Storage bucket with size/type limits enforced at the bucket level, RLS restricting writes to the user's own folder
- Excludes: changing handle after signup, avatar history/cropping, showing avatar/handle in existing member lists (data model supports it, UI change deferred)

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./00-FEATURE-DONE/user-identity/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| [implementation-plan.md](./00-FEATURE-DONE/user-identity/implementation-plan.md) | 7-task technical plan with SQL, RLS, Storage, and UI | Implemented |

#### Phase Tracker

All 7 tasks are code-complete and passed task-scoped review (Tasks 0 and 4 needed one fix round each) plus a final whole-branch review with its own fix wave (1 Critical + 6 Important findings, all fixed and re-verified). Migration is confirmed applied to the live project — see [`RUNBOOK.md`](./00-FEATURE-DONE/family-workspaces/RUNBOOK.md).

| Phase | Description | Status |
|---|---|---|
| 0 | Migration: schema, RLS, reserved-handle trigger, functions, avatars bucket | ✅ Done |
| 1 | Hand-authored generated types | ✅ Done |
| 2 | Shared handle validation | ✅ Done |
| 3 | Handle actions + updated signUp | ✅ Done |
| 4 | Signup form with handle field | ✅ Done |
| 5 | Avatar upload + profile page | ✅ Done |
| 6 | Navigation entry point | ✅ Done |

---

### Financial Challenges

**Folder:** [`00-FEATURE-DONE/financial-challenges/`](./00-FEATURE-DONE/financial-challenges/)
**Status:** 🟢 Shipped (v2 — entries-based progress) — all 7 tasks implemented, task-reviewed (2 needed one fix round each, both tracing to informal-register defects in the plan's own authored text), plus a final whole-branch review on the most capable model that found and fixed 3 RLS security gaps (cross-tenant workspace move, `created_by` spoofing on two insert policies), a missing spec-mandated delete capability, and several UI/test-coverage issues. Migrations not yet applied to the hosted project; nothing committed yet — see [RUNBOOK.md](./00-FEATURE-DONE/financial-challenges/RUNBOOK.md).
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-12 00:00

#### What It Enables

A user or family can activate a time-boxed financial goal — spending limit, savings target, category reduction, or no-spend streak — from a template or fully custom, with progress always calculated from a per-challenge `challenge_entries` log the user/family logs against (not a platform-wide transaction ledger, which doesn't exist yet).

#### Why It Matters

Turns financial goals into something actively tracked, not just declared, without waiting on Manual Transactions or Savings Vaults — neither of which exists in the codebase yet. Also the first feature deliberately structured so a future AI agent can read and cross-reference a user's/family's challenges (`getChallengeSummary()`/`listChallengeSummaries()` as the stable, typed contract).

#### Scope

- `challenge_templates` catalog + fully custom challenge creation
- Progress always derived from `challenge_entries` (own table, scoped per challenge), never manually reported
- `owner_user_id` nullable: family-shared vs. personal challenge within a shared workspace
- Excludes (deliberately, v2): `vault_id` link to Savings Vaults (doesn't exist yet), recurring auto-relaunch, gamification, proactive deviation alerts, SQL-side pagination/aggregation for entry loading (documented tech debt, see RUNBOOK.md §3)

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./00-FEATURE-DONE/financial-challenges/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved (v2) |
| [implementation-plan.md](./00-FEATURE-DONE/financial-challenges/implementation-plan.md) | 7-task technical plan with SQL, RLS, Server Actions, and UI | Implemented |
| [RUNBOOK.md](./00-FEATURE-DONE/financial-challenges/RUNBOOK.md) | Migrations to apply, local dev-stack grant quirk, deferred tech debt, test coverage | Migrations pending on hosted project |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| 1 | Migration: `challenge_templates`/`financial_challenges`/`challenge_entries`, triggers, RLS, grants | ✅ Done |
| 2 | Pure progress-calculation module (`lib/challenges/summary.ts`) | ✅ Done |
| 3 | Query layer (`lib/challenges/queries.ts`) | ✅ Done |
| 4 | RLS integration tests | ✅ Done |
| 5 | Server actions (`lib/challenges/actions.ts`) | ✅ Done |
| 6 | List page + create-challenge dialog | ✅ Done (1 fix round) |
| 7 | Detail page + add-entry/edit/abandon/delete | ✅ Done (1 fix round) |
| — | Final whole-branch review + fix round | ✅ Done, approved-as-is |

---

### Manual Transactions

**Folder:** [`manual-transactions/`](./manual-transactions/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

A user can record an expense or income in seconds, categorized, inside their active workspace, with the result immediately visible to all workspace members.

#### Why It Matters

This is the most frequent action in the product and the raw data every other feature (vaults, challenges, future AI recommendations) derives its calculations from.

#### Scope

- Manual expense/income entry with category, amount, currency, date, description
- System-wide default categories + workspace-specific custom categories, with subcategories
- Excludes: bulk editing, attachments, splitting a transaction across categories

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./manual-transactions/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

### Recurring Transactions

**Folder:** [`recurring-transactions/`](./recurring-transactions/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

A user can define a fixed monthly/weekly/yearly expense or income once, and have the system generate the corresponding transaction automatically every period.

#### Why It Matters

Removes the friction of re-entering the same rent, salary, or subscription every month, and keeps recurring cash flow reflected in the dashboard without manual upkeep.

#### Scope

- Recurring rule creation (amount, category, frequency, anchor date, start/end)
- Idempotent scheduled job that materializes rules into transactions
- Excludes: automatic value adjustment (e.g. inflation-indexed rent), custom frequencies beyond monthly/weekly/yearly

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./recurring-transactions/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

### CSV Import

**Folder:** [`csv-import/`](./csv-import/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

A user can bulk-populate their transaction history by uploading a bank-exported CSV file, mapping its columns to Onomic fields, and confirming after a preview — without a real bank integration.

#### Why It Matters

Without a live Revolut connection in the MVP, this is the fastest way for a user to bring months of existing history into the app instead of re-entering it by hand.

#### Scope

- CSV upload, column mapping (reusable per-bank preset), preview with duplicate detection
- Server-side parsing and batch insert
- Excludes: non-CSV formats (OFX/QIF/PDF), scheduled/recurring imports, automatic reconciliation without user confirmation

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./csv-import/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

### AI Transaction Categorization

**Folder:** [`ai-transaction-categorization/`](./ai-transaction-categorization/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

When a user enters a transaction with only a free-text description, the app suggests the most likely category via an LLM (OpenRouter) — pre-filled but always user-confirmed.

#### Why It Matters

Reduces manual categorization friction, and establishes the architectural pattern (`lib/ai/AIService`) the future AI Financial Advisor Layer will build on: structured data in, structured suggestion out, human confirms.

#### Scope

- `/api/ai/categorize` endpoint, `AIService.categorizeTransaction`
- Suggestion pre-fills the category field; never saved without confirmation
- Excludes: bulk categorization of existing transactions, continuous learning from corrections

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./ai-transaction-categorization/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

### Savings Vaults

**Folder:** [`savings-vaults/`](./savings-vaults/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

A user or family can set a savings goal (Revolut/Nubank-style vault) and track contributions toward it via virtual allocation — no real money movement required.

#### Why It Matters

Gives users a visual, motivating way to save toward a purpose, and in family workspaces shows exactly who contributed what toward a shared goal.

#### Scope

- Vault creation (optional target amount/date), contributions (positive or negative)
- Balance and progress always derived from `vault_contributions`, never stored
- Per-member contribution breakdown in family workspaces
- Excludes: interest/yield on vault balance, direct vault-to-vault transfer, cross-workspace vaults

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./savings-vaults/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

---

## Status Legend

| Symbol | Meaning |
|---|---|
| 🔴 Blocked | Feature cannot progress — dependency or decision needed |
| 🟠 Draft | Feature is being defined — spec or plan not yet finalised |
| 🟡 Planned | Both documents complete, implementation not yet started |
| 🔵 In Progress | At least one phase is actively being built |
| 🟢 Shipped | All phases complete and feature is live |
| ⬜ Not started | Phase has not begun |
| 🔄 In progress | Phase is actively being worked on |
| ✅ Done | Phase is complete |
