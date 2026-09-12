# Feature Spec — Onboarding

**Status:** Approved (v2 — modal + expanded investor profile)
**Created:** 2026-09-10
**Last updated:** 2026-09-11
**Author:** Leandro Oliveira

---

## Revision note (v2)

v1 shipped as a dedicated `/onboarding` page with a 5-step flow and was committed (`feat(onboarding): add onboarding profiles and related queries`), but its migration was never applied to any database. This revision replaces the page with a modal over `/dashboard`, and expands the investment-profile questions from a single self-declared risk label into a short behavioral questionnaire whose risk profile is *calculated*, not chosen. Because the migration never touched a live database, the schema changes below are edited directly into the existing migration file rather than added as a new one — see the implementation plan's Phase 1.

## 1. Overview

A short, multi-step onboarding flow shown as a modal over the dashboard, collecting profile signals that make sense across both sides of the product: personal/family finance management and investing. Right after signup, a user lands on `/dashboard` with the modal open on top of it — not a separate page, so the app itself is always visible underneath. Every future feature (AI recommendations, investment tracking, the financial advisor layer) will eventually want to know a user's objective and risk appetite, and there is currently nowhere that information is captured.

This builds directly on the dashboard shell (sidebar, navbar, `/dashboard` route) and extends the v1 onboarding table, and delivers the **Investment Profile Onboarding** backlog item named in `feature/INDEX.md` more fully than v1 did — a real behavioral risk questionnaire (horizon, experience, reaction to a loss, purpose) instead of a single self-declared label, giving Investment Tracking something genuinely "palpable" to build on later.

## 2. Core Objective

Allow a new user to tell Onomic what they're here for and how they actually think about risk — through a short, engaging, skippable, resumable modal — without ever leaving or blocking the dashboard.

## 3. Context: How This Area Currently Works

| Existing piece | Relevant to this feature because |
|---|---|
| `app/(auth)/actions.ts` `signUp` | Redirects to `/dashboard` on success. v2 adds a `?onboarding=1` query param to that same redirect (was previously `/onboarding`, a route that no longer exists as a real page). |
| `onboarding_profiles` table + `handle_new_user_profile()` trigger (v1, committed, never applied) | This feature's table already exists in a migration file that has never touched a database — v2 edits that same file in place (see implementation plan Phase 1) rather than adding a new migration. |
| `app/(dashboard)/layout.tsx` | Already fetches `onboardingProfile` and computes `showOnboardingReminder` (v1). v2 keeps both, adds a new query-param check for the auto-open signal. |
| `components/dashboard/dashboard-shell.tsx` | Already lifts `collapsed`/`mobileOpen` state for the sidebar. v2 adds one more piece of lifted state here: whether the onboarding modal is open — same pattern, not a new one. |
| `components/dashboard/navbar.tsx`, `components/dashboard/onboarding-reminder.tsx` | The v1 navbar badge is a `<Link href="/onboarding">`. v2 changes it to a button that opens the modal instead of navigating. |
| `components/ui/query-error-toast.tsx` | The existing pattern this feature's auto-open mechanism copies: a client component reads a query param on mount, acts once, then strips the param via `router.replace` so it never re-triggers on refresh. |
| `app/onboarding/page.tsx`, `components/onboarding/*` (v1) | The dedicated page and its shell/step components are replaced by a modal — most step components are kept and renumbered, the page and its shell are deleted (the route itself becomes a one-line redirect, for anyone with the old URL bookmarked). |

No `@radix-ui/react-dialog` dependency exists yet — this feature adds it, same family as the already-installed `@radix-ui/react-dropdown-menu`/`@radix-ui/react-collapsible`.

## 4. User Flow

```
1. User completes signup (handle, email, password — existing flow, unchanged)
2. signUp redirects to /dashboard?onboarding=1 (first time only)
3. On /dashboard, a client component detects the `onboarding=1` query param on
   mount, opens the onboarding modal, then strips the param from the URL via
   router.replace (same pattern as QueryErrorToast) — refreshing the page
   afterward does not reopen it
4. The modal reads the user's onboarding_profiles row (created by the signup
   trigger, current_step = 1) and renders the stepper at that step, on top of
   the dashboard (visible but inert underneath)
5. For each of steps 1-7:
   a. User answers (or picks a neutral "not sure yet" option — nothing is
      a hard requirement)
   b. Clicking "Seguinte" saves the step's answer(s) via a Server Action,
      advances current_step, renders the next step
   c. Clicking "Completar mais tarde" (visible on steps 1-7) sets nothing
      new — it simply closes the modal; current_step already reflects
      wherever the user last landed
   d. The modal cannot be closed any other way — no backdrop click, no
      Escape key, no X button
6. After step 4 (the loss-reaction question), risk_profile is computed
   server-side from investment_horizon + investment_experience +
   loss_reaction and stored — never asked directly
7. Step 8 shows a summary of everything answered, including the computed
   risk profile, with a "Concluir" button — this step has no "Completar
   mais tarde" and cannot be closed any other way either; only "Voltar" (to
   fix an earlier answer) or "Concluir"
8. Clicking "Concluir" sets completed_at = now(), closes the modal
9. From here on:
   - If completed_at is set: nothing else happens, the flow is done
   - If completed_at is not set: the navbar shows a "Completar perfil"
     badge/button that opens the same modal, resuming at current_step
   - Visiting /onboarding directly (old bookmarked URL) redirects to
     /dashboard?onboarding=1, which re-triggers the auto-open behavior
     described in step 3
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Página dedicada ou modal? | Modal, sobre `/dashboard`, desde o início — nunca há uma página `/onboarding` a renderizar sozinha. |
| Quando é forçado o auto-open do modal? | Só uma vez, via `?onboarding=1` no redirect do `signUp` — mesmo mecanismo de "só uma vez" do v1, só que via query param em vez de rota dedicada. |
| O modal pode ser fechado sem escolher nada (X, clique fora, Esc)? | Não. Só através do botão explícito "Completar mais tarde" (steps 1–7) — nunca por acidente. |
| Quando aparece o indicador na navbar? | Sempre que `completed_at` estiver vazio (inalterado do v1) — agora abre o modal em vez de navegar. |
| O passo final (resumo) tem "Completar mais tarde"? | Não, deliberadamente (inalterado do v1) — só "Voltar" ou "Concluir". |
| Como se chega ao `risk_profile`? | Calculado, não escolhido: horizonte temporal + experiência + reação a uma queda de 20% somam pontos (0–7) que mapeiam para conservador/moderado/arrojado. Ver `lib/onboarding/risk-scoring.ts`. |
| Algum passo é obrigatório? | Não. Todos têm uma opção neutra válida — nada bloqueia o avanço. |
| Onde vivem os dados? | Mesma tabela dedicada `onboarding_profiles`, colunas tipadas com `CHECK` (inalterado do v1). |
| Quantos passos? | 8: objetivo, horizonte temporal, experiência, reação a uma queda, propósito, meta de investimento, preferência de ativos, resumo. (Era 5 no v1 — o alongamento é o custo direto de pedir um perfil mais palpável; deixa de caber em "menos de um minuto".) |

## 6. Key Entities

### `onboarding_profiles` (existing table, migration edited in place — never applied to any database)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)`, `on delete cascade` |
| `primary_goals` | `text[]` | `not null default '{}'`; CHECK: every element ∈ `('budgeting','saving','investing','family')` |
| `investment_horizon` | `text` | **new** — nullable; CHECK: ∈ `('short','medium','long')` when not null |
| `investment_experience` | `text` | **new** — nullable; CHECK: ∈ `('none','some','experienced')` when not null |
| `loss_reaction` | `text` | **new** — nullable; CHECK: ∈ `('sell_all','sell_some','hold','buy_more')` when not null |
| `investment_purpose` | `text[]` | **new** — `not null default '{}'`; CHECK: every element ∈ `('retirement','home','grow_wealth','passive_income','other')` |
| `risk_profile` | `text` | unchanged shape (∈ `('conservative','moderate','aggressive')` when not null) — but now written by the server-side scoring function, never by direct user choice |
| `investment_target_amount` | `numeric(12,2)` | nullable, unchanged |
| `investment_target_frequency` | `text` | nullable; CHECK: ∈ `('monthly','quarterly')` when not null, unchanged |
| `asset_preferences` | `text[]` | `not null default '{}'`; CHECK: every element ∈ `('crypto','stocks','etfs','undecided')`, unchanged |
| `current_step` | `smallint` | `not null default 1`; CHECK: **between 1 and 8** (was 1–5) |
| `completed_at` | `timestamptz` | nullable, unchanged |
| ~~`skipped_at`~~ | — | **removed** — no longer read anywhere (the navbar badge already only checks `completed_at`, and the modal can't be dismissed any other way than the explicit button, so there's nothing left to distinguish) |
| `created_at` | `timestamptz` | `not null default now()`, unchanged |
| `updated_at` | `timestamptz` | `not null default now()`, unchanged |

Still one row per user, 1:1 with `auth.users`, created by the same signup trigger.

## 7. Out of Scope (v1, still true in v2)

- Editing onboarding answers after completion (no settings-page UI to revisit them).
- Any feature actually *reading* `onboarding_profiles` yet (AI Advisor Layer, Investment Tracking) — this feature only collects and stores the data.
- Progress persistence mid-step (only persisted on "Seguinte").
- Any gamification (points, achievement badges, confetti).
- Localization/i18n beyond the Portuguese copy already used throughout the rest of the app.
- Explaining the risk-scoring formula to the user (the summary shows the *result* — "O teu perfil: Moderado" — not the arithmetic behind it).

## 8. Security Considerations

- RLS on `onboarding_profiles`: unchanged from v1 — `select`/`update` own row only, no `insert`/`delete` policy for any client role.
- Every Server Action re-validates `auth.getUser()` server-side before writing — unchanged pattern.
- `risk_profile` is computed server-side inside the Server Action that saves the loss-reaction step, from server-validated inputs only (the same allowlist-validated `investment_horizon`/`investment_experience`/`loss_reaction` values) — a client cannot submit an arbitrary `risk_profile` value directly, since no action accepts one as a parameter.
- No new external API, no new secret — `@radix-ui/react-dialog` is a client-side UI primitive, not a service integration.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Right after signup (first time only) | `/dashboard` with the onboarding modal already open on top |
| Dashboard navbar (`components/dashboard/navbar.tsx`) | A quiet `Badge`-style button, "Completar perfil", shown whenever `completed_at` is not set — opens the modal, resumes at `current_step` |
| Direct navigation to `/onboarding` (old bookmarked URL) | Redirects to `/dashboard?onboarding=1`, which re-opens the modal |

## 10. Relationship to Existing Features

- **Depends on:** the signup flow and the `handle_new_user_profile()` trigger from Family Workspaces / User Identity (both already live) — unchanged from v1.
- **Feeds into (future, not built yet):** the **Investment Profile Onboarding** backlog item, now more fully — a real behavioral risk questionnaire instead of a self-declared label, plus purpose. When Investment Tracking gets its own spec, it should read `onboarding_profiles` directly rather than re-collecting any of this. Also feeds the future **AI Financial Advisor Layer** per `ARCHITECTURE.md`'s "Dados → Cálculo → IA → Apresentação" principle — `risk_profile` is exactly that principle applied to this feature: calculated deterministically first, never asked of or generated by an LLM.
- **Does not depend on** Manual Transactions, Savings Vaults, or any other domain feature.
