# Dashboard Overview Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/dashboard` into a real overview with 6 widgets (informative summary, pie, bar, line, radar, pending-actions checklist), backed by a new reusable charting layer themed with the platform's existing design tokens.

**Architecture:** A thin charting layer (`components/charts/`) wraps Recharts (new dependency) with the platform's colors/fonts. A widget layer (`components/dashboard/widgets/`) computes derived data via new pure helpers in `lib/dashboard/overview.ts` and renders it through the chart layer. `app/(dashboard)/dashboard/page.tsx` fetches everything server-side and hands it to a new client component, `overview-grid.tsx`, which lays out and wires the 6 widgets — mirrors the `budget-client.tsx` pattern from the income/expenses feature.

**Tech Stack:** Next.js 16 App Router (Server + Client Components), Recharts 3.x, Tailwind v4 tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-dashboard-overview-widgets-design.md`

## Global Constraints

- No new chart color palette — the categorical series palette is built ONLY from existing named tokens: `--color-primary`, `--color-sky`, `--color-violet`, `--color-warning`, `--color-navy-soft`, `--color-danger` (in that order).
- Every chart-bearing widget has an empty/CTA state — never renders a chart with no data, never shows a bare "0,00 €" with no explanation.
- The "saldo projetado" line chart is an explicit linear projection from monthly-equivalent amounts, not a calendar-accurate schedule — this must be stated in the widget's own copy, not just in comments.
- All UI copy is European Portuguese, formal "você" register (matches the rest of the dashboard/auth flows — e.g. "Configure o seu rendimento", not "Configura o teu rendimento").
- Reuse existing helpers rather than duplicating logic: `toMonthlyAmount`/`formatCurrency` from `lib/finance/cadence.ts`, the per-axis risk scoring constants from `lib/onboarding/risk-scoring.ts` (exported by Task 3, not duplicated).
- No new tables, no new RLS policies — this feature only reads through existing, already-tested query functions.

---

### Task 1: Recharts dependency + chart theme

**Files:**
- Modify: `package.json` (add dependency)
- Create: `components/charts/chart-theme.ts`

**Interfaces:**
- Produces: `export const CHART_SERIES_COLORS: string[]` (6 CSS var references), `export const CHART_GRID_COLOR: string`, `export const CHART_AXIS_COLOR: string`, `export const CHART_FONT_FAMILY: string`, `export const CHART_TOOLTIP_STYLE: React.CSSProperties`. Task 2's 4 chart wrapper components import all of these.

- [ ] **Step 1: Add the dependency**

In `package.json`, add this line to `"dependencies"`, alphabetically between `"react-hot-toast"` and `"tailwind-merge"`:

```json
    "recharts": "^3.10.1",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: `recharts` appears in `node_modules/recharts` and `package-lock.json` is updated.

- [ ] **Step 3: Write the chart theme file**

```ts
export const CHART_SERIES_COLORS = [
  'var(--color-primary)',
  'var(--color-sky)',
  'var(--color-violet)',
  'var(--color-warning)',
  'var(--color-navy-soft)',
  'var(--color-danger)',
]

export const CHART_GRID_COLOR = 'var(--color-border)'
export const CHART_AXIS_COLOR = 'var(--color-muted)'
export const CHART_FONT_FAMILY = 'var(--font-sans)'

export const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontFamily: CHART_FONT_FAMILY,
  fontSize: '13px',
  color: 'var(--color-ink)',
  boxShadow: 'var(--shadow-soft)',
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. (`React.CSSProperties` resolves via the global JSX types already set up in this Next.js project — no explicit `import type React from 'react'` needed, but add `import type { CSSProperties } from 'react'` and use `CSSProperties` instead of `React.CSSProperties` if `tsc` complains about an unresolved `React` namespace.)

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/charts/chart-theme.ts
git commit -m "chore: add recharts and a shared chart theme"
```

---

### Task 2: Chart wrapper components

**Files:**
- Create: `components/charts/app-pie-chart.tsx`
- Create: `components/charts/app-bar-chart.tsx`
- Create: `components/charts/app-line-chart.tsx`
- Create: `components/charts/app-radar-chart.tsx`

**Interfaces:**
- Consumes: everything from `components/charts/chart-theme.ts` (Task 1).
- Produces: `export function AppPieChart({ data }: { data: { label: string; value: number }[] }): JSX.Element`, `export function AppBarChart({ data }: { data: { label: string; value: number }[] }): JSX.Element`, `export function AppLineChart({ data }: { data: { month: string; balance: number }[] }): JSX.Element`, `export function AppRadarChart({ data }: { data: { axis: string; value: number }[] }): JSX.Element`. Task 4's widgets import these by name.

- [ ] **Step 1: Write `app-pie-chart.tsx`**

```tsx
'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppPieChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => `${value.toFixed(2)} €`} />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Write `app-bar-chart.tsx`**

```tsx
'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppBarChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="label" stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <YAxis stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => `${value.toFixed(2)} €`} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={entry.label} fill={CHART_SERIES_COLORS[index % CHART_SERIES_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

Each bar gets its own color from `CHART_SERIES_COLORS` via `<Cell>` (the correct Recharts pattern for per-bar coloring — never nest a raw `<rect>` inside `<Bar>`, that is not valid Recharts usage and will not render correctly).

- [ ] **Step 3: Verify this file alone doesn't break the type check**

Run: `npx tsc --noEmit`
Expected: no errors from `app-bar-chart.tsx` (other pre-existing errors, if any, are unrelated — see Step 6 for the full-project check after all 4 files exist).

- [ ] **Step 4: Write `app-line-chart.tsx`**

```tsx
'use client'

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppLineChart({ data }: { data: { month: string; balance: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
        <XAxis dataKey="month" stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <YAxis stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => `${value.toFixed(2)} €`} />
        <Line type="monotone" dataKey="balance" stroke={CHART_SERIES_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 5: Write `app-radar-chart.tsx`**

```tsx
'use client'

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CHART_AXIS_COLOR, CHART_FONT_FAMILY, CHART_GRID_COLOR, CHART_SERIES_COLORS, CHART_TOOLTIP_STYLE } from './chart-theme'

export function AppRadarChart({ data }: { data: { axis: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid stroke={CHART_GRID_COLOR} />
        <PolarAngleAxis dataKey="axis" stroke={CHART_AXIS_COLOR} style={{ fontFamily: CHART_FONT_FAMILY, fontSize: 12 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value: number) => `${value}%`} />
        <Radar dataKey="value" stroke={CHART_SERIES_COLORS[0]} fill={CHART_SERIES_COLORS[0]} fillOpacity={0.35} />
      </RadarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/charts/app-pie-chart.tsx components/charts/app-bar-chart.tsx components/charts/app-line-chart.tsx components/charts/app-radar-chart.tsx
git commit -m "feat: add reusable pie/bar/line/radar chart components"
```

---

### Task 3: Overview calculation helpers

**Files:**
- Modify: `lib/onboarding/risk-scoring.ts` (export the per-axis point maps and their maxima)
- Create: `lib/dashboard/overview.ts`
- Test: `tests/unit/dashboard-overview.test.ts`

**Interfaces:**
- Consumes: `toMonthlyAmount`, `type Cadence` from `@/lib/finance/cadence`; `LookupOption`, `IncomeSourceRow`, `RecurringExpenseRow` from `@/lib/finance/queries`; `HORIZON_POINTS`, `EXPERIENCE_POINTS`, `LOSS_REACTION_POINTS`, `HORIZON_MAX`, `EXPERIENCE_MAX`, `LOSS_REACTION_MAX` from `@/lib/onboarding/risk-scoring` (this task exports them); `InvestmentHorizon`, `InvestmentExperience`, `LossReaction` from `@/lib/onboarding/steps`.
- Produces: `export type CategoryTotal = { label: string; value: number }`, `export function groupMonthlyTotals<T extends { active: boolean; amount: number; cadence: Cadence }>(items: T[], lookupIdOf: (item: T) => string, lookupOptions: LookupOption[]): CategoryTotal[]`, `export function sumActiveMonthly<T extends { active: boolean; amount: number; cadence: Cadence }>(items: T[]): number`, `export type ProjectedBalancePoint = { month: string; balance: number }`, `export function buildProjectedBalanceSeries(monthlyNet: number, months?: number): ProjectedBalancePoint[]`, `export type RiskRadarPoint = { axis: string; value: number }`, `export function buildRiskRadarData(horizon: InvestmentHorizon | null, experience: InvestmentExperience | null, lossReaction: LossReaction | null): RiskRadarPoint[] | null`, `export type PendingAction = { label: string; href: string }`, `export function buildPendingActions(input: { onboardingCompleted: boolean; hasIncome: boolean; hasExpenses: boolean; pendingInviteCount: number; isFamilyWorkspace: boolean }): PendingAction[]`. Task 4's widgets call every one of these.

- [ ] **Step 1: Export the risk-scoring internals**

In `lib/onboarding/risk-scoring.ts`, change these 3 lines from module-private `const` to exported `const`, and add 3 new exported max constants right after them:

```ts
export const HORIZON_POINTS: Record<InvestmentHorizon, number> = { short: 0, medium: 1, long: 2 }
export const EXPERIENCE_POINTS: Record<InvestmentExperience, number> = { none: 0, some: 1, experienced: 2 }
export const LOSS_REACTION_POINTS: Record<LossReaction, number> = { sell_all: 0, sell_some: 1, hold: 2, buy_more: 3 }

export const HORIZON_MAX = 2
export const EXPERIENCE_MAX = 2
export const LOSS_REACTION_MAX = 3
```

Everything else in the file (the `computeRiskProfile` function body) stays exactly as it is — this is purely adding `export` and 3 new constants, not changing any existing behavior.

- [ ] **Step 2: Run the existing risk-scoring test to confirm nothing broke**

Run: `npx vitest run tests/unit/onboarding-risk-scoring.test.ts`
Expected: PASS, same as before this change (this step only adds exports, it doesn't change `computeRiskProfile`'s logic).

- [ ] **Step 3: Write the failing test for the new helpers**

```ts
import { describe, expect, it } from 'vitest'
import {
  groupMonthlyTotals,
  sumActiveMonthly,
  buildProjectedBalanceSeries,
  buildRiskRadarData,
  buildPendingActions,
} from '@/lib/dashboard/overview'

describe('groupMonthlyTotals', () => {
  const lookups = [
    { id: 'cat-a', slug: 'a', label: 'Categoria A' },
    { id: 'cat-b', slug: 'b', label: 'Categoria B' },
  ]

  it('sums active items per lookup id, normalized to monthly', () => {
    const items = [
      { active: true, amount: 100, cadence: 'mensal' as const, category_id: 'cat-a' },
      { active: true, amount: 1200, cadence: 'anual' as const, category_id: 'cat-a' },
      { active: true, amount: 50, cadence: 'semanal' as const, category_id: 'cat-b' },
    ]
    const result = groupMonthlyTotals(items, (i) => i.category_id, lookups)
    expect(result).toEqual([
      { label: 'Categoria A', value: 200 },
      { label: 'Categoria B', value: 217.4 },
    ])
  })

  it('excludes inactive items and lookups with zero total', () => {
    const items = [
      { active: false, amount: 999, cadence: 'mensal' as const, category_id: 'cat-a' },
      { active: true, amount: 10, cadence: 'mensal' as const, category_id: 'cat-b' },
    ]
    const result = groupMonthlyTotals(items, (i) => i.category_id, lookups)
    expect(result).toEqual([{ label: 'Categoria B', value: 10 }])
  })
})

describe('sumActiveMonthly', () => {
  it('sums only active items, normalized to monthly', () => {
    const items = [
      { active: true, amount: 100, cadence: 'mensal' as const },
      { active: false, amount: 500, cadence: 'mensal' as const },
      { active: true, amount: 1200, cadence: 'anual' as const },
    ]
    expect(sumActiveMonthly(items)).toBe(200)
  })

  it('returns 0 for an empty list', () => {
    expect(sumActiveMonthly([])).toBe(0)
  })
})

describe('buildProjectedBalanceSeries', () => {
  it('accumulates a constant monthly net over the requested number of months', () => {
    const result = buildProjectedBalanceSeries(100, 3)
    expect(result).toHaveLength(3)
    expect(result[0].balance).toBe(100)
    expect(result[1].balance).toBe(200)
    expect(result[2].balance).toBe(300)
  })

  it('defaults to 6 months', () => {
    expect(buildProjectedBalanceSeries(10)).toHaveLength(6)
  })

  it('handles a negative net', () => {
    const result = buildProjectedBalanceSeries(-50, 2)
    expect(result[0].balance).toBe(-50)
    expect(result[1].balance).toBe(-100)
  })
})

describe('buildRiskRadarData', () => {
  it('returns null when any input is null', () => {
    expect(buildRiskRadarData(null, 'some', 'hold')).toBeNull()
    expect(buildRiskRadarData('long', null, 'hold')).toBeNull()
    expect(buildRiskRadarData('long', 'some', null)).toBeNull()
  })

  it('normalizes each axis to a 0-100 percentage of its own max', () => {
    const result = buildRiskRadarData('long', 'experienced', 'buy_more')
    expect(result).toEqual([
      { axis: 'Horizonte', value: 100 },
      { axis: 'Experiência', value: 100 },
      { axis: 'Reação a perdas', value: 100 },
    ])
  })

  it('scores the lowest answers as 0', () => {
    const result = buildRiskRadarData('short', 'none', 'sell_all')
    expect(result).toEqual([
      { axis: 'Horizonte', value: 0 },
      { axis: 'Experiência', value: 0 },
      { axis: 'Reação a perdas', value: 0 },
    ])
  })
})

describe('buildPendingActions', () => {
  it('returns no actions when everything is complete and there are no pending invites', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 0,
      isFamilyWorkspace: true,
    })
    expect(result).toEqual([])
  })

  it('lists onboarding, income, and expenses actions when all are missing', () => {
    const result = buildPendingActions({
      onboardingCompleted: false,
      hasIncome: false,
      hasExpenses: false,
      pendingInviteCount: 0,
      isFamilyWorkspace: false,
    })
    expect(result).toEqual([
      { label: 'Complete o seu perfil de investidor', href: '/dashboard?onboarding=1' },
      { label: 'Configure o seu rendimento', href: '/budget' },
      { label: 'Configure os seus gastos fixos', href: '/budget' },
    ])
  })

  it('adds a pending-invites action only for family workspaces with pending invites', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 2,
      isFamilyWorkspace: true,
    })
    expect(result).toEqual([{ label: '2 convites de família pendentes', href: '/settings/family' }])
  })

  it('does not add a pending-invites action for a personal workspace', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 3,
      isFamilyWorkspace: false,
    })
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run tests/unit/dashboard-overview.test.ts`
Expected: FAIL with "Cannot find module '@/lib/dashboard/overview'".

- [ ] **Step 5: Write the implementation**

```ts
import { toMonthlyAmount, type Cadence } from '@/lib/finance/cadence'
import type { LookupOption } from '@/lib/finance/queries'
import {
  HORIZON_POINTS,
  EXPERIENCE_POINTS,
  LOSS_REACTION_POINTS,
  HORIZON_MAX,
  EXPERIENCE_MAX,
  LOSS_REACTION_MAX,
} from '@/lib/onboarding/risk-scoring'
import type { InvestmentHorizon, InvestmentExperience, LossReaction } from '@/lib/onboarding/steps'

export type CategoryTotal = { label: string; value: number }

export function groupMonthlyTotals<T extends { active: boolean; amount: number; cadence: Cadence }>(
  items: T[],
  lookupIdOf: (item: T) => string,
  lookupOptions: LookupOption[]
): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (!item.active) continue
    const id = lookupIdOf(item)
    const monthly = toMonthlyAmount(item.amount, item.cadence)
    totals.set(id, Math.round(((totals.get(id) ?? 0) + monthly) * 100) / 100)
  }
  return lookupOptions
    .map((option) => ({ label: option.label, value: totals.get(option.id) ?? 0 }))
    .filter((entry) => entry.value > 0)
}

export function sumActiveMonthly<T extends { active: boolean; amount: number; cadence: Cadence }>(items: T[]): number {
  return Math.round(
    items.filter((item) => item.active).reduce((sum, item) => sum + toMonthlyAmount(item.amount, item.cadence), 0) * 100
  ) / 100
}

export type ProjectedBalancePoint = { month: string; balance: number }

export function buildProjectedBalanceSeries(monthlyNet: number, months = 6): ProjectedBalancePoint[] {
  const formatter = new Intl.DateTimeFormat('pt-PT', { month: 'short' })
  const base = new Date()
  const points: ProjectedBalancePoint[] = []
  let cumulative = 0
  for (let i = 1; i <= months; i++) {
    cumulative = Math.round((cumulative + monthlyNet) * 100) / 100
    const monthDate = new Date(base.getFullYear(), base.getMonth() + i, 1)
    points.push({ month: formatter.format(monthDate), balance: cumulative })
  }
  return points
}

export type RiskRadarPoint = { axis: string; value: number }

export function buildRiskRadarData(
  horizon: InvestmentHorizon | null,
  experience: InvestmentExperience | null,
  lossReaction: LossReaction | null
): RiskRadarPoint[] | null {
  if (horizon === null || experience === null || lossReaction === null) return null

  return [
    { axis: 'Horizonte', value: Math.round((HORIZON_POINTS[horizon] / HORIZON_MAX) * 100) },
    { axis: 'Experiência', value: Math.round((EXPERIENCE_POINTS[experience] / EXPERIENCE_MAX) * 100) },
    { axis: 'Reação a perdas', value: Math.round((LOSS_REACTION_POINTS[lossReaction] / LOSS_REACTION_MAX) * 100) },
  ]
}

export type PendingAction = { label: string; href: string }

export function buildPendingActions(input: {
  onboardingCompleted: boolean
  hasIncome: boolean
  hasExpenses: boolean
  pendingInviteCount: number
  isFamilyWorkspace: boolean
}): PendingAction[] {
  const actions: PendingAction[] = []

  if (!input.onboardingCompleted) {
    actions.push({ label: 'Complete o seu perfil de investidor', href: '/dashboard?onboarding=1' })
  }
  if (!input.hasIncome) {
    actions.push({ label: 'Configure o seu rendimento', href: '/budget' })
  }
  if (!input.hasExpenses) {
    actions.push({ label: 'Configure os seus gastos fixos', href: '/budget' })
  }
  if (input.isFamilyWorkspace && input.pendingInviteCount > 0) {
    actions.push({
      label: `${input.pendingInviteCount} convite${input.pendingInviteCount === 1 ? '' : 's'} de família pendente${
        input.pendingInviteCount === 1 ? '' : 's'
      }`,
      href: '/settings/family',
    })
  }

  return actions
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run tests/unit/dashboard-overview.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 7: Commit**

```bash
git add lib/onboarding/risk-scoring.ts lib/dashboard/overview.ts tests/unit/dashboard-overview.test.ts
git commit -m "feat: add dashboard overview calculation helpers"
```

---

### Task 4: Widget components

**Files:**
- Create: `components/dashboard/widgets/financial-summary-widget.tsx`
- Create: `components/dashboard/widgets/expenses-by-category-widget.tsx`
- Create: `components/dashboard/widgets/income-vs-expenses-widget.tsx`
- Create: `components/dashboard/widgets/projected-balance-widget.tsx`
- Create: `components/dashboard/widgets/risk-profile-widget.tsx`
- Create: `components/dashboard/widgets/pending-actions-widget.tsx`

**Interfaces:**
- Consumes: `formatCurrency` from `@/lib/finance/cadence`; `AppPieChart`/`AppBarChart`/`AppLineChart`/`AppRadarChart` from `@/components/charts/*` (Task 2); `CategoryTotal`, `ProjectedBalancePoint`, `RiskRadarPoint`, `PendingAction` types from `@/lib/dashboard/overview` (Task 3, values already computed by the caller — these widgets are presentational, they do NOT call the `lib/dashboard/overview.ts` functions themselves); `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` from `@/components/ui/card`; `Button` from `@/components/ui/button`; icons from `lucide-react`.
- Produces: `export function FinancialSummaryWidget(props: { monthlyIncome: number; monthlyExpenses: number }): JSX.Element`, `export function ExpensesByCategoryWidget(props: { data: CategoryTotal[] }): JSX.Element`, `export function IncomeVsExpensesWidget(props: { monthlyIncome: number; monthlyExpenses: number }): JSX.Element`, `export function ProjectedBalanceWidget(props: { data: ProjectedBalancePoint[]; hasData: boolean }): JSX.Element`, `export function RiskProfileWidget(props: { data: RiskRadarPoint[] | null }): JSX.Element`, `export function PendingActionsWidget(props: { actions: PendingAction[] }): JSX.Element`. Task 5's `overview-grid.tsx` renders all 6.

- [ ] **Step 1: Write `financial-summary-widget.tsx`**

```tsx
import { Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance/cadence'

export function FinancialSummaryWidget({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const balance = monthlyIncome - monthlyExpenses

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Wallet className="size-4" aria-hidden />
        </span>
        <CardTitle>Resumo financeiro</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Rendimento mensal estimado</span>
          <span className="font-medium text-ink">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Gastos mensais estimados</span>
          <span className="font-medium text-ink">{formatCurrency(monthlyExpenses)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">Saldo disponível estimado</span>
          <span className={`font-display text-lg font-medium ${balance >= 0 ? 'text-primary-strong' : 'text-danger'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
        {monthlyIncome === 0 && monthlyExpenses === 0 && (
          <p className="text-xs text-muted">
            Ainda não configurou rendimento nem gastos fixos —{' '}
            <a href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              comece agora
            </a>
            .
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Write `expenses-by-category-widget.tsx`**

```tsx
import { PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppPieChart } from '@/components/charts/app-pie-chart'
import type { CategoryTotal } from '@/lib/dashboard/overview'

export function ExpensesByCategoryWidget({ data }: { data: CategoryTotal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-soft text-violet">
          <PieChart className="size-4" aria-hidden />
        </span>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Ainda não tem gastos fixos configurados.{' '}
            <a href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              Configure os seus gastos fixos
            </a>
            .
          </p>
        ) : (
          <AppPieChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Write `income-vs-expenses-widget.tsx`**

```tsx
import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppBarChart } from '@/components/charts/app-bar-chart'

export function IncomeVsExpensesWidget({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const hasData = monthlyIncome > 0 || monthlyExpenses > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky">
          <BarChart3 className="size-4" aria-hidden />
        </span>
        <CardTitle>Rendimento vs. Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted">
            Configure o seu rendimento e gastos fixos para ver esta comparação.
          </p>
        ) : (
          <AppBarChart
            data={[
              { label: 'Rendimento', value: monthlyIncome },
              { label: 'Gastos', value: monthlyExpenses },
            ]}
          />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Write `projected-balance-widget.tsx`**

```tsx
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLineChart } from '@/components/charts/app-line-chart'
import type { ProjectedBalancePoint } from '@/lib/dashboard/overview'

export function ProjectedBalanceWidget({ data, hasData }: { data: ProjectedBalancePoint[]; hasData: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy-ink">
          <TrendingUp className="size-4" aria-hidden />
        </span>
        <div>
          <CardTitle>Saldo projetado</CardTitle>
          <CardDescription>Projeção baseada nos valores recorrentes configurados, não no histórico real de transações.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted">
            Configure o seu rendimento e gastos fixos para ver a projeção dos próximos meses.
          </p>
        ) : (
          <AppLineChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Write `risk-profile-widget.tsx`**

```tsx
import { ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppRadarChart } from '@/components/charts/app-radar-chart'
import type { RiskRadarPoint } from '@/lib/dashboard/overview'

export function RiskProfileWidget({ data }: { data: RiskRadarPoint[] | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <CardTitle>O seu perfil de risco</CardTitle>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <p className="py-8 text-center text-sm text-muted">
            Complete o seu perfil de investidor para ver o seu perfil de risco aqui.
          </p>
        ) : (
          <AppRadarChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Write `pending-actions-widget.tsx`**

```tsx
import { CheckCircle2, ListTodo } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PendingAction } from '@/lib/dashboard/overview'

export function PendingActionsWidget({ actions }: { actions: PendingAction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ListTodo className="size-4" aria-hidden />
        </span>
        <CardTitle>Ações pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted">
            <CheckCircle2 className="size-4 shrink-0 text-primary-strong" aria-hidden />
            Tudo em dia por agora.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((action) => (
              <li key={action.label}>
                <a
                  href={action.href}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-ink transition-colors hover:bg-surface-sunken"
                >
                  {action.label}
                  <span className="text-primary-strong">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors. (If `bg-warning/15` is rejected by Tailwind's linter/type-checking — it won't be, Tailwind v4 arbitrary opacity suffixes on any color token are valid — no action needed; this is a note for the implementer's awareness, not an expected failure.)

- [ ] **Step 8: Commit**

```bash
git add components/dashboard/widgets/
git commit -m "feat: add the 6 dashboard overview widget components"
```

---

### Task 5: Overview grid wiring + dashboard page

**Files:**
- Create: `components/dashboard/overview-grid.tsx`
- Modify: `app/(dashboard)/dashboard/page.tsx` (replace the current empty-state block with the widget grid, keep the existing greeting + `WorkspaceSummaryCard`)

**Interfaces:**
- Consumes: all 6 widgets from `@/components/dashboard/widgets/*` (Task 4); `groupMonthlyTotals`, `sumActiveMonthly`, `buildProjectedBalanceSeries`, `buildRiskRadarData`, `buildPendingActions` from `@/lib/dashboard/overview` (Task 3); `IncomeSourceRow`, `RecurringExpenseRow`, `LookupOption`, `getIncomeSources`, `getRecurringExpenses`, `getIncomeSourceTypes`, `getExpenseCategories` from `@/lib/finance/queries`; `getOnboardingProfile` from `@/lib/onboarding/queries` (already exists, used by `app/(dashboard)/layout.tsx`); everything already imported in the current `app/(dashboard)/dashboard/page.tsx` (`getUserWorkspaces`, `getActiveWorkspaceId`, `createClient`).

- [ ] **Step 1: Write `overview-grid.tsx`**

```tsx
import { FinancialSummaryWidget } from './widgets/financial-summary-widget'
import { ExpensesByCategoryWidget } from './widgets/expenses-by-category-widget'
import { IncomeVsExpensesWidget } from './widgets/income-vs-expenses-widget'
import { ProjectedBalanceWidget } from './widgets/projected-balance-widget'
import { RiskProfileWidget } from './widgets/risk-profile-widget'
import { PendingActionsWidget } from './widgets/pending-actions-widget'
import {
  groupMonthlyTotals,
  sumActiveMonthly,
  buildProjectedBalanceSeries,
  buildRiskRadarData,
  buildPendingActions,
} from '@/lib/dashboard/overview'
import type { IncomeSourceRow, RecurringExpenseRow, LookupOption } from '@/lib/finance/queries'
import type { InvestmentHorizon, InvestmentExperience, LossReaction } from '@/lib/onboarding/steps'

export function OverviewGrid({
  incomeSources,
  recurringExpenses,
  incomeSourceTypes,
  expenseCategories,
  onboardingCompleted,
  investmentHorizon,
  investmentExperience,
  lossReaction,
  pendingInviteCount,
  isFamilyWorkspace,
}: {
  incomeSources: IncomeSourceRow[]
  recurringExpenses: RecurringExpenseRow[]
  incomeSourceTypes: LookupOption[]
  expenseCategories: LookupOption[]
  onboardingCompleted: boolean
  investmentHorizon: InvestmentHorizon | null
  investmentExperience: InvestmentExperience | null
  lossReaction: LossReaction | null
  pendingInviteCount: number
  isFamilyWorkspace: boolean
}) {
  const monthlyIncome = sumActiveMonthly(incomeSources)
  const monthlyExpenses = sumActiveMonthly(recurringExpenses)
  const hasProjectionData = monthlyIncome > 0 || monthlyExpenses > 0

  const expensesByCategory = groupMonthlyTotals(recurringExpenses, (e) => e.category_id, expenseCategories)
  const projectedBalance = buildProjectedBalanceSeries(monthlyIncome - monthlyExpenses)
  const riskRadarData = buildRiskRadarData(investmentHorizon, investmentExperience, lossReaction)
  const pendingActions = buildPendingActions({
    onboardingCompleted,
    hasIncome: incomeSources.some((s) => s.active),
    hasExpenses: recurringExpenses.some((e) => e.active),
    pendingInviteCount,
    isFamilyWorkspace,
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <FinancialSummaryWidget monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      <ExpensesByCategoryWidget data={expensesByCategory} />
      <IncomeVsExpensesWidget monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      <div className="lg:col-span-2">
        <ProjectedBalanceWidget data={projectedBalance} hasData={hasProjectionData} />
      </div>
      <RiskProfileWidget data={riskRadarData} />
      <div className="xl:col-span-3 lg:col-span-2">
        <PendingActionsWidget actions={pendingActions} />
      </div>
    </div>
  )
}
```

Note: `incomeSourceTypes` is accepted as a prop but unused inside this component — it is NOT needed by any of the 6 widgets (only `expenseCategories` is, for the pie chart). Keep the prop for symmetry with how Task 5 Step 2 fetches data below (the page fetches both lookup tables the same way the `/budget` page does), but do not remove it or add an eslint-disable — an unused destructured prop from an object parameter does not trigger `no-unused-vars` the way an unused local variable would. If `npm run lint` in Step 4 disagrees, delete the `incomeSourceTypes` prop and its corresponding fetch/pass-through in Step 2 instead of suppressing the lint rule.

- [ ] **Step 2: Replace `app/(dashboard)/dashboard/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { getOnboardingProfile } from '@/lib/onboarding/queries'
import {
  getIncomeSources,
  getRecurringExpenses,
  getIncomeSourceTypes,
  getExpenseCategories,
} from '@/lib/finance/queries'
import { WorkspaceSummaryCard } from '@/components/dashboard/workspace-summary-card'
import { OverviewGrid } from '@/components/dashboard/overview-grid'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)!

  let pendingInviteCount = 0
  let memberCount = 0
  if (activeWorkspace.type === 'family') {
    const { data: members } = await supabase.rpc('get_workspace_members_with_email', {
      p_workspace_id: activeWorkspace.id,
    })
    memberCount = members?.length ?? 0

    const { data: invites } = await supabase
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', activeWorkspace.id)
      .eq('status', 'pending')
    pendingInviteCount = invites?.length ?? 0
  }

  const [incomeSources, recurringExpenses, incomeSourceTypes, expenseCategories, onboardingProfile] = await Promise.all([
    getIncomeSources(supabase, activeWorkspace.id),
    getRecurringExpenses(supabase, activeWorkspace.id),
    getIncomeSourceTypes(supabase),
    getExpenseCategories(supabase),
    getOnboardingProfile(supabase, user!.id),
  ])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">{firstName ? `Olá, ${firstName}` : 'Olá'}</h2>
        <p className="mt-1 text-muted">Aqui está a visão geral das suas finanças.</p>
      </div>

      <WorkspaceSummaryCard workspace={activeWorkspace} memberCount={memberCount} pendingInviteCount={pendingInviteCount} />

      <OverviewGrid
        incomeSources={incomeSources}
        recurringExpenses={recurringExpenses}
        incomeSourceTypes={incomeSourceTypes}
        expenseCategories={expenseCategories}
        onboardingCompleted={Boolean(onboardingProfile?.completed_at)}
        investmentHorizon={onboardingProfile?.investment_horizon ?? null}
        investmentExperience={onboardingProfile?.investment_experience ?? null}
        lossReaction={onboardingProfile?.loss_reaction ?? null}
        pendingInviteCount={pendingInviteCount}
        isFamilyWorkspace={activeWorkspace.type === 'family'}
      />
    </div>
  )
}
```

Note: the subtitle text changed from "Aqui vai ficar a visão geral das suas finanças." (future tense — appropriate for an empty placeholder) to "Aqui está a visão geral das suas finanças." (present tense — appropriate now that the overview actually exists). The old "Ligue a sua primeira conta" empty-state block is fully removed — it duplicated what `FinancialSummaryWidget`'s own empty state already communicates, and `/accounts/connect` is unrelated to what this page now shows.

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify lint**

Run: `npm run lint`
Expected: clean (a pre-existing unrelated error in `tests/integration/family-workspaces.rls.test.ts` is expected and not part of this change).

- [ ] **Step 5: Run the full unit test suite**

Run: `npx vitest run tests/unit/`
Expected: PASS, including the pre-existing suites and the new `dashboard-overview.test.ts` from Task 3.

- [ ] **Step 6: Manual verification**

Start the dev server (`npm run dev`) if not already running, sign up or log in, navigate to `/dashboard`. Confirm: all 6 widgets render; a brand-new user sees every widget's empty/CTA state (no bare zeros, no broken charts); after configuring income + expenses on `/budget` and completing onboarding, all 6 widgets show real data — chart colors match the platform palette (jade/sky/violet/warning/navy/danger), the pending-actions widget's list shrinks as each condition is satisfied and shows "Tudo em dia por agora." once everything is done; no console errors.

- [ ] **Step 7: Commit**

```bash
git add components/dashboard/overview-grid.tsx "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat: replace the dashboard empty state with the overview widget grid"
```
