# Dashboard Overview Widgets — Design Spec

Date: 2026-09-11
Status: Approved (design), pending implementation plan

## Problem

`/dashboard` ("Visão geral") is currently a near-empty placeholder: a
greeting, a workspace summary card, and a dashed empty-state CTA
("Ligue a sua primeira conta"). It doesn't surface any of the data the
platform already collects (recurring income/expenses, onboarding risk
signals, family membership) in a way the user can read at a glance. The
platform also has no reusable charting layer — any future page that
wants a chart would have to invent one from scratch.

## Goals

- Turn `/dashboard` into a real overview: a grid of widgets covering
  informative summaries, analytical charts, and pending actions.
- Build a small, reusable charting layer (`components/charts/`) themed
  with the platform's existing design tokens (`app/globals.css`), usable
  by any future page — not dashboard-specific.
- Cover the requested chart types with genuinely useful data: bar
  (rendimento vs. gastos), pie (gastos por categoria), line (saldo
  projetado), radar (perfil de risco).
- Ship 6 concrete widgets (see below), each with a clear empty state
  for users who haven't configured the underlying data yet.

## Non-goals

- No real transaction/historical ledger exists yet (`transactions`
  table is not built) — every chart here summarizes **currently
  configured recurring rules** or **onboarding self-reported signals**,
  never actual historical spend. The "saldo projetado" line chart is
  explicitly a linear projection from monthly-equivalent amounts, not a
  calendar-accurate schedule (the schema has no "next due date" per
  item — only a cadence) — this limitation is stated in the UI copy,
  not hidden.
- No widget customization/reordering/dismissal by the user in this
  version — the grid is fixed for v1.
- No new chart-specific color palette — reuse the existing named tokens
  (`primary`, `navy`, `sky`, `violet`, `warning`, `danger`).
- Vaults, Desafios, and Investimentos widgets are out of scope — those
  subsystems don't exist yet.

## Architecture

**Charting layer** (`components/charts/`) — thin, reusable wrappers
around Recharts (new dependency), not dashboard-specific:
- `chart-theme.ts` — exports the categorical series palette (an
  ordered array built from the existing named tokens: primary, sky,
  violet, warning, navy-soft, danger) and shared style constants
  (grid stroke color, tooltip container styling, axis font — Manrope,
  the platform's sans token) so every chart looks consistent without
  each widget repeating styling props.
- `app-pie-chart.tsx`, `app-bar-chart.tsx`, `app-line-chart.tsx`,
  `app-radar-chart.tsx` — one file per chart type, each a small
  wrapper around the matching Recharts component pre-wired to
  `chart-theme.ts` (colors, tooltip, legend, responsive container).
  These take plain data arrays + field names as props — no
  dashboard-specific logic lives here, so a future page (e.g. a future
  Investimentos analytics page) can reuse them directly.

**Widget layer** (`components/dashboard/widgets/`) — one component per
widget, each a `Card` that computes its own derived data from props and
renders either a chart component or a plain list:
- `financial-summary-widget.tsx` (informative)
- `expenses-by-category-widget.tsx` (pie)
- `income-vs-expenses-widget.tsx` (bar)
- `projected-balance-widget.tsx` (line)
- `risk-profile-widget.tsx` (radar)
- `pending-actions-widget.tsx` (checklist, not a chart)

**Data flow** — `app/(dashboard)/dashboard/page.tsx` (Server Component)
fetches everything in parallel (income sources, recurring expenses, the
2 lookup tables, the onboarding profile, family member/invite counts —
all either already fetched here or via the existing `lib/finance/queries.ts`
functions from the income/expenses feature) and passes it all as props
to a new client component `components/dashboard/overview-grid.tsx`
(`'use client'`, required since Recharts renders client-side), which
lays out the 6 widgets in a responsive grid and does the shared
derived-data computation (monthly-equivalent totals via the existing
`toMonthlyAmount`) once, passing slices to each widget — mirrors the
`budget-client.tsx` pattern from the income/expenses feature.

## Widgets

**1. Resumo financeiro** (informative, full-width or half-width) —
three stacked stats (Rendimento mensal estimado / Gastos mensais
estimados / Saldo disponível estimado), same numbers and
`toMonthlyAmount`/`formatCurrency` logic as the `/budget` page's
summary, restyled as a compact widget card rather than 3 separate
cards. Empty state: if both income and expenses are empty, show a CTA
to `/budget` instead of "0,00 €" everywhere.

**2. Gastos por categoria** (pie) — groups active `recurring_expenses`
by `category_id`, sums monthly-equivalent amounts per category, labels
via `expense_categories.label`. Empty state: CTA "Configura os teus
gastos fixos" → `/budget`.

**3. Rendimento vs. Gastos** (bar) — a 2-bar chart: total monthly
income vs. total monthly expenses (both monthly-equivalent). Empty
state: same CTA as widget 1 if both are zero.

**4. Saldo projetado** (line) — cumulative projected balance over the
next 6 months, starting at 0, where each month's delta is the constant
monthly-equivalent net (income − expenses). Explicit caption under the
chart title: "Projeção baseada nos valores recorrentes configurados,
não no histórico real de transações." Empty state: CTA to `/budget` if
there's nothing to project.

**5. O teu perfil de risco** (radar) — 3 axes from
`onboarding_profiles`: Horizonte temporal, Experiência, Reação a
perdas — reusing whatever per-axis scoring already exists in
`lib/onboarding/risk-scoring.ts` (the implementer should check there
first; if only the final `risk_profile` category is exported, add the
3 small per-axis score mappings directly in this widget rather than
duplicating scoring logic elsewhere). Only rendered if all 3 source
fields are non-null; otherwise shows a CTA to complete onboarding
(reusing the existing onboarding-reminder mechanism).

**6. Ações pendentes** (checklist, not a chart) — one row per
outstanding action, each with a short label and a CTA link:
onboarding incomplete → back into the onboarding modal; no income
configured → `/budget`; no recurring expenses configured → `/budget`;
pending family invites (family workspace only) → `/settings/family`.
Rows are added only when the condition is actually true. If nothing is
pending, shows a small positive empty state ("Tudo em dia por agora.")
instead of an empty list.

## Error handling / edge cases

- A brand-new user (nothing configured anywhere) sees 6 widgets that
  are all in their empty/CTA state — never raw zeros with no
  explanation, and never a broken chart render with no data.
- The radar and pending-actions widgets are the only ones with
  conditional visibility logic (radar depends on onboarding progress);
  every other widget always renders, empty-state or not.
- Family-only pieces of the pending-actions widget (invites) simply
  don't add a row for personal workspaces — no special-casing needed
  beyond the existing `workspace.type` check already used elsewhere on
  this page.

## Testing

- Unit tests for any new pure calculation helper (category grouping,
  projection series generation, radar axis scoring if added locally)
  — same style as `tests/unit/finance-cadence.test.ts`.
- No RLS/integration tests needed — this feature reads existing
  tables through existing, already-RLS-tested query functions; it adds
  no new tables or policies.
- `npx tsc --noEmit` and `npm run lint` clean.
- Manual/Playwright verification: sign up fresh (all empty states
  visible) → configure income + expenses + complete onboarding →
  confirm all 6 widgets render real data correctly, chart colors match
  the platform palette, and the radar/pending-actions widgets react
  correctly to onboarding completion state.
