# Feature Spec — Onboarding

**Status:** Approved
**Created:** 2026-09-10
**Last updated:** 2026-09-10
**Author:** Leandro Oliveira

---

## 1. Overview

A short, skippable, multi-step onboarding flow shown right after signup, collecting a handful of profile signals that make sense across both sides of the product: personal/family finance management and investing. Today, right after signup, a user lands on `/dashboard` with an empty workspace and no way to tell the app what they're actually here for — every future feature (AI recommendations, investment tracking, the financial advisor layer) will eventually want to know a user's objective and risk appetite, and there is currently nowhere that information is captured.

This builds directly on the dashboard shell (sidebar, navbar, `/dashboard` route) shipped in the previous session, and front-runs part of the **Investment Profile Onboarding** backlog item already named in `feature/INDEX.md` (risk profile, investment target, asset preference) — generalized here to also ask about finance-management intent, not just investing.

## 2. Core Objective

Allow a new user to tell Onomic what they're here for — in under a minute, fully skippable, resumable later — without blocking access to the dashboard.

## 3. Context: How This Area Currently Works

| Existing piece | Relevant to this feature because |
|---|---|
| `app/(auth)/actions.ts` `signUp` | Currently redirects straight to `/dashboard` on success. This feature changes that one redirect target. |
| `profiles` table (`handle_new_user_profile()` trigger) | Auto-creates a `profiles` row on signup. This feature's table is created by the same trigger, same pattern. |
| `app/(dashboard)/layout.tsx` | The auth+workspace guard that wraps every dashboard route. This feature does **not** touch it — the forced redirect only ever happens once, from `signUp`, never from this layout. |
| `components/dashboard/navbar.tsx` | Already renders `WorkspaceMenu`, a notification bell, and `UserMenu` in a `flex items-center gap-3` trailing group. This feature adds one more item to that group. |
| `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/button.tsx` | Existing design-system primitives this feature reuses as-is — no new UI primitives needed. |
| `components/auth/auth-shell.tsx` | The closest existing precedent for a focused, minimal-chrome full-screen flow outside the dashboard shell — this feature's own shell follows the same spirit (not the same component, since the split-screen marketing panel doesn't fit a stepper). |

No onboarding-related column or table exists anywhere in the current schema.

## 4. User Flow

```
1. User completes signup (handle, email, password — existing flow, unchanged)
2. signUp redirects to /onboarding instead of /dashboard (first time only)
3. /onboarding reads the user's onboarding_profiles row (created by the signup
   trigger, current_step = 1) and renders the stepper at that step
4. For each of steps 1-4:
   a. User answers (or picks a neutral "not sure yet" option — nothing is
      a hard requirement)
   b. Clicking "Seguinte" saves the step's answer(s) via a Server Action,
      advances current_step, renders the next step
   c. Clicking "Completar mais tarde" (visible on every step) sets
      skipped_at = now() and redirects to /dashboard
5. Step 5 shows a summary of everything answered so far, with a "Concluir"
   button
6. Clicking "Concluir" sets completed_at = now(), redirects to /dashboard
7. From here on:
   - If completed_at is set: nothing else happens, the flow is done
   - If completed_at is not set (whether or not the user ever explicitly
     clicked "Completar mais tarde"): the navbar shows a "Completar perfil"
     badge/button linking back to /onboarding, which resumes at current_step
   - Visiting /onboarding directly when completed_at is already set
     redirects straight to /dashboard (nothing to do)
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Quando é forçado o redirect para `/onboarding`? | Só uma vez, na sessão imediatamente a seguir ao signup. Nunca mais é forçado depois disso — nem no `signIn`, nem no guard do dashboard. |
| Quando aparece o indicador na navbar? | Sempre que `completed_at` estiver vazio — não depende de o user ter clicado explicitamente em "Completar mais tarde". Cobre também quem simplesmente fecha o separador sem clicar em nada. |
| O passo 5 (resumo) tem "Completar mais tarde"? | Não, deliberadamente. Os passos 1–4 podem ser saltados; o passo 5 só permite corrigir uma resposta anterior (Voltar) ou concluir — não sair sem decidir. |
| Algum passo é obrigatório? | Não. Todos têm uma opção neutra válida ("ainda não sei" / meta em branco) — nada bloqueia o avanço. |
| Onde vivem os dados? | Tabela dedicada `onboarding_profiles`, colunas tipadas com `CHECK`, não um `jsonb` solto — consistente com o resto do schema (que só usa `jsonb` para dados genuinamente opacos, como `transactions.metadata`). |
| O flow vive dentro da shell do dashboard (sidebar/navbar)? | Não — rota própria fora de `(dashboard)`, chrome mínimo (logótipo + stepper), como `/login`/`/signup`. |
| Quantos passos? | 5: objetivo, perfil de risco, meta de investimento, preferência de ativos, resumo. |
| Sub-rotas por passo (`/onboarding/step/2`)? | Não — uma única rota `/onboarding`, passo atual gerido em client-state, hidratado a partir do `current_step` guardado no servidor (permite retomar após refresh/fecho de separador). |

## 6. Key Entities

### `onboarding_profiles` (new table)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)`, `on delete cascade` |
| `primary_goals` | `text[]` | `not null default '{}'`; CHECK: every element ∈ `('budgeting','saving','investing','family')` |
| `risk_profile` | `text` | nullable; CHECK: ∈ `('conservative','moderate','aggressive')` when not null |
| `investment_target_amount` | `numeric(12,2)` | nullable |
| `investment_target_frequency` | `text` | nullable; CHECK: ∈ `('monthly','quarterly')` when not null |
| `asset_preferences` | `text[]` | `not null default '{}'`; CHECK: every element ∈ `('crypto','stocks','etfs','undecided')` |
| `current_step` | `smallint` | `not null default 1`; CHECK: between 1 and 5 |
| `completed_at` | `timestamptz` | nullable |
| `skipped_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()` |

One row per user, 1:1 with `auth.users`, created by the same trigger that creates the `profiles` row on signup (`handle_new_user_profile()` extended, not a second trigger).

## 7. Out of Scope (v1)

- Editing onboarding answers after completion (no settings-page UI to revisit them — the data exists in the table, a future feature can expose it, this one doesn't).
- Any feature actually *reading* `onboarding_profiles` yet (AI Advisor Layer, Investment Tracking) — this feature only collects and stores the data; consuming it is each future feature's own job.
- Forcing the redirect on every login while incomplete — deliberately rejected, see §5.
- Progress persistence mid-step (e.g. autosave while typing the investment target amount) — only persisted on "Seguinte".
- Any gamification (points, achievement badges, confetti) — the navbar indicator is a plain, quiet reminder, not a reward mechanic. (Consistent with Financial Challenges' own explicit exclusion of gamification.)
- Localization/i18n beyond the Portuguese copy already used throughout the rest of the app.

## 8. Security Considerations

- RLS on `onboarding_profiles`: identical shape to `profiles` — a user can only `select`/`update` the row where `id = auth.uid()`. No `insert`/`delete` policy for any client role (the row is created only by the signup trigger, `SECURITY DEFINER`, and cascades away with the `auth.users` row).
- Every Server Action (`saveOnboardingStep`, `skipOnboarding`, `completeOnboarding`) re-validates `auth.getUser()` server-side before writing — same pattern already used by `switchWorkspace`/`signOut`. No action trusts a client-supplied user id.
- No new external API, no new secret, no new attack surface beyond one more RLS-scoped table — this feature touches nothing outside Postgres.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Right after signup (first time only) | Full-screen redirect to `/onboarding` |
| Dashboard navbar (`components/dashboard/navbar.tsx`) | A quiet `Badge`-style button, "Completar perfil", shown whenever `completed_at` is not set (regardless of whether the user ever clicked "Completar mais tarde") — links to `/onboarding`, resumes at `current_step` |
| Direct navigation to `/onboarding` after completion | Immediate redirect to `/dashboard` — nothing to show |

## 10. Relationship to Existing Features

- **Depends on:** the signup flow and the `handle_new_user_profile()` trigger from Family Workspaces / User Identity (both already live) — this feature extends that trigger, does not replace it.
- **Feeds into (future, not built yet):** the **Investment Profile Onboarding** backlog item is effectively delivered by this feature's steps 2–4 (risk profile, investment target, asset preference) — when Investment Tracking gets its own spec, it should point at `onboarding_profiles` rather than re-inventing the same fields. Also feeds the future **AI Financial Advisor Layer** (backlog) once it exists, per `ARCHITECTURE.md`'s "Dados → Cálculo → IA → Apresentação" principle — this feature only ever writes the raw signals, never generates a recommendation itself.
- **Does not depend on** Manual Transactions, Savings Vaults, or any other domain feature — it can ship independently of the backend roadmap's build order in `docs/project/BACKEND_ROADMAP.md`.
