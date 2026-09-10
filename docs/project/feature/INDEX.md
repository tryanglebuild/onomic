# Feature Index — Onomic

**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-10 00:00

This is a living document. It tracks every feature that has been conceived, planned, or shipped in the Onomic project. Update this file whenever a feature is created, progresses to a new status, or is completed.

Use this index to maintain a clear picture of the product backlog and its progress. A feature that appears here has been thought through — it has a spec, a plan, and a clear user objective. A feature that is not here is invisible to future development sessions.

For instructions on how to create a new feature folder and what each document should contain, see [TEMPLATE.md](./TEMPLATE.md). For the overall system architecture these features fit into, see [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

---

## Active Features

| Feature | Status | Description | Created | Last Updated |
|---|---|---|---|---|
| [Onboarding](#onboarding) | 🟠 Draft | Skippable, resumable 5-step onboarding after signup — objective, risk profile, investment target, asset preference | 2026-09-10 | 2026-09-10 |
| [Family Workspaces](#family-workspaces) | 🔵 In Progress | Multi-tenant foundation — personal + shared family spaces with isolated data (RLS) + platform RBAC foundation | 2026-09-06 | 2026-09-07 |
| [User Identity: Handle & Avatar](#user-identity-handle--avatar) | 🟠 Draft | Unique `@handle` chosen at signup + self-service avatar upload, extending `profiles` | 2026-09-07 | 2026-09-07 |
| [Manual Transactions](#manual-transactions) | 🟠 Draft | Record categorized expenses/income within a workspace | 2026-09-06 | 2026-09-06 |
| [Recurring Transactions](#recurring-transactions) | 🟠 Draft | Auto-generate fixed monthly/weekly/yearly expenses and income | 2026-09-06 | 2026-09-06 |
| [CSV Import](#csv-import) | 🟠 Draft | Bulk-import transaction history from a bank-exported CSV | 2026-09-06 | 2026-09-06 |
| [AI Transaction Categorization](#ai-transaction-categorization) | 🟠 Draft | Suggest a transaction's category via LLM, confirmed by the user | 2026-09-06 | 2026-09-06 |
| [Savings Vaults](#savings-vaults) | 🟠 Draft | Revolut/Nubank-style savings goals via virtual allocation, individual + shared | 2026-09-06 | 2026-09-06 |
| [Financial Challenges](#financial-challenges) | 🟠 Draft | Time-boxed financial goals (templates + custom) with progress derived from transactions | 2026-09-06 | 2026-09-06 |

---

## Shipped Features

_No shipped features documented yet._

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

**Folder:** [`onboarding/`](./onboarding/)
**Status:** 🟠 Draft — spec approved, implementation plan not yet written
**Created:** 2026-09-10 00:00
**Last updated:** 2026-09-10 00:00

#### What It Enables

A skippable, resumable 5-step flow right after signup that captures what a user is actually here for — finance-management objective, investment risk profile, investment target, asset preference — without blocking access to the dashboard.

#### Why It Matters

Every future AI/recommendation feature (Investment Tracking, AI Financial Advisor Layer) needs these signals and there is currently nowhere they're captured. This front-runs part of the Investment Profile Onboarding backlog item.

#### Scope

- New `onboarding_profiles` table (1:1 with `auth.users`, typed columns + `CHECK` constraints, no `jsonb`)
- Forced redirect to `/onboarding` only once, immediately after signup — never on subsequent logins
- Quiet "Completar perfil" indicator in the dashboard navbar once skipped, until completed
- Excludes: editing answers after completion, any feature reading this data yet, mid-step autosave, gamification

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./onboarding/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, Server Actions, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

---

### Family Workspaces

**Folder:** [`family-workspaces/`](./family-workspaces/)
**Status:** 🔵 In Progress — all 11 tasks implemented and code-reviewed (including a final whole-branch review with a fix wave); migrations have never been applied to a live database (deliberately deferred). See [`RUNBOOK.md`](./family-workspaces/RUNBOOK.md) before applying them for the first time, including one known parked limitation (cascade deletes currently blocked).
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-07 00:00 (all 11 tasks implemented, reviewed, and fixed via subagent-driven-development; see implementation-plan.md and RUNBOOK.md)

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
| [feature-spec.md](./family-workspaces/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| [implementation-plan.md](./family-workspaces/implementation-plan.md) | 11-task technical plan with SQL, RLS, RPCs, and UI | Complete — code-reviewed, incl. final whole-branch review + fix wave |
| [RUNBOOK.md](./family-workspaces/RUNBOOK.md) | Checklist for applying migrations for real the first time | Written, not yet executed |

#### Phase Tracker

All 11 tasks are code-complete and passed task-scoped review (some with fix rounds) plus a final whole-branch review with its own fix wave. Migrations have never been applied to a live database — see [RUNBOOK.md](./family-workspaces/RUNBOOK.md).

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

**Folder:** [`user-identity/`](./user-identity/)
**Status:** 🔵 In Progress — all 7 tasks implemented and code-reviewed (including a final whole-branch review with one fix wave); migration has never been applied to a live database (deliberately deferred, same as Family Workspaces — see [`RUNBOOK.md`](../family-workspaces/RUNBOOK.md))
**Created:** 2026-09-07 00:00
**Last updated:** 2026-09-07 00:00 (all 7 tasks implemented, reviewed, and fixed via subagent-driven-development; see implementation-plan.md and RUNBOOK.md)

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
| [feature-spec.md](./user-identity/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| [implementation-plan.md](./user-identity/implementation-plan.md) | 7-task technical plan with SQL, RLS, Storage, and UI | Complete — code-reviewed, incl. final whole-branch review + fix wave |

#### Phase Tracker

All 7 tasks are code-complete and passed task-scoped review (Tasks 0 and 4 needed one fix round each) plus a final whole-branch review with its own fix wave (1 Critical + 6 Important findings, all fixed and re-verified). Migration has never been applied to a live database — see [`RUNBOOK.md`](../family-workspaces/RUNBOOK.md).

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

### Financial Challenges

**Folder:** [`financial-challenges/`](./financial-challenges/)
**Status:** 🟠 Draft
**Created:** 2026-09-06 00:00
**Last updated:** 2026-09-06 00:00

#### What It Enables

A user or family can activate a time-boxed financial goal — spending limit, savings target, category reduction, or no-spend streak — from a template or fully custom, with progress always calculated from real transaction data.

#### Why It Matters

Turns financial goals into something actively tracked, not just declared — the product's core promise of "not just set goals, but follow through on them."

#### Scope

- Challenge templates catalog + custom challenge creation
- Progress always derived from `transactions` (never manually reported)
- Optional link to a Savings Vault
- Excludes: recurring auto-relaunch of challenges, gamification (badges/ranking), proactive deviation alerts

#### Documents

| Document | Purpose | Status |
|---|---|---|
| [feature-spec.md](./financial-challenges/feature-spec.md) | Product spec — user flow, decisions, data model, security | Approved |
| implementation-plan.md | N-phase technical plan with SQL, API routes, and UI | Not created yet |

#### Phase Tracker

| Phase | Description | Status |
|---|---|---|
| — | Implementation plan not yet written | ⬜ Not started |

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
