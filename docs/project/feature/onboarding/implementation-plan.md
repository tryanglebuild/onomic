# Implementation Plan — Onboarding

**Feature spec:** docs/project/feature/onboarding/feature-spec.md
**Status:** Planned
**Created:** 2026-09-10
**Last updated:** 2026-09-10
**Author:** Leandro Oliveira

---

## Overview

6 phases, backend first (schema → RLS → types), then the actions/queries layer, then UI, then the two integration points (signup redirect, navbar indicator). Phases must be completed in order — each depends on the one before it (the UI needs the actions, the actions need the schema, the integration points need the route to exist).

**MVP boundary:** all 6 phases ship together — this is a small feature, there is no meaningful intermediate cut-off.

---

## Technical Context

- **Stack:** Next.js App Router, Server Actions (no new `app/api/*` route — matches the established pattern in `app/(auth)/actions.ts`, `app/(dashboard)/settings/family/actions.ts`), Supabase (Postgres + RLS), Tailwind v4 with the existing design tokens in `app/globals.css`.
- **Auth/RLS model:** identical shape to `profiles` — a dedicated table, RLS scoped to `id = auth.uid()`, no client-facing insert/delete policy (row lifecycle owned entirely by the signup trigger + `on delete cascade`).
- **Naming conventions:** table `onboarding_profiles`; migration file continues the project's sequential numbering — this is migration `005` (see `docs/project/BACKEND_ROADMAP.md` §2, the sequence does not reset per feature).
- **No new environment variables.**
- **No third-party services.**
- **Primary files to read before starting:**
  - `supabase/migrations/20260907190000_004_user_identity_handle_avatar.sql` — the current, exact version of `handle_new_user_profile()`, which this plan extends via `create or replace`.
  - `lib/supabase/database.types.ts` — hand-authored types file this plan adds an entry to (same placeholder convention noted at its top).
  - `app/(auth)/actions.ts` — `signUp`'s current success redirect, the one line this plan changes.
  - `components/dashboard/navbar.tsx` — where the reminder indicator is added.
  - `components/auth/auth-shell.tsx` — closest existing precedent for a focused, minimal-chrome full-screen flow (read for spirit, not reused directly — the split-screen marketing panel doesn't fit a stepper).
  - `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx` — reused as-is, no new UI primitives.
  - `lib/dashboard/nav-config.ts` — the existing pattern this plan mirrors for a small "data + pure helper" module (`lib/onboarding/steps.ts`).

---

## Phase 1 — Database: schema, RLS, trigger extension

**Goal:** `onboarding_profiles` exists, RLS-scoped to its owner, auto-created on signup.

### Step 1.1 — Migration file

**File:** `supabase/migrations/20260910120000_005_onboarding_profiles.sql` (new)

```sql
-- Onboarding: a short, skippable, resumable profile-signal flow shown once
-- after signup. See docs/project/feature/onboarding/feature-spec.md.
--
-- All columns are typed with CHECK constraints, not a jsonb blob — kept
-- consistent with the rest of the schema, where jsonb is reserved for
-- genuinely opaque data (transactions.metadata), not structured answers.

create table onboarding_profiles (
  id                          uuid primary key references auth.users(id) on delete cascade,
  primary_goals               text[] not null default '{}',
  risk_profile                text,
  investment_target_amount    numeric(12,2),
  investment_target_frequency text,
  asset_preferences           text[] not null default '{}',
  current_step                smallint not null default 1,
  completed_at                timestamptz,
  skipped_at                  timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint onboarding_profiles_current_step_range
    check (current_step between 1 and 5),
  constraint onboarding_profiles_risk_profile_valid
    check (risk_profile is null or risk_profile in ('conservative', 'moderate', 'aggressive')),
  constraint onboarding_profiles_frequency_valid
    check (investment_target_frequency is null or investment_target_frequency in ('monthly', 'quarterly')),
  constraint onboarding_profiles_primary_goals_valid
    check (primary_goals <@ array['budgeting', 'saving', 'investing', 'family']::text[]),
  constraint onboarding_profiles_asset_preferences_valid
    check (asset_preferences <@ array['crypto', 'stocks', 'etfs', 'undecided']::text[])
);

alter table onboarding_profiles enable row level security;

-- Read/update own row only. No insert/delete policy for any client role —
-- the row is created solely by the signup trigger below (SECURITY DEFINER)
-- and removed solely via the auth.users cascade. RLS defaults to deny for
-- any operation with no matching policy, so this is enough on its own —
-- no REVOKE/GRANT dance is needed here (unlike profiles.role, there is no
-- column on this table that must stay server-only).
create policy onboarding_profiles_select_own on onboarding_profiles
for select using (id = auth.uid());

create policy onboarding_profiles_update_own on onboarding_profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function set_onboarding_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_onboarding_profiles_updated_at
before update on onboarding_profiles
for each row execute function set_onboarding_profiles_updated_at();

-- Extend the existing signup trigger (re-created here verbatim plus the one
-- new insert) — same function, same trigger binding already in place from
-- migration 004, nothing to re-bind.
create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, birth_date, handle)
  values (
    new.id,
    'user',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'handle'
  );

  insert into onboarding_profiles (id) values (new.id);

  return new;
end;
$$ language plpgsql security definer set search_path = public;
```

**Verification:**
- Apply the migration (via the SQL Editor against the linked project, same manual-apply process used for migrations 001–004 — see `docs/project/BACKEND_ROADMAP.md` §2).
- Sign up a fresh test user; confirm a matching `onboarding_profiles` row was created with `current_step = 1`, both arrays `'{}'`, both timestamps null.
- As that user (anon/authenticated client, not service role), confirm `select * from onboarding_profiles` returns exactly their own row, never another user's.
- Confirm `insert into onboarding_profiles (id) values ('<any-uuid>')` as the authenticated client fails (no insert policy) — the row must only ever come from the trigger.
- Confirm `update onboarding_profiles set risk_profile = 'not-a-real-value' where id = auth.uid()` fails the CHECK constraint.

---

## Phase 2 — Hand-authored types

**Goal:** `onboarding_profiles` is typed in the same placeholder file the rest of the schema uses, so the rest of this plan type-checks.

### Step 2.1 — Add the table entry

**File:** `lib/supabase/database.types.ts` (existing)

Add to the `Tables` object, alongside `profiles`:

```ts
      onboarding_profiles: {
        Row: {
          id: string
          primary_goals: ('budgeting' | 'saving' | 'investing' | 'family')[]
          risk_profile: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount: number | null
          investment_target_frequency: 'monthly' | 'quarterly' | null
          asset_preferences: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step: number
          completed_at: string | null
          skipped_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          primary_goals?: ('budgeting' | 'saving' | 'investing' | 'family')[]
          risk_profile?: 'conservative' | 'moderate' | 'aggressive' | null
          investment_target_amount?: number | null
          investment_target_frequency?: 'monthly' | 'quarterly' | null
          asset_preferences?: ('crypto' | 'stocks' | 'etfs' | 'undecided')[]
          current_step?: number
          completed_at?: string | null
          skipped_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['onboarding_profiles']['Insert']>
        Relationships: []
      },
```

These literal unions are kept in sync by hand with `PrimaryGoal`/`RiskProfile`/`InvestmentFrequency`/`AssetPreference` in `lib/onboarding/steps.ts` (Phase 3.1) — same duplication-by-convention already used elsewhere in this file (e.g. `workspace_members.role`'s `'owner' | 'member'` appears both here and in `lib/workspaces/queries.ts`'s `WorkspaceSummary` type). Typing these as the real unions (not a loose `string[]`) is what lets `OnboardingFlow` (Step 4.6) pass `profile.primary_goals`/`profile.asset_preferences` straight into `GoalsStep`/`AssetPreferencesStep` without a cast.

**Verification:** `npx tsc --noEmit` clean (nothing references it yet, but the shape must compile standalone).

---

## Phase 3 — Shared step data + queries + Server Actions

**Goal:** the pure data/logic layer — no UI yet.

### Step 3.1 — Step content module

**File:** `lib/onboarding/steps.ts` (new)

Mirrors the existing `lib/dashboard/nav-config.ts` pattern: pure data + pure helpers, no React.

```ts
import type { LucideIcon } from 'lucide-react'
import { Compass, ShieldCheck, TrendingUp, Layers, CheckCircle2 } from 'lucide-react'

export type PrimaryGoal = 'budgeting' | 'saving' | 'investing' | 'family'
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type InvestmentFrequency = 'monthly' | 'quarterly'
export type AssetPreference = 'crypto' | 'stocks' | 'etfs' | 'undecided'

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'budgeting', label: 'Controlar gastos e orçamento' },
  { value: 'saving', label: 'Poupar para um objetivo' },
  { value: 'investing', label: 'Investir e fazer crescer o património' },
  { value: 'family', label: 'Gerir finanças em família' },
]

export const RISK_PROFILE_OPTIONS: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservador', description: 'Prefiro segurança, mesmo com retornos mais baixos.' },
  { value: 'moderate', label: 'Moderado', description: 'Aceito algum risco por um retorno melhor.' },
  { value: 'aggressive', label: 'Arrojado', description: 'Procuro o maior retorno possível, aceito mais volatilidade.' },
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
  { step: 2, title: 'Perfil de risco', icon: ShieldCheck },
  { step: 3, title: 'Meta de investimento', icon: TrendingUp },
  { step: 4, title: 'Preferência de ativos', icon: Layers },
  { step: 5, title: 'Resumo', icon: CheckCircle2 },
]

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length
```

### Step 3.2 — Query helper

**File:** `lib/onboarding/queries.ts` (new)

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'

export type OnboardingProfile = Database['public']['Tables']['onboarding_profiles']['Row']

// Memoized per request — same rationale as getUserWorkspaces in
// lib/workspaces/queries.ts: the dashboard layout and /onboarding itself
// can both need this within one request.
export const getOnboardingProfile = cache(async function getOnboardingProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OnboardingProfile | null> {
  const { data, error } = await supabase
    .from('onboarding_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
})
```

### Step 3.3 — Server Actions

**File:** `app/onboarding/actions.ts` (new)

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type PrimaryGoal,
  type RiskProfile,
  type InvestmentFrequency,
  type AssetPreference,
  TOTAL_ONBOARDING_STEPS,
} from '@/lib/onboarding/steps'

const VALID_GOALS: PrimaryGoal[] = ['budgeting', 'saving', 'investing', 'family']
const VALID_RISK_PROFILES: RiskProfile[] = ['conservative', 'moderate', 'aggressive']
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

  revalidatePath('/onboarding')
}

export async function saveRiskProfileStep(riskProfile: RiskProfile | null) {
  const { supabase, user } = await requireUser()
  const clean = riskProfile && VALID_RISK_PROFILES.includes(riskProfile) ? riskProfile : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ risk_profile: clean, current_step: 3 })
    .eq('id', user.id)
  if (error) throw error

  revalidatePath('/onboarding')
}

export async function saveInvestmentTargetStep(
  amount: number | null,
  frequency: InvestmentFrequency | null
) {
  const { supabase, user } = await requireUser()
  const cleanAmount = amount !== null && amount > 0 ? amount : null
  const cleanFrequency =
    cleanAmount !== null && frequency && VALID_FREQUENCIES.includes(frequency) ? frequency : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({
      investment_target_amount: cleanAmount,
      investment_target_frequency: cleanFrequency,
      current_step: 4,
    })
    .eq('id', user.id)
  if (error) throw error

  revalidatePath('/onboarding')
}

export async function saveAssetPreferencesStep(preferences: AssetPreference[]) {
  const { supabase, user } = await requireUser()
  const clean = preferences.filter((p) => VALID_ASSET_PREFERENCES.includes(p))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ asset_preferences: clean, current_step: TOTAL_ONBOARDING_STEPS })
    .eq('id', user.id)
  if (error) throw error

  revalidatePath('/onboarding')
}

export async function completeOnboarding() {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error

  redirect('/dashboard')
}

export async function skipOnboarding() {
  const { supabase, user } = await requireUser()

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ skipped_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) throw error

  redirect('/dashboard')
}

export async function goToOnboardingStep(step: number) {
  const { supabase, user } = await requireUser()
  const clamped = Math.max(1, Math.min(step, TOTAL_ONBOARDING_STEPS))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ current_step: clamped })
    .eq('id', user.id)
  if (error) throw error

  revalidatePath('/onboarding')
}
```

`goToOnboardingStep` backs the "Voltar" button inside the flow (stepping back to review/change an earlier answer) — the summary step and every other step's back-navigation both call it.

**Verification:**
- `npx tsc --noEmit` clean.
- Each action re-derives `user` from `auth.getUser()` — never trusts a client-supplied id (matches `switchWorkspace`/`signOut`'s existing pattern).
- Manually call `saveRiskProfileStep('not-a-real-value' as RiskProfile)` from a scratch script or the browser console after signing in — confirm it's coerced to `null` (the server-side allowlist), not passed through to a CHECK-constraint error.

---

## Phase 4 — `/onboarding` route and UI

**Goal:** a working, navigable 5-step flow at `/onboarding`, resumable, with its own minimal shell.

### Step 4.1 — Page (server component, guard + data fetch)

**File:** `app/onboarding/page.tsx` (new)

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOnboardingProfile } from '@/lib/onboarding/queries'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getOnboardingProfile(supabase, user.id)

  if (!profile || profile.completed_at) {
    redirect('/dashboard')
  }

  return (
    <OnboardingShell>
      <OnboardingFlow profile={profile} />
    </OnboardingShell>
  )
}
```

`!profile` covers the defensive case where the signup trigger somehow didn't create a row (should never happen post-Phase-1, but this page must not crash if it does — same defensive posture as `workspaces.find(...)!` non-null assertions elsewhere in the codebase, just applied as a redirect instead of a crash since there's a safe fallback route).

### Step 4.2 — Shell (minimal chrome, mirrors the spirit of `auth-shell.tsx`)

**File:** `components/onboarding/onboarding-shell.tsx` (new)

```tsx
import Link from 'next/link'
import { Logomark } from '@/components/ui/logomark'

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logomark className="size-7 text-navy" />
          <span className="font-display text-lg font-medium tracking-tight">Onomic</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  )
}
```

### Step 4.3 — Step indicator

**File:** `components/onboarding/step-indicator.tsx` (new)

```tsx
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding/steps'
import { cn } from '@/lib/utils'

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {ONBOARDING_STEPS.map(({ step }) => (
        <span
          key={step}
          aria-current={step === currentStep ? 'step' : undefined}
          className={cn(
            'h-1.5 rounded-full transition-all',
            step === currentStep
              ? 'w-8 bg-primary'
              : step < currentStep
                ? 'w-1.5 bg-primary-strong'
                : 'w-1.5 bg-border-strong'
          )}
        />
      ))}
      <span className="sr-only">
        Passo {currentStep} de {TOTAL_ONBOARDING_STEPS}
      </span>
    </div>
  )
}
```

### Step 4.4 — Shared selectable-option row

**File:** `components/onboarding/option-button.tsx` (new)

Reused by steps 1, 2, and 4 (multi-select and single-select both use the same row visual — only the selection semantics differ, decided by the caller).

```tsx
'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary-soft text-primary-ink'
          : 'border-border bg-surface text-ink hover:bg-surface-sunken'
      )}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />}
    </button>
  )
}
```

### Step 4.5 — The 5 step components

Every step calls its own Server Action from Phase 3 **and** its `onAdvance`/`onBack` prop in the same click handler — the action persists to the database, the prop updates the flow controller's local `step` state immediately (see Step 4.6). `isPending` (from `useTransition`) disables the primary button while the action is in flight, matching the pattern already used by `components/dashboard/workspace-menu.tsx`.

**File:** `components/onboarding/steps/goals-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { PRIMARY_GOAL_OPTIONS, type PrimaryGoal } from '@/lib/onboarding/steps'
import { saveGoalsStep, skipOnboarding } from '@/app/onboarding/actions'

export function GoalsStep({
  initialGoals,
  onAdvance,
}: {
  initialGoals: PrimaryGoal[]
  onAdvance: () => void
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
        <button
          type="button"
          onClick={() => startTransition(() => skipOnboarding())}
          className="text-sm text-muted hover:text-ink"
        >
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

**File:** `components/onboarding/steps/risk-profile-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { RISK_PROFILE_OPTIONS, type RiskProfile } from '@/lib/onboarding/steps'
import { saveRiskProfileStep, skipOnboarding } from '@/app/onboarding/actions'

export function RiskProfileStep({
  initialRiskProfile,
  onAdvance,
  onBack,
}: {
  initialRiskProfile: RiskProfile | null
  onAdvance: () => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<RiskProfile | null>(initialRiskProfile)
  const [isPending, startTransition] = useTransition()

  // Clicking the already-selected option clears it back to null — the
  // field is nullable and "not sure yet" is a deliberately valid answer,
  // same as every other step. No separate "não sei" pill for this one;
  // toggle-to-clear is the whole affordance.
  function toggle(value: RiskProfile) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Como te descreves como investidor?</h1>
          <p className="mt-1 text-sm text-muted">
            Não tens de saber ao certo — clica outra vez numa opção para a desmarcar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {RISK_PROFILE_OPTIONS.map((option) => (
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
          <button
            type="button"
            onClick={() => startTransition(() => skipOnboarding())}
            className="text-sm text-muted hover:text-ink"
          >
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveRiskProfileStep(selected)
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

**File:** `components/onboarding/steps/investment-target-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionButton } from '../option-button'
import { INVESTMENT_FREQUENCY_OPTIONS, type InvestmentFrequency } from '@/lib/onboarding/steps'
import { saveInvestmentTargetStep, skipOnboarding } from '@/app/onboarding/actions'

export function InvestmentTargetStep({
  initialAmount,
  initialFrequency,
  onAdvance,
  onBack,
}: {
  initialAmount: number | null
  initialFrequency: InvestmentFrequency | null
  onAdvance: () => void
  onBack: () => void
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
          onChange={(e) => setAmount(e.target.value)}
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
          <button
            type="button"
            onClick={() => startTransition(() => skipOnboarding())}
            className="text-sm text-muted hover:text-ink"
          >
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

**File:** `components/onboarding/steps/asset-preferences-step.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { ASSET_PREFERENCE_OPTIONS, type AssetPreference } from '@/lib/onboarding/steps'
import { saveAssetPreferencesStep, skipOnboarding } from '@/app/onboarding/actions'

export function AssetPreferencesStep({
  initialPreferences,
  onAdvance,
  onBack,
}: {
  initialPreferences: AssetPreference[]
  onAdvance: () => void
  onBack: () => void
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
          <button
            type="button"
            onClick={() => startTransition(() => skipOnboarding())}
            className="text-sm text-muted hover:text-ink"
          >
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

**File:** `components/onboarding/steps/summary-step.tsx` (new)

```tsx
'use client'

import { useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PRIMARY_GOAL_OPTIONS,
  RISK_PROFILE_OPTIONS,
  ASSET_PREFERENCE_OPTIONS,
} from '@/lib/onboarding/steps'
import { completeOnboarding } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

function labelsFor(values: string[], options: { value: string; label: string }[]): string {
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label)
  return labels.length > 0 ? labels.join(', ') : 'Não respondido'
}

export function SummaryStep({ profile, onBack }: { profile: OnboardingProfile; onBack: () => void }) {
  const [isPending, startTransition] = useTransition()

  const riskLabel =
    RISK_PROFILE_OPTIONS.find((o) => o.value === profile.risk_profile)?.label ?? 'Não respondido'
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
          <dt className="text-muted">Perfil de risco</dt>
          <dd className="text-right font-medium">{riskLabel}</dd>
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
        <Button disabled={isPending} onClick={() => startTransition(() => completeOnboarding())}>
          Concluir
        </Button>
      </div>
    </div>
  )
}
```

### Step 4.6 — The flow controller

**File:** `components/onboarding/onboarding-flow.tsx` (new)

```tsx
'use client'

import { useState } from 'react'
import { StepIndicator } from './step-indicator'
import { GoalsStep } from './steps/goals-step'
import { RiskProfileStep } from './steps/risk-profile-step'
import { InvestmentTargetStep } from './steps/investment-target-step'
import { AssetPreferencesStep } from './steps/asset-preferences-step'
import { SummaryStep } from './steps/summary-step'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingFlow({ profile }: { profile: OnboardingProfile }) {
  // Local override so clicking "Voltar"/advancing feels instant — the
  // Server Action is still the source of truth for `current_step` on the
  // next full page load (e.g. after a refresh), this just avoids a round
  // trip's worth of visible lag on every step transition.
  const [step, setStep] = useState(profile.current_step)

  return (
    <div>
      <StepIndicator currentStep={step} />
      {step === 1 && <GoalsStep initialGoals={profile.primary_goals} onAdvance={() => setStep(2)} />}
      {step === 2 && (
        <RiskProfileStep initialRiskProfile={profile.risk_profile} onAdvance={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && (
        <InvestmentTargetStep
          initialAmount={profile.investment_target_amount}
          initialFrequency={profile.investment_target_frequency}
          onAdvance={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <AssetPreferencesStep
          initialPreferences={profile.asset_preferences}
          onAdvance={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}
      {step === 5 && <SummaryStep profile={profile} onBack={() => setStep(4)} />}
    </div>
  )
}
```

The local `step` state (instant view change) plus each Server Action (persists to the database) together are the one deliberate elaboration on the brainstorming design's "single Server Action per Seguinte click" phrasing — same shape, just explicit that the client also advances its own view immediately rather than waiting on `revalidatePath` to trigger a re-render with a new `profile.current_step`.

**Verification:**
- `npx tsc --noEmit` clean.
- Manual click-through: `/onboarding` → answer step 1 → confirm `onboarding_profiles.current_step` becomes 2 in the database → refresh the page → confirm it resumes at step 2 with step 1's answer still visible if you go back.
- Click "Completar mais tarde" on any step → confirm redirect to `/dashboard` and `skipped_at` is set.
- Complete all 5 steps → confirm redirect to `/dashboard` and `completed_at` is set.
- Navigate to `/onboarding` directly after completion → confirm immediate redirect to `/dashboard`.

---

## Phase 5 — Signup redirect

**Goal:** the one-time forced redirect, exactly once, right after signup.

### Step 5.1 — Change `signUp`'s success redirect

**File:** `app/(auth)/actions.ts` (existing)

Change:
```ts
  redirect('/dashboard')
```
(the last line of `signUp`, unchanged everywhere else in the function) to:
```ts
  redirect('/onboarding')
```

**Do not** change `signIn`'s redirect logic (`returnTo`/`safeRedirectPath` fallback of `/dashboard`) — per the spec's confirmed decision, the forced redirect only ever happens from `signUp`, never from `signIn` or the dashboard layout guard.

**Verification:**
- Sign up a fresh account → confirm landing on `/onboarding`, not `/dashboard`.
- Sign out, sign back in with that same (still-incomplete) account → confirm landing on `/dashboard`, not `/onboarding` — this is the behavior that proves the "only once" decision actually holds.

---

## Phase 6 — Navbar reminder

**Goal:** a quiet, dismissable-by-completing "Completar perfil" indicator in the dashboard navbar, visible only once skipped and not yet completed.

### Step 6.1 — Fetch onboarding status in the dashboard layout

**File:** `app/(dashboard)/layout.tsx` (existing)

Add, alongside the existing `profileRow` fetch:

```ts
import { getOnboardingProfile } from '@/lib/onboarding/queries'
```

```ts
const onboardingProfile = await getOnboardingProfile(supabase, user.id)
// Shows whenever onboarding isn't finished, not just after an explicit
// skip — a user who just closes the tab without clicking anything must
// still have a way back in (confirmed product decision — see
// feature-spec.md's Confirmed Design Decisions).
const showOnboardingReminder = Boolean(onboardingProfile && !onboardingProfile.completed_at)
```

Pass `showOnboardingReminder` as a new prop to `<DashboardShell>`, threaded down to `<Navbar>` exactly like `workspaces`/`activeWorkspaceId`/`profile` already are (`DashboardShell` → `Navbar`, both files gain one more passed-through prop, no new state).

### Step 6.2 — Reminder component

**File:** `components/dashboard/onboarding-reminder.tsx` (new)

```tsx
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OnboardingReminder() {
  return (
    <Link href="/onboarding">
      <Badge variant="violet" className="cursor-pointer transition-opacity hover:opacity-80">
        <Sparkles className="size-3.5" aria-hidden />
        Completar perfil
      </Badge>
    </Link>
  )
}
```

### Step 6.3 — Wire it into the navbar

**File:** `components/dashboard/navbar.tsx` (existing)

Add `showOnboardingReminder: boolean` to the props type, and render it in the trailing `flex items-center gap-3` group, before `WorkspaceMenu`:

```tsx
{showOnboardingReminder && <OnboardingReminder />}
<WorkspaceMenu workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
```

(Placed before the workspace pill, not after the bell — it's the most "first-class" item in that trailing group short of the user's own avatar, matching how central completing the profile is meant to feel without being loud about it.)

**Verification:**
- Sign up → confirm "Completar perfil" already appears in the navbar the moment you're redirected back to `/dashboard` from anywhere (e.g. by directly navigating there) before finishing onboarding — `completed_at` is unset regardless of whether you ever clicked "Completar mais tarde".
- Skip onboarding at step 1 → confirm the badge is still there.
- Click it → confirm it lands back on `/onboarding` at the step you left off (step 2, since step 1 was already saved before skipping).
- Complete the flow from there → confirm the badge disappears from the navbar on the next render.
- Sign up, complete onboarding fully without ever skipping → confirm the badge never appeared at any point before `completed_at` was set, and stays gone after.

---

## Phase Summary

| Phase | Builds | Status |
|---|---|---|
| 1 | Database: `onboarding_profiles`, RLS, trigger extension | ⬜ Not started |
| 2 | Hand-authored types | ⬜ Not started |
| 3 | Step data, query helper, Server Actions | ⬜ Not started |
| 4 | `/onboarding` route, shell, stepper, 5 step components | ⬜ Not started |
| 5 | `signUp` redirect change | ⬜ Not started |
| 6 | Navbar reminder | ⬜ Not started |

**MVP boundary:** Phases 1–6 must ship together — this is a small feature, there is no meaningful intermediate cut-off.

---

## Environment Variables Required

None.

---

## Open Questions

1. **Migration numbering conflict with Manual Transactions:** `docs/project/BACKEND_ROADMAP.md` §7 recommends Manual Transactions as the next feature to build (also destined to claim migration `005`). Whichever of Onboarding or Manual Transactions is actually implemented first claims `005`; the other becomes `006`. This plan names its migration `20260910120000_005_onboarding_profiles.sql` provisionally — rename if Manual Transactions lands first.
2. **`OptionButton`'s single-select "deselect to clear" behavior (risk profile step):** confirmed as the intended UX in this plan (clicking the already-selected option clears it back to `null`, since the field is nullable and "not sure yet" is valid) — but there's no explicit "ainda não sei" pill unlike steps 1/4/investment-target. Worth a design pass during implementation: does the risk-profile step need its own visible neutral option instead of relying on toggle-to-clear being discoverable?
3. **Test coverage:** this codebase has no component-rendering test infrastructure (no jsdom/RTL — confirmed in the dashboard-shell plan's own research). Verification here is manual click-through + `tsc`, consistent with how the dashboard shell was verified. `lib/onboarding/steps.ts`'s pure data could get a light `tests/unit/onboarding-steps.test.ts` if any actual logic (not just data) ends up there — as scoped in this plan, it's pure data plus one constant, likely not worth a dedicated test.
