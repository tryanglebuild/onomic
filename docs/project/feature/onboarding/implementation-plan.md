# Implementation Plan — Onboarding

**Feature spec:** docs/project/feature/onboarding/feature-spec.md
**Status:** Planned (v2 — modal + expanded investor profile)
**Created:** 2026-09-10
**Last updated:** 2026-09-11
**Author:** Leandro Oliveira

---

## Revision note (v2)

v1 (5-step page, self-declared risk label) is committed (`feat(onboarding): add onboarding profiles and related queries`) but its migration was never applied to any database. This plan replaces v1's page/shell with a modal, expands the flow to 8 steps, and makes `risk_profile` a computed value. **Phase 1 edits the existing migration file in place** rather than adding a new one — since nothing has ever been applied, there is no live schema to migrate away from. Phases 2–7 modify or delete v1's already-committed files directly (real `git diff`s against a real base commit, not new files) except where noted as new.

---

## Overview

7 phases. Order matters: schema → types → logic (steps data, risk scoring, actions) → step UI → modal shell → shell/navbar integration → signup redirect. Phases must be completed in order.

**MVP boundary:** all 7 phases ship together.

---

## Technical Context

- Same stack/conventions as v1 (Server Actions, no `app/api/*`, Supabase RLS, Tailwind v4 tokens).
- **New dependency:** `@radix-ui/react-dialog` — same family as the already-installed `@radix-ui/react-dropdown-menu`/`@radix-ui/react-collapsible`.
- **New architectural piece:** `useSearchParams()` inside a Client Component wrapped in `<Suspense>`. This is a deliberate departure from the `QueryErrorToast` pattern (which receives its query-param value as a **prop** from a server Page component) — `app/(dashboard)/layout.tsx` is a *layout*, and Next.js layouts do not receive a `searchParams` prop (only `page.tsx` files do), so the onboarding auto-open signal cannot be threaded down from the server the same way. Reading it client-side via `useSearchParams()` is the only option here, hence the `<Suspense>` boundary Next.js requires around that hook.
- Primary files to read before starting: everything under `lib/onboarding/`, `app/onboarding/`, `components/onboarding/`, plus `components/dashboard/dashboard-shell.tsx`, `components/dashboard/navbar.tsx`, `components/dashboard/onboarding-reminder.tsx`, `app/(dashboard)/layout.tsx`, `components/ui/query-error-toast.tsx` (the prop-based pattern this plan's auto-open deliberately differs from, see above).

---

## Phase 1 — Migration: schema changes (edit in place)

**Goal:** `onboarding_profiles` gains the 4 new investor-profile columns, loses `skipped_at`, and `current_step`'s range extends to 8. Never applied to any database, so this is a direct edit, not a new migration.

### Step 1.1 — Edit the migration file

**File:** `supabase/migrations/20260910120000_005_onboarding_profiles.sql` (existing — edit in place)

Replace the `create table onboarding_profiles (...)` block with:

```sql
create table onboarding_profiles (
  id                          uuid primary key references auth.users(id) on delete cascade,
  primary_goals               text[] not null default '{}',
  investment_horizon          text,
  investment_experience       text,
  loss_reaction                text,
  investment_purpose          text[] not null default '{}',
  risk_profile                text,
  investment_target_amount    numeric(12,2),
  investment_target_frequency text,
  asset_preferences           text[] not null default '{}',
  current_step                smallint not null default 1,
  completed_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint onboarding_profiles_current_step_range
    check (current_step between 1 and 8),
  constraint onboarding_profiles_horizon_valid
    check (investment_horizon is null or investment_horizon in ('short', 'medium', 'long')),
  constraint onboarding_profiles_experience_valid
    check (investment_experience is null or investment_experience in ('none', 'some', 'experienced')),
  constraint onboarding_profiles_loss_reaction_valid
    check (loss_reaction is null or loss_reaction in ('sell_all', 'sell_some', 'hold', 'buy_more')),
  constraint onboarding_profiles_purpose_valid
    check (investment_purpose <@ array['retirement', 'home', 'grow_wealth', 'passive_income', 'other']::text[]),
  constraint onboarding_profiles_risk_profile_valid
    check (risk_profile is null or risk_profile in ('conservative', 'moderate', 'aggressive')),
  constraint onboarding_profiles_frequency_valid
    check (investment_target_frequency is null or investment_target_frequency in ('monthly', 'quarterly')),
  constraint onboarding_profiles_primary_goals_valid
    check (primary_goals <@ array['budgeting', 'saving', 'investing', 'family']::text[]),
  constraint onboarding_profiles_asset_preferences_valid
    check (asset_preferences <@ array['crypto', 'stocks', 'etfs', 'undecided']::text[])
);
```

(Removed: the `skipped_at timestamptz,` line. Added: `investment_horizon`, `investment_experience`, `loss_reaction`, `investment_purpose` columns plus their 4 new CHECK constraints. Changed: `current_step_range` from `between 1 and 5` to `between 1 and 8`.)

Everything below that block in the file — `enable row level security`, both RLS policies, `set_onboarding_profiles_updated_at()` + its trigger, the `handle_new_user_profile()` extension, and the backfill `insert` at the end — is **unchanged**. None of them reference the columns that changed.

**Verification:**
- Re-read the full file after editing; confirm exactly one `create table onboarding_profiles` block exists and nothing after it was accidentally duplicated or removed.
- Once applied for real (still the user's manual SQL-Editor process, same as before): confirm `update onboarding_profiles set current_step = 8 where id = auth.uid()` succeeds and `= 9` fails the CHECK; confirm `update ... set investment_horizon = 'short'` succeeds and `= 'nonsense'` fails; confirm `skipped_at` is genuinely gone (`select skipped_at from onboarding_profiles limit 1` errors with "column does not exist").

---

## Phase 2 — Hand-authored types

**Goal:** `database.types.ts`'s `onboarding_profiles` entry matches Phase 1's new column set exactly.

### Step 2.1 — Edit the type entry

**File:** `lib/supabase/database.types.ts` (existing — edit in place)

Replace the `onboarding_profiles` entry with:

```ts
      onboarding_profiles: {
        Row: {
          id: string
          primary_goals: ('budgeting' | 'saving' | 'investing' | 'family')[]
          investment_horizon: 'short' | 'medium' | 'long' | null
          investment_experience: 'none' | 'some' | 'experienced' | null
          loss_reaction: 'sell_all' | 'sell_some' | 'hold' | 'buy_more' | null
          investment_purpose: ('retirement' | 'home' | 'grow_wealth' | 'passive_income' | 'other')[]
          risk_profile: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount: number | null
          investment_target_frequency: 'monthly' | 'quarterly' | null
          asset_preferences: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          primary_goals?: ('budgeting' | 'saving' | 'investing' | 'family')[]
          investment_horizon?: 'short' | 'medium' | 'long' | null
          investment_experience?: 'none' | 'some' | 'experienced' | null
          loss_reaction?: 'sell_all' | 'sell_some' | 'hold' | 'buy_more' | null
          investment_purpose?: ('retirement' | 'home' | 'grow_wealth' | 'passive_income' | 'other')[]
          risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount?: number | null
          investment_target_frequency?: 'monthly' | 'quarterly' | null
          asset_preferences?: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['onboarding_profiles']['Insert']>
        Relationships: []
      }
```

(Removed the `skipped_at` field from both `Row` and `Insert`. Added the 4 new fields to both. `Update` stays a `Partial<Insert>`, unchanged shape.)

**Verification:** `npx tsc --noEmit` — expect NEW errors at this point (every file still referencing `skipped_at`/the old 5-step shape hasn't been touched yet) — that's expected and resolved by Phases 3–4. Just confirm this one block itself has no syntax errors by checking the diff is well-formed.

---

## Phase 3 — Risk scoring, step data, actions

**Goal:** the full logic layer for the new 8-step flow — no UI yet.

### Step 3.1 — Risk scoring (new, pure, tested)

**File:** `lib/onboarding/risk-scoring.ts` (new)

```ts
import type { InvestmentHorizon, InvestmentExperience, LossReaction, RiskProfile } from './steps'

const HORIZON_POINTS: Record<InvestmentHorizon, number> = { short: 0, medium: 1, long: 2 }
const EXPERIENCE_POINTS: Record<InvestmentExperience, number> = { none: 0, some: 1, experienced: 2 }
const LOSS_REACTION_POINTS: Record<LossReaction, number> = { sell_all: 0, sell_some: 1, hold: 2, buy_more: 3 }

/**
 * Deterministic risk-profile scoring — never asked directly, always derived
 * from three behavioral answers (0-7 points total). A missing answer scores
 * 0 for that dimension rather than throwing, so an incomplete questionnaire
 * still produces a conservative-leaning result.
 */
export function computeRiskProfile(
  horizon: InvestmentHorizon | null,
  experience: InvestmentExperience | null,
  lossReaction: LossReaction | null
): RiskProfile {
  const score =
    (horizon ? HORIZON_POINTS[horizon] : 0) +
    (experience ? EXPERIENCE_POINTS[experience] : 0) +
    (lossReaction ? LOSS_REACTION_POINTS[lossReaction] : 0)

  if (score <= 2) return 'conservative'
  if (score <= 4) return 'moderate'
  return 'aggressive'
}
```

**Test file:** `tests/unit/onboarding-risk-scoring.test.ts` (new)

```ts
import { describe, expect, it } from 'vitest'
import { computeRiskProfile } from '@/lib/onboarding/risk-scoring'

describe('computeRiskProfile', () => {
  it('returns conservative for the lowest possible score', () => {
    expect(computeRiskProfile('short', 'none', 'sell_all')).toBe('conservative')
  })

  it('returns conservative at the top of its range (score = 2)', () => {
    expect(computeRiskProfile('medium', 'none', 'sell_all')).toBe('conservative')
  })

  it('returns moderate at the bottom of its range (score = 3)', () => {
    expect(computeRiskProfile('long', 'none', 'sell_all')).toBe('moderate')
  })

  it('returns moderate at the top of its range (score = 4)', () => {
    expect(computeRiskProfile('medium', 'some', 'sell_some')).toBe('moderate')
  })

  it('returns aggressive at the bottom of its range (score = 5)', () => {
    expect(computeRiskProfile('long', 'some', 'sell_some')).toBe('aggressive')
  })

  it('returns aggressive for the highest possible score', () => {
    expect(computeRiskProfile('long', 'experienced', 'buy_more')).toBe('aggressive')
  })

  it('treats every missing answer as 0 points, never throws', () => {
    expect(computeRiskProfile(null, null, null)).toBe('conservative')
  })

  it('scores partial answers using only what is present', () => {
    expect(computeRiskProfile('long', null, null)).toBe('conservative') // 2 points
    expect(computeRiskProfile('long', 'experienced', null)).toBe('moderate') // 4 points
  })
})
```

- [ ] **Step 3.1.1: Run the test to verify it fails**

Run: `npx vitest run tests/unit/onboarding-risk-scoring.test.ts`
Expected: FAIL — `Cannot find module '@/lib/onboarding/risk-scoring'`

- [ ] **Step 3.1.2: Run the test to verify it passes** (after writing the implementation above)

Run: `npx vitest run tests/unit/onboarding-risk-scoring.test.ts`
Expected: PASS (8 tests)

### Step 3.2 — Step data (rewritten)

**File:** `lib/onboarding/steps.ts` (existing — full rewrite)

```ts
import type { LucideIcon } from 'lucide-react'
import {
  Compass,
  Hourglass,
  GraduationCap,
  TrendingDown,
  Target,
  TrendingUp,
  Layers,
  CheckCircle2,
} from 'lucide-react'

export type PrimaryGoal = 'budgeting' | 'saving' | 'investing' | 'family'
export type InvestmentHorizon = 'short' | 'medium' | 'long'
export type InvestmentExperience = 'none' | 'some' | 'experienced'
export type LossReaction = 'sell_all' | 'sell_some' | 'hold' | 'buy_more'
export type InvestmentPurpose = 'retirement' | 'home' | 'grow_wealth' | 'passive_income' | 'other'
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type InvestmentFrequency = 'monthly' | 'quarterly'
export type AssetPreference = 'crypto' | 'stocks' | 'etfs' | 'undecided'

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'budgeting', label: 'Controlar gastos e orçamento' },
  { value: 'saving', label: 'Poupar para um objetivo' },
  { value: 'investing', label: 'Investir e fazer crescer o património' },
  { value: 'family', label: 'Gerir finanças em família' },
]

export const INVESTMENT_HORIZON_OPTIONS: { value: InvestmentHorizon; label: string; description: string }[] = [
  { value: 'short', label: 'Curto prazo', description: 'Menos de 2 anos.' },
  { value: 'medium', label: 'Médio prazo', description: 'Entre 2 e 5 anos.' },
  { value: 'long', label: 'Longo prazo', description: 'Mais de 5 anos.' },
]

export const INVESTMENT_EXPERIENCE_OPTIONS: { value: InvestmentExperience; label: string }[] = [
  { value: 'none', label: 'Nenhuma — nunca investi' },
  { value: 'some', label: 'Alguma — já experimentei' },
  { value: 'experienced', label: 'Tenho experiência' },
]

export const LOSS_REACTION_OPTIONS: { value: LossReaction; label: string }[] = [
  { value: 'sell_all', label: 'Vendia tudo imediatamente' },
  { value: 'sell_some', label: 'Vendia uma parte, por precaução' },
  { value: 'hold', label: 'Mantinha e esperava recuperar' },
  { value: 'buy_more', label: 'Aproveitava para comprar mais' },
]

export const INVESTMENT_PURPOSE_OPTIONS: { value: InvestmentPurpose; label: string }[] = [
  { value: 'retirement', label: 'Reforma' },
  { value: 'home', label: 'Comprar casa' },
  { value: 'grow_wealth', label: 'Crescer o património' },
  { value: 'passive_income', label: 'Gerar rendimento passivo' },
  { value: 'other', label: 'Outro' },
]

export const RISK_PROFILE_OPTIONS: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservador', description: 'Preferes segurança, mesmo com retornos mais baixos.' },
  { value: 'moderate', label: 'Moderado', description: 'Aceitas algum risco por um retorno melhor.' },
  { value: 'aggressive', label: 'Arrojado', description: 'Procuras o maior retorno possível, aceitas mais volatilidade.' },
]

export const INVESTMENT_FREQUENCY_OPTIONS: { value: InvestmentFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
]

export const ASSET_PREFERENCE_OPTIONS: { value: AssetPreference; label: string }[] = [
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'stocks', label: 'Ações' },
  { value: 'etfs', label: 'ETFs' },
  { value: 'undecided', label: 'Ainda não sei' },
]

export const ONBOARDING_STEPS: { step: number; title: string; icon: LucideIcon }[] = [
  { step: 1, title: 'Objetivo', icon: Compass },
  { step: 2, title: 'Horizonte temporal', icon: Hourglass },
  { step: 3, title: 'Experiência', icon: GraduationCap },
  { step: 4, title: 'Reação a uma queda', icon: TrendingDown },
  { step: 5, title: 'Propósito', icon: Target },
  { step: 6, title: 'Meta de investimento', icon: TrendingUp },
  { step: 7, title: 'Preferência de ativos', icon: Layers },
  { step: 8, title: 'Resumo', icon: CheckCircle2 },
]

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length
```

### Step 3.3 — Server Actions (rewritten)

**File:** `app/onboarding/actions.ts` (existing — full rewrite)

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type PrimaryGoal,
  type InvestmentHorizon,
  type InvestmentExperience,
  type LossReaction,
  type InvestmentPurpose,
  type InvestmentFrequency,
  type AssetPreference,
  TOTAL_ONBOARDING_STEPS,
} from '@/lib/onboarding/steps'
import { computeRiskProfile } from '@/lib/onboarding/risk-scoring'

const VALID_GOALS: PrimaryGoal[] = ['budgeting', 'saving', 'investing', 'family']
const VALID_HORIZONS: InvestmentHorizon[] = ['short', 'medium', 'long']
const VALID_EXPERIENCES: InvestmentExperience[] = ['none', 'some', 'experienced']
const VALID_LOSS_REACTIONS: LossReaction[] = ['sell_all', 'sell_some', 'hold', 'buy_more']
const VALID_PURPOSES: InvestmentPurpose[] = ['retirement', 'home', 'grow_wealth', 'passive_income', 'other']
const VALID_FREQUENCIES: InvestmentFrequency[] = ['monthly', 'quarterly']
const VALID_ASSET_PREFERENCES: AssetPreference[] = ['crypto', 'stocks', 'etfs', 'undecided']

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function saveGoalsStep(goals: PrimaryGoal[]) {
  const { supabase, user } = await requireUser()
  const clean = goals.filter((g) => VALID_GOALS.includes(g))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ primary_goals: clean, current_step: 2 })
    .eq('id', user.id)
  if (error) throw error
}

export async function saveInvestmentHorizonStep(horizon: InvestmentHorizon | null) {
  const { supabase, user } = await requireUser()
  const clean = horizon && VALID_HORIZONS.includes(horizon) ? horizon : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_horizon: clean, current_step: 3 })
    .eq('id', user.id)
  if (error) throw error
}

export async function saveInvestmentExperienceStep(experience: InvestmentExperience | null) {
  const { supabase, user } = await requireUser()
  const clean = experience && VALID_EXPERIENCES.includes(experience) ? experience : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_experience: clean, current_step: 4 })
    .eq('id', user.id)
  if (error) throw error
}

// The only step that reads before writing: risk_profile is computed from
// THIS answer plus the two saved by the previous two steps, so it needs
// their already-persisted values. It is never accepted as a direct input
// from the client — no action here takes a `riskProfile` parameter.
export async function saveLossReactionStep(lossReaction: LossReaction | null) {
  const { supabase, user } = await requireUser()
  const cleanReaction = lossReaction && VALID_LOSS_REACTIONS.includes(lossReaction) ? lossReaction : null

  const { data: current, error: fetchError } = await supabase
    .from('onboarding_profiles')
    .select('investment_horizon, investment_experience')
    .eq('id', user.id)
    .single()
  if (fetchError) throw fetchError

  const riskProfile = computeRiskProfile(current.investment_horizon, current.investment_experience, cleanReaction)

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ loss_reaction: cleanReaction, risk_profile: riskProfile, current_step: 5 })
    .eq('id', user.id)
  if (error) throw error
}

export async function saveInvestmentPurposeStep(purposes: InvestmentPurpose[]) {
  const { supabase, user } = await requireUser()
  const clean = purposes.filter((p) => VALID_PURPOSES.includes(p))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_purpose: clean, current_step: 6 })
    .eq('id', user.id)
  if (error) throw error
}

export async function saveInvestmentTargetStep(amount: number | null, frequency: InvestmentFrequency | null) {
  const { supabase, user } = await requireUser()
  const cleanAmount = amount !== null && amount > 0 ? amount : null
  const cleanFrequency =
    cleanAmount !== null && frequency && VALID_FREQUENCIES.includes(frequency) ? frequency : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({
      investment_target_amount: cleanAmount,
      investment_target_frequency: cleanFrequency,
      current_step: 7,
    })
    .eq('id', user.id)
  if (error) throw error
}

export async function saveAssetPreferencesStep(preferences: AssetPreference[]) {
  const { supabase, user } = await requireUser()
  const clean = preferences.filter((p) => VALID_ASSET_PREFERENCES.includes(p))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ asset_preferences: clean, current_step: TOTAL_ONBOARDING_STEPS })
    .eq('id', user.id)
  if (error) throw error
}

// No redirect — v2 is a modal over /dashboard, never a route navigation.
// The one thing OTHER sessions/future navigations need is a fresh
// `showOnboardingReminder` read in app/(dashboard)/layout.tsx, hence the
// layout revalidation; THIS session's immediate UI update (closing the
// modal, hiding the badge) is the modal's job via router.refresh(), not
// this action's.
export async function completeOnboarding() {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error

  revalidatePath('/dashboard', 'layout')
}

export async function goToOnboardingStep(step: number) {
  const { supabase, user } = await requireUser()
  const clamped = Math.max(1, Math.min(step, TOTAL_ONBOARDING_STEPS))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ current_step: clamped })
    .eq('id', user.id)
  if (error) throw error
}
```

Removed entirely from v1: `skipOnboarding`. There is no longer a `skipped_at` column to write, and "Completar mais tarde" in v2 is a pure client-side close (see Phase 4) — no server round-trip needed for it at all.

**Verification:**
- `npx tsc --noEmit` — expect errors ONLY in files not yet touched by this plan (every `components/onboarding/steps/*` file still importing the old shape) — Phase 4 resolves those.
- `npx vitest run tests/unit/onboarding-risk-scoring.test.ts` still passes.

---

## Phase 4 — Step UI components (4 new, 3 rewritten, 1 deleted)

**Goal:** all 8 step components exist, matching the new actions/data from Phase 3. No modal shell yet — these are still plain components, wired up by the flow controller in Phase 5.

**Delete:** `components/onboarding/steps/risk-profile-step.tsx` — the direct self-declaration UI is replaced by 3 separate behavioral steps below. Nothing will import it after this phase.

### Step 4.1 — Goals step (unchanged, no edit needed)

**File:** `components/onboarding/steps/goals-step.tsx` — content stays as-is EXCEPT the "Completar mais tarde" button changes from calling `skipOnboarding()` to calling a new `onSkip` prop (see the shared shape below, applied to every skippable step 1–7).

Updated file:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { PRIMARY_GOAL_OPTIONS, type PrimaryGoal } from '@/lib/onboarding/steps'
import { saveGoalsStep } from '@/app/onboarding/actions'

export function GoalsStep({
  initialGoals,
  onAdvance,
  onSkip,
}: {
  initialGoals: PrimaryGoal[]
  onAdvance: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<PrimaryGoal[]>(initialGoals)
  const [isPending, startTransition] = useTransition()

  function toggle(goal: PrimaryGoal) {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Compass className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">O que procuras na Onomic?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {PRIMARY_GOAL_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
          Completar mais tarde
        </button>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await saveGoalsStep(selected)
              onAdvance()
            })
          }
        >
          Seguinte
        </Button>
      </div>
    </div>
  )
}
```

### Step 4.2 — Investment horizon step (new)

**File:** `components/onboarding/steps/investment-horizon-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_HORIZON_OPTIONS, type InvestmentHorizon } from '@/lib/onboarding/steps'
import { saveInvestmentHorizonStep } from '@/app/onboarding/actions'

export function InvestmentHorizonStep({
  initialHorizon,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialHorizon: InvestmentHorizon | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentHorizon | null>(initialHorizon)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentHorizon) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Hourglass className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Por quanto tempo queres investir?</h1>
          <p className="mt-1 text-sm text-muted">
            Pensa em quando esperas precisar deste dinheiro de volta.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {INVESTMENT_HORIZON_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            description={option.description}
            selected={selected === option.value}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveInvestmentHorizonStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.3 — Investment experience step (new)

**File:** `components/onboarding/steps/investment-experience-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_EXPERIENCE_OPTIONS, type InvestmentExperience } from '@/lib/onboarding/steps'
import { saveInvestmentExperienceStep } from '@/app/onboarding/actions'

export function InvestmentExperienceStep({
  initialExperience,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialExperience: InvestmentExperience | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentExperience | null>(initialExperience)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentExperience) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Qual a tua experiência a investir?</h1>
          <p className="mt-1 text-sm text-muted">Sem julgamentos — ajuda-nos a explicar as coisas ao teu ritmo.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {INVESTMENT_EXPERIENCE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected === option.value}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveInvestmentExperienceStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.4 — Loss reaction step (new — the behavioral question)

**File:** `components/onboarding/steps/loss-reaction-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { LOSS_REACTION_OPTIONS, type LossReaction } from '@/lib/onboarding/steps'
import { saveLossReactionStep } from '@/app/onboarding/actions'

export function LossReactionStep({
  initialReaction,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialReaction: LossReaction | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<LossReaction | null>(initialReaction)
  const [isPending, startTransition] = useTransition()

  function toggle(value: LossReaction) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <TrendingDown className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Se o teu investimento caísse 20%, o que farias?</h1>
          <p className="mt-1 text-sm text-muted">Não há resposta certa — só queremos perceber a tua reação real.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {LOSS_REACTION_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected === option.value}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveLossReactionStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.5 — Investment purpose step (new)

**File:** `components/onboarding/steps/investment-purpose-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_PURPOSE_OPTIONS, type InvestmentPurpose } from '@/lib/onboarding/steps'
import { saveInvestmentPurposeStep } from '@/app/onboarding/actions'

export function InvestmentPurposeStep({
  initialPurposes,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialPurposes: InvestmentPurpose[]
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentPurpose[]>(initialPurposes)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentPurpose) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Target className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Para que estás a investir?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {INVESTMENT_PURPOSE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveInvestmentPurposeStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.6 — Investment target step (rewritten — `onSkip` prop, `onBack` target step renumbered)

**File:** `components/onboarding/steps/investment-target-step.tsx` (existing — edit in place)

Same content as v1, with two changes: `skipOnboarding` import/usage replaced by an `onSkip` prop (matching every other step), and — since this is Phase 6 of 8 now, not Phase 3 of 5 — the onboarding-flow controller (Phase 5) is what changes the actual back-target step number, not this file itself. Full updated content:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionButton } from '../option-button'
import { INVESTMENT_FREQUENCY_OPTIONS, type InvestmentFrequency } from '@/lib/onboarding/steps'
import { saveInvestmentTargetStep } from '@/app/onboarding/actions'

export function InvestmentTargetStep({
  initialAmount,
  initialFrequency,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialAmount: number | null
  initialFrequency: InvestmentFrequency | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [amount, setAmount] = useState(initialAmount !== null ? String(initialAmount) : '')
  const [frequency, setFrequency] = useState<InvestmentFrequency | null>(initialFrequency)
  const [isPending, startTransition] = useTransition()

  const parsedAmount = amount.trim() === '' ? null : Number(amount)
  const hasValidAmount = parsedAmount !== null && parsedAmount > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <TrendingUp className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Tens uma meta de investimento?</h1>
          <p className="mt-1 text-sm text-muted">
            Deixa em branco se ainda não investes, mas queres começar — também é uma resposta válida.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="investment_target_amount">Valor</Label>
        <Input
          id="investment_target_amount"
          type="number"
          min={0}
          step="0.01"
          placeholder="Ex.: 300"
          value={amount}
          onChange={(e) => {
            const next = e.target.value
            setAmount(next)
            if (next.trim() === '' || Number(next) <= 0) setFrequency(null)
          }}
        />
      </div>

      {hasValidAmount && (
        <div className="flex flex-col gap-2">
          <Label>Frequência</Label>
          {INVESTMENT_FREQUENCY_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={frequency === option.value}
              onClick={() => setFrequency(option.value)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveInvestmentTargetStep(hasValidAmount ? parsedAmount : null, frequency)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

(This also folds in the earlier-known minor finding from v1's final review: clearing the amount now clears `frequency` state too, in the `onChange` handler, instead of relying only on the server to null it out silently.)

### Step 4.7 — Asset preferences step (rewritten — `onSkip` prop only)

**File:** `components/onboarding/steps/asset-preferences-step.tsx` (existing — edit in place)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { ASSET_PREFERENCE_OPTIONS, type AssetPreference } from '@/lib/onboarding/steps'
import { saveAssetPreferencesStep } from '@/app/onboarding/actions'

export function AssetPreferencesStep({
  initialPreferences,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialPreferences: AssetPreference[]
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<AssetPreference[]>(initialPreferences)
  const [isPending, startTransition] = useTransition()

  function toggle(value: AssetPreference) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Layers className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Que tipos de ativo te interessam?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ASSET_PREFERENCE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveAssetPreferencesStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Step 4.8 — Summary step (rewritten — new fields, `onComplete` prop instead of calling the action directly)

**File:** `components/onboarding/steps/summary-step.tsx` (existing — edit in place)

```tsx
'use client'

import { useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PRIMARY_GOAL_OPTIONS,
  INVESTMENT_HORIZON_OPTIONS,
  INVESTMENT_EXPERIENCE_OPTIONS,
  LOSS_REACTION_OPTIONS,
  INVESTMENT_PURPOSE_OPTIONS,
  RISK_PROFILE_OPTIONS,
  ASSET_PREFERENCE_OPTIONS,
} from '@/lib/onboarding/steps'
import { completeOnboarding } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

function labelFor(value: string | null, options: { value: string; label: string }[]): string {
  return options.find((o) => o.value === value)?.label ?? 'Não respondido'
}

function labelsFor(values: string[], options: { value: string; label: string }[]): string {
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label)
  return labels.length > 0 ? labels.join(', ') : 'Não respondido'
}

export function SummaryStep({
  profile,
  onBack,
  onComplete,
}: {
  profile: OnboardingProfile
  onBack: () => void
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()

  const targetLabel =
    profile.investment_target_amount !== null
      ? `${profile.investment_target_amount}€ / ${profile.investment_target_frequency === 'quarterly' ? 'trimestre' : 'mês'}`
      : 'Não respondido'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Está quase</h1>
          <p className="mt-1 text-sm text-muted">Confirma o que respondeste — podes voltar atrás para mudar algo.</p>
        </div>
      </div>

      <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Objetivo</dt>
          <dd className="text-right font-medium">{labelsFor(profile.primary_goals, PRIMARY_GOAL_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Horizonte temporal</dt>
          <dd className="text-right font-medium">{labelFor(profile.investment_horizon, INVESTMENT_HORIZON_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Experiência</dt>
          <dd className="text-right font-medium">{labelFor(profile.investment_experience, INVESTMENT_EXPERIENCE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Reação a uma queda</dt>
          <dd className="text-right font-medium">{labelFor(profile.loss_reaction, LOSS_REACTION_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Propósito</dt>
          <dd className="text-right font-medium">{labelsFor(profile.investment_purpose, INVESTMENT_PURPOSE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-3">
          <dt className="text-muted">O teu perfil</dt>
          <dd className="text-right font-medium">{labelFor(profile.risk_profile, RISK_PROFILE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Meta de investimento</dt>
          <dd className="text-right font-medium">{targetLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Preferência de ativos</dt>
          <dd className="text-right font-medium">{labelsFor(profile.asset_preferences, ASSET_PREFERENCE_OPTIONS)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await completeOnboarding()
              onComplete()
            })
          }
        >
          Concluir
        </Button>
      </div>
    </div>
  )
}
```

Note `profile.risk_profile` is read directly from the DB row here (already computed and stored by `saveLossReactionStep` in Phase 3) — this step never calls `computeRiskProfile` itself, it only displays what was already persisted.

**Verification:**
- `npx tsc --noEmit` — expect remaining errors ONLY in `onboarding-flow.tsx`, `onboarding-shell.tsx`/`page.tsx` (not touched until Phase 5).
- Confirm `components/onboarding/steps/risk-profile-step.tsx` no longer exists (`ls` the directory).

---

## Phase 5 — Modal shell + flow controller + auto-open

**Goal:** the 8 steps are wired into a real Radix Dialog modal, openable/closeable, auto-opening once via a query param.

### Step 5.1 — Install the dependency

```bash
npm install @radix-ui/react-dialog
```

### Step 5.2 — Flow controller (rewritten for 8 steps + onSkip/onClose plumbing)

**File:** `components/onboarding/onboarding-flow.tsx` (existing — full rewrite)

```tsx
'use client'

import { useTransition } from 'react'
import { StepIndicator } from './step-indicator'
import { GoalsStep } from './steps/goals-step'
import { InvestmentHorizonStep } from './steps/investment-horizon-step'
import { InvestmentExperienceStep } from './steps/investment-experience-step'
import { LossReactionStep } from './steps/loss-reaction-step'
import { InvestmentPurposeStep } from './steps/investment-purpose-step'
import { InvestmentTargetStep } from './steps/investment-target-step'
import { AssetPreferencesStep } from './steps/asset-preferences-step'
import { SummaryStep } from './steps/summary-step'
import { goToOnboardingStep } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingFlow({
  profile,
  step,
  onStepChange,
  onClose,
}: {
  profile: OnboardingProfile
  step: number
  onStepChange: (step: number) => void
  onClose: () => void
}) {
  const [, startBackTransition] = useTransition()

  // Going back also has to persist `current_step`, same as advancing does —
  // otherwise resuming later (e.g. via the navbar badge) lands the user on
  // whatever step they were on before they clicked "Voltar", not the step
  // they actually left from.
  function goBack(n: number) {
    onStepChange(n)
    startBackTransition(() => goToOnboardingStep(n))
  }

  // "Completar mais tarde" needs no server round-trip in v2 — there's no
  // skipped_at column anymore, current_step already reflects wherever the
  // user last landed, and closing the modal is a purely client-side act.
  function skip() {
    onClose()
  }

  return (
    <div>
      <StepIndicator currentStep={step} />
      {step === 1 && (
        <GoalsStep initialGoals={profile.primary_goals} onAdvance={() => onStepChange(2)} onSkip={skip} />
      )}
      {step === 2 && (
        <InvestmentHorizonStep
          initialHorizon={profile.investment_horizon}
          onAdvance={() => onStepChange(3)}
          onBack={() => goBack(1)}
          onSkip={skip}
        />
      )}
      {step === 3 && (
        <InvestmentExperienceStep
          initialExperience={profile.investment_experience}
          onAdvance={() => onStepChange(4)}
          onBack={() => goBack(2)}
          onSkip={skip}
        />
      )}
      {step === 4 && (
        <LossReactionStep
          initialReaction={profile.loss_reaction}
          onAdvance={() => onStepChange(5)}
          onBack={() => goBack(3)}
          onSkip={skip}
        />
      )}
      {step === 5 && (
        <InvestmentPurposeStep
          initialPurposes={profile.investment_purpose}
          onAdvance={() => onStepChange(6)}
          onBack={() => goBack(4)}
          onSkip={skip}
        />
      )}
      {step === 6 && (
        <InvestmentTargetStep
          initialAmount={profile.investment_target_amount}
          initialFrequency={profile.investment_target_frequency}
          onAdvance={() => onStepChange(7)}
          onBack={() => goBack(5)}
          onSkip={skip}
        />
      )}
      {step === 7 && (
        <AssetPreferencesStep
          initialPreferences={profile.asset_preferences}
          onAdvance={() => onStepChange(8)}
          onBack={() => goBack(6)}
          onSkip={skip}
        />
      )}
      {step === 8 && <SummaryStep profile={profile} onBack={() => goBack(7)} onComplete={onClose} />}
    </div>
  )
}
```

Note `step`/`onStepChange` are now **props**, not local state owned by this component — the modal (Step 5.3) owns them, because the modal also needs to reset to `profile.current_step` every time it's reopened (a user could close at step 3, do other things, reopen later — the modal must show the freshly-fetched `current_step`, not whatever was left over in a stale local `useState` initializer from the first mount).

### Step 5.3 — Onboarding modal (new — replaces `onboarding-shell.tsx`)

**File:** `components/onboarding/onboarding-modal.tsx` (new)

```tsx
'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Logomark } from '@/components/ui/logomark'
import { OnboardingFlow } from './onboarding-flow'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingModal({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: OnboardingProfile | null
}) {
  const [step, setStep] = useState(profile?.current_step ?? 1)

  // Re-sync to the freshly-fetched current_step every time the modal opens —
  // it may have been closed mid-flow, other things may have happened, and
  // this component's own `step` state must not go stale between opens.
  useEffect(() => {
    if (open && profile) setStep(profile.current_step)
  }, [open, profile])

  if (!profile || profile.completed_at) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-8 shadow-lifted focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="mb-6 flex items-center gap-2">
            <Logomark className="size-6 text-navy" />
            <Dialog.Title className="font-display text-base font-medium tracking-tight">Onomic</Dialog.Title>
          </div>
          <Dialog.Description className="sr-only">
            Um pequeno questionário para conhecer melhor os teus objetivos financeiros.
          </Dialog.Description>
          <OnboardingFlow
            profile={profile}
            step={step}
            onStepChange={setStep}
            onClose={() => onOpenChange(false)}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

`onEscapeKeyDown`/`onPointerDownOutside`/`onInteractOutside` all call `preventDefault()` — this is what makes the modal only closable via the in-flow buttons, per the confirmed design decision (no accidental dismiss).

### Step 5.4 — Auto-open detector (new)

**File:** `components/onboarding/onboarding-auto-open.tsx` (new)

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Detects `?onboarding=1` on mount, calls `onOpen()` once, then strips the
 * param via router.replace — same spirit as QueryErrorToast, but reading
 * the param via useSearchParams() instead of receiving it as a prop, since
 * this lives inside a layout (app/(dashboard)/layout.tsx), and Next.js
 * layouts don't receive a `searchParams` prop the way page.tsx files do.
 */
export function OnboardingAutoOpen({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get('onboarding') !== '1') return
    onOpen()

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('onboarding')
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onOpen is a
    // fresh closure every render from the parent's useState setter; the
    // intent is "run when the param appears", not "run when onOpen changes"
  }, [searchParams, pathname, router])

  return null
}
```

### Step 5.5 — Delete v1's page shell, turn the route into a redirect stub

**Delete:** `components/onboarding/onboarding-shell.tsx` — replaced by `onboarding-modal.tsx`'s own chrome.

**File:** `app/onboarding/page.tsx` (existing — full rewrite)

```tsx
import { redirect } from 'next/navigation'

// The dedicated onboarding page from v1 is gone — onboarding is a modal
// over /dashboard now (see components/onboarding/onboarding-modal.tsx).
// This route stays only so an old bookmarked/shared /onboarding link still
// does something sensible: re-trigger the auto-open on the dashboard.
export default function OnboardingPage() {
  redirect('/dashboard?onboarding=1')
}
```

**Verification:**
- `npx tsc --noEmit` — expect remaining errors only in `app/(dashboard)/layout.tsx`, `components/dashboard/dashboard-shell.tsx`, `components/dashboard/navbar.tsx`, `components/dashboard/onboarding-reminder.tsx` (Phase 6) and `app/(auth)/actions.ts` (Phase 7).
- Confirm `components/onboarding/onboarding-shell.tsx` no longer exists.

---

## Phase 6 — Dashboard shell, navbar, and reminder integration

**Goal:** the modal is actually mounted and controllable from the dashboard shell; the navbar badge opens it instead of navigating; the auto-open detector is wired in with its required `<Suspense>` boundary.

### Step 6.1 — Layout passes the full profile down, not just a boolean

**File:** `app/(dashboard)/layout.tsx` (existing — edit in place)

The existing `onboardingProfile`/`showOnboardingReminder` computation (already correct, unchanged) stays exactly as-is:

```ts
const onboardingProfile = await getOnboardingProfile(supabase, user.id)
const showOnboardingReminder = Boolean(onboardingProfile && !onboardingProfile.completed_at)
```

Change the `<DashboardShell>` call to pass `onboardingProfile` itself (the full row, needed by the modal to render step content), in addition to the existing `showOnboardingReminder` boolean (still needed by the navbar to decide whether to render the badge at all — cheaper than passing the whole object down to `Navbar` too):

```tsx
  return (
    <DashboardShell
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      profile={{
        fullName: profileRow?.full_name ?? null,
        handle: profileRow?.handle ?? null,
        avatarUrl,
      }}
      initialCollapsed={initialCollapsed}
      showOnboardingReminder={showOnboardingReminder}
      onboardingProfile={onboardingProfile}
    >
      {children}
    </DashboardShell>
  )
```

### Step 6.2 — Dashboard shell owns the modal's open state

**File:** `components/dashboard/dashboard-shell.tsx` (existing — full rewrite)

```tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import type { OnboardingProfile } from '@/lib/onboarding/queries'
import { SIDEBAR_COLLAPSED_COOKIE } from '@/lib/dashboard/sidebar-preference'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { OnboardingAutoOpen } from '@/components/onboarding/onboarding-auto-open'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

export function DashboardShell({
  children,
  workspaces,
  activeWorkspaceId,
  profile,
  initialCollapsed,
  showOnboardingReminder,
  onboardingProfile,
}: {
  children: React.ReactNode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  initialCollapsed: boolean
  showOnboardingReminder: boolean
  onboardingProfile: OnboardingProfile | null
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const router = useRouter()

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      // Non-httpOnly on purpose — this is a UI preference, not sensitive,
      // and needs to be writable from the client for an instant toggle
      // (no round-trip through a server action).
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; SameSite=Lax`
      return next
    })
  }

  function closeOnboarding(open: boolean) {
    setOnboardingOpen(open)
    if (!open) {
      // Refreshes this render's server data (showOnboardingReminder in
      // particular) without a full navigation — the modal never routes
      // anywhere in v2, so this is the only way the badge's visibility
      // catches up with a just-completed onboarding in the same session.
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Suspense fallback={null}>
        <OnboardingAutoOpen onOpen={() => setOnboardingOpen(true)} />
      </Suspense>
      <OnboardingModal open={onboardingOpen} onOpenChange={closeOnboarding} profile={onboardingProfile} />
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          profile={profile}
          showOnboardingReminder={showOnboardingReminder}
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

### Step 6.3 — Navbar threads the open-handler through instead of a link

**File:** `components/dashboard/navbar.tsx` (existing — edit in place)

Add `onOpenOnboarding: () => void` to the props type and pass it to `OnboardingReminder`:

```tsx
export function Navbar({
  workspaces,
  activeWorkspaceId,
  profile,
  showOnboardingReminder,
  onOpenOnboarding,
  onOpenMobileSidebar,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  showOnboardingReminder: boolean
  onOpenOnboarding: () => void
  onOpenMobileSidebar: () => void
}) {
```

And in the trailing group:

```tsx
        {showOnboardingReminder && <OnboardingReminder onClick={onOpenOnboarding} />}
```

(Every other line in the file is unchanged.)

### Step 6.4 — Reminder becomes a button, not a link

**File:** `components/dashboard/onboarding-reminder.tsx` (existing — full rewrite)

```tsx
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OnboardingReminder({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <Badge variant="violet" className="cursor-pointer transition-opacity hover:opacity-80">
        <Sparkles className="size-3.5" aria-hidden />
        Completar perfil
      </Badge>
    </button>
  )
}
```

**Verification:**
- `npx tsc --noEmit` — expect remaining errors only in `app/(auth)/actions.ts` (Phase 7).
- Manual: log in, land on `/dashboard`, confirm no modal (no `?onboarding=1` yet at this point in the plan since Phase 7 hasn't shipped) — full end-to-end click-through is Phase 7's verification once the trigger exists.

---

## Phase 7 — Signup redirect

**Goal:** the one-time auto-open trigger, exactly once, right after signup.

### Step 7.1 — Change `signUp`'s success redirect

**File:** `app/(auth)/actions.ts` (existing — edit in place)

Change the last line of `signUp` from:
```ts
  redirect('/onboarding')
```
to:
```ts
  redirect('/dashboard?onboarding=1')
```

**Do not** change `signIn` — unchanged from v1, still falls back to plain `/dashboard`.

**Verification (full end-to-end pass, now that every phase is wired):**
- `npx tsc --noEmit` fully clean.
- `npm run lint` — no new errors/warnings.
- `npx vitest run tests/unit/onboarding-risk-scoring.test.ts` passes.
- Manual/Playwright click-through:
  1. Sign up a fresh account → land on `/dashboard` with the modal already open at step 1 (objetivo).
  2. Confirm the URL has no `?onboarding=1` after the first render (stripped).
  3. Confirm Escape, clicking the backdrop, and any implicit close attempt do nothing — the modal stays open.
  4. Answer steps 1–4; on the loss-reaction step's "Seguinte", confirm (via a DB check) that `risk_profile` gets set alongside `loss_reaction`.
  5. Continue to step 8; confirm the summary shows every answered field, including the computed risk profile label (not a raw enum value).
  6. Click "Voltar" from step 8 a couple of times, then click "Completar mais tarde" on an earlier step — confirm the modal closes, `current_step` in the database matches wherever you actually left off (not step 8).
  7. Reload `/dashboard` — confirm the navbar shows "Completar perfil".
  8. Click the badge — confirm the modal reopens at the correct `current_step`.
  9. Finish the flow, click "Concluir" — confirm the modal closes and the badge disappears **without a page reload** (this is what `router.refresh()` in Phase 6 is for).
  10. Navigate to `/onboarding` directly — confirm it redirects to `/dashboard?onboarding=1` and the modal reopens (harmless even though `completed_at` is now set — `OnboardingModal` itself returns `null` in that case, so nothing actually shows; confirm this specifically).

---

## Phase Summary

| Phase | Builds | Status |
|---|---|---|
| 1 | Migration edit: 4 new columns, drop `skipped_at`, `current_step` range 1–8 | ⬜ Not started |
| 2 | Hand-authored types match | ⬜ Not started |
| 3 | Risk scoring (tested) + step data + rewritten Server Actions | ⬜ Not started |
| 4 | 8 step components (4 new, 3 edited, 1 deleted) | ⬜ Not started |
| 5 | Radix Dialog modal, flow controller, auto-open detector, route stub | ⬜ Not started |
| 6 | Dashboard shell/navbar/reminder integration | ⬜ Not started |
| 7 | Signup redirect | ⬜ Not started |

**MVP boundary:** Phases 1–7 must ship together.

---

## Environment Variables Required

None.

---

## Open Questions

1. **Migration numbering vs. Manual Transactions** (unchanged from v1) — whichever of Onboarding or Manual Transactions is implemented first still claims migration `005`.
2. **`router.refresh()` cost:** refreshing on every modal close (not just on `completeOnboarding`) re-runs the whole `(dashboard)` layout's data fetches (workspaces, profile, onboarding profile, avatar URL). This is cheap today (a handful of small queries) but worth watching if the layout's data-fetching grows heavier later — could be narrowed to only refresh after `completeOnboarding` specifically, at the cost of a slightly more complex close-handler.
3. **`OnboardingAutoOpen`'s exhaustive-deps suppression:** the effect deliberately excludes `onOpen` from its dependency array (see the code comment) to avoid re-firing on every parent re-render. If this pattern feels fragile during implementation, an alternative is wrapping the parent's `setOnboardingOpen` in a `useCallback`, removing the need for the suppression — left as an implementation-time judgment call.
4. **Radix Dialog animation:** this plan specifies no enter/exit transition for the modal (opens/closes instantly), matching the "no tailwindcss-animate installed" constraint already established in the dashboard-shell work. Worth a follow-up polish pass with plain CSS transitions keyed off Radix's `data-state` attribute, same spirit as the dropdown-menu primitive, if the instant open/close reads as too abrupt once built.
