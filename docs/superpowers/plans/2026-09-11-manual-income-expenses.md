# Rendimento e Gastos Recorrentes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users manually configure recurring income sources and recurring fixed expenses (any cadence from daily to annual), with a real `/budget` page showing an estimated monthly income/expenses/balance summary — with zero dependency on bank-account connection.

**Architecture:** Two Postgres tables (`income_sources`, `recurring_expenses`), each `workspace_id`-scoped with the existing `is_workspace_member` RLS pattern, plus two global lookup tables (`income_source_types`, `expense_categories`) that give every category/type a stable `id` for future filtering. A pure cadence-normalization function turns any cadence into a monthly-equivalent for the summary. The `/budget` stub is replaced with tabs (Rendimento / Gastos Fixos), each backed by a generic list + dialog-form UI, wired to server actions that follow the `refresh()`-after-mutation pattern already used in `app/onboarding/actions.ts`.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase (Postgres + RLS), `@radix-ui/react-dialog` (already installed), Tailwind v4 tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-manual-income-expenses-design.md`

## Global Constraints

- Every domain table (`income_sources`, `recurring_expenses`) carries `workspace_id uuid not null references workspaces(id) on delete cascade` and uses the existing `is_workspace_member(workspace_id)` / `is_workspace_owner(workspace_id)` RLS helper functions from `supabase/migrations/20260906120000_001_family_workspaces.sql` — no new tenancy pattern.
- Category/type fields are foreign keys to lookup tables with a stable `id` (`income_source_types`, `expense_categories`), never free text or a `text check (...)` enum — required so a future AI feature can filter by `category_id`/`source_type_id`.
- `cadence` is `text check (cadence in ('diaria','semanal','mensal','trimestral','semestral','anual'))` on both domain tables — exactly these six values, no others.
- No automatic generation of rows in any `transactions` table — this feature is planning/configuration only (that table does not exist yet and is out of scope).
- All UI copy is European Portuguese, matching the rest of the app (e.g. "Rendimento mensal estimado", not "Estimated monthly income").
- Every mutating server action calls `refresh()` from `next/cache` as its last statement on success (see `app/onboarding/actions.ts` for the established pattern) — not `revalidatePath`, which is reserved for cross-request/layout-level invalidation.
- `database.types.ts` is hand-authored in this repo (no generation script exists yet) — new tables must be added there by hand, following the exact `Row`/`Insert`/`Update`/`Relationships: []` shape already used for every other table.

---

### Task 1: Database migration and generated types

**Files:**
- Create: `supabase/migrations/20260911140000_007_income_expenses.sql`
- Modify: `lib/supabase/database.types.ts` (insert new table entries after the `reserved_handles` block, before the closing `}` of `Tables`)

**Interfaces:**
- Produces: tables `income_source_types(id, slug, label, sort_order)`, `expense_categories(id, slug, label, sort_order)`, `income_sources(id, workspace_id, source_type_id, name, amount, cadence, notes, active, created_at, updated_at)`, `recurring_expenses(id, workspace_id, category_id, name, amount, cadence, notes, active, created_at, updated_at)`.

- [ ] **Step 1: Write the migration**

```sql
-- Rendimento e Gastos Recorrentes (configuração manual) — ver
-- docs/superpowers/specs/2026-09-11-manual-income-expenses-design.md.
--
-- Duas tabelas de lookup globais dão um id estável a cada tipo/categoria,
-- para que filtragem futura (incluindo por uma IA) use category_id/
-- source_type_id em vez de comparar texto livre. As duas tabelas de
-- domínio seguem o único padrão de tenancy já usado no código:
-- workspace_id + is_workspace_member/is_workspace_owner.

create table income_source_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null
);

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null
);

insert into income_source_types (slug, label, sort_order) values
  ('salario', 'Salário', 1),
  ('freelance', 'Freelance', 2),
  ('arrendamento', 'Arrendamento', 3),
  ('investimento', 'Investimento', 4),
  ('pensao', 'Pensão', 5),
  ('outro', 'Outro', 6);

insert into expense_categories (slug, label, sort_order) values
  ('habitacao', 'Habitação', 1),
  ('alimentacao', 'Alimentação', 2),
  ('transporte', 'Transporte', 3),
  ('subscricoes', 'Subscrições', 4),
  ('saude', 'Saúde', 5),
  ('educacao', 'Educação', 6),
  ('lazer', 'Lazer', 7),
  ('seguros', 'Seguros', 8),
  ('dividas', 'Dívidas', 9),
  ('outros', 'Outros', 10);

create table income_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type_id uuid not null references income_source_types(id),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cadence text not null check (cadence in ('diaria','semanal','mensal','trimestral','semestral','anual')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_id uuid not null references expense_categories(id),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cadence text not null check (cadence in ('diaria','semanal','mensal','trimestral','semestral','anual')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table income_source_types enable row level security;
alter table expense_categories enable row level security;
alter table income_sources enable row level security;
alter table recurring_expenses enable row level security;

-- Explicit grants for these 4 new tables (RLS narrows further from here).
-- Not touching grants on any pre-existing table — out of scope for this
-- migration.
grant select on income_source_types to authenticated, service_role;
grant select on expense_categories to authenticated, service_role;
grant select, insert, update, delete on income_sources to authenticated, service_role;
grant select, insert, update, delete on recurring_expenses to authenticated, service_role;

create policy income_source_types_select on income_source_types
for select using (true);

create policy expense_categories_select on expense_categories
for select using (true);

create policy income_sources_select on income_sources
for select using (is_workspace_member(workspace_id));

create policy income_sources_insert on income_sources
for insert with check (is_workspace_member(workspace_id));

create policy income_sources_update on income_sources
for update using (is_workspace_member(workspace_id));

create policy income_sources_delete on income_sources
for delete using (is_workspace_member(workspace_id));

create policy recurring_expenses_select on recurring_expenses
for select using (is_workspace_member(workspace_id));

create policy recurring_expenses_insert on recurring_expenses
for insert with check (is_workspace_member(workspace_id));

create policy recurring_expenses_update on recurring_expenses
for update using (is_workspace_member(workspace_id));

create policy recurring_expenses_delete on recurring_expenses
for delete using (is_workspace_member(workspace_id));

create or replace function set_income_sources_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_income_sources_updated_at
before update on income_sources
for each row execute function set_income_sources_updated_at();

create or replace function set_recurring_expenses_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_recurring_expenses_updated_at
before update on recurring_expenses
for each row execute function set_recurring_expenses_updated_at();
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase migration up` (or the project's established local-apply command — check `supabase status` is running first). If no local Supabase stack is available in this environment, apply via the connected `mcp__supabase__apply_migration` tool instead, using the same file name and SQL body.

Expected: migration applies with no errors; `select slug, label from income_source_types order by sort_order;` returns the 6 seeded rows; same for `expense_categories` (10 rows).

- [ ] **Step 3: Add the new tables to `lib/supabase/database.types.ts`**

Insert this block immediately after the `reserved_handles` table entry (before the `}` that closes `Tables`):

```ts
      income_source_types: {
        Row: { id: string; slug: string; label: string; sort_order: number }
        Insert: { id?: string; slug: string; label: string; sort_order: number }
        Update: Partial<Database['public']['Tables']['income_source_types']['Insert']>
        Relationships: []
      }
      expense_categories: {
        Row: { id: string; slug: string; label: string; sort_order: number }
        Insert: { id?: string; slug: string; label: string; sort_order: number }
        Update: Partial<Database['public']['Tables']['expense_categories']['Insert']>
        Relationships: []
      }
      income_sources: {
        Row: {
          id: string
          workspace_id: string
          source_type_id: string
          name: string
          amount: number
          cadence: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          source_type_id: string
          name: string
          amount: number
          cadence: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['income_sources']['Insert']>
        Relationships: []
      }
      recurring_expenses: {
        Row: {
          id: string
          workspace_id: string
          category_id: string
          name: string
          amount: number
          cadence: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          category_id: string
          name: string
          amount: number
          cadence: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recurring_expenses']['Insert']>
        Relationships: []
      }
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260911140000_007_income_expenses.sql lib/supabase/database.types.ts
git commit -m "feat: add income_sources and recurring_expenses schema"
```

---

### Task 2: Cadence utility

**Files:**
- Create: `lib/finance/cadence.ts`
- Test: `tests/unit/finance-cadence.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export type Cadence = 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'`, `export const CADENCE_VALUES: Cadence[]`, `export const CADENCE_OPTIONS: { value: Cadence; label: string }[]`, `export function toMonthlyAmount(amount: number, cadence: Cadence): number`. Later tasks (queries, actions, UI) import all four from `@/lib/finance/cadence`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { toMonthlyAmount, CADENCE_VALUES, CADENCE_OPTIONS } from '@/lib/finance/cadence'

describe('toMonthlyAmount', () => {
  it('returns the same amount for mensal', () => {
    expect(toMonthlyAmount(100, 'mensal')).toBe(100)
  })

  it('multiplies a daily amount by ~30.44', () => {
    expect(toMonthlyAmount(10, 'diaria')).toBeCloseTo(304.4, 1)
  })

  it('multiplies a weekly amount by ~4.348', () => {
    expect(toMonthlyAmount(50, 'semanal')).toBeCloseTo(217.4, 1)
  })

  it('divides a quarterly amount by 3', () => {
    expect(toMonthlyAmount(300, 'trimestral')).toBeCloseTo(100, 5)
  })

  it('divides a semiannual amount by 6', () => {
    expect(toMonthlyAmount(600, 'semestral')).toBeCloseTo(100, 5)
  })

  it('divides an annual amount by 12', () => {
    expect(toMonthlyAmount(1200, 'anual')).toBeCloseTo(100, 5)
  })
})

describe('CADENCE_VALUES / CADENCE_OPTIONS', () => {
  it('has exactly 6 cadences, in the same order', () => {
    expect(CADENCE_VALUES).toEqual(['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'])
    expect(CADENCE_OPTIONS.map((o) => o.value)).toEqual(CADENCE_VALUES)
  })

  it('gives every cadence a non-empty Portuguese label', () => {
    for (const option of CADENCE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/finance-cadence.test.ts`
Expected: FAIL with "Cannot find module '@/lib/finance/cadence'" (or similar).

- [ ] **Step 3: Write the implementation**

```ts
export type Cadence = 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

export const CADENCE_VALUES: Cadence[] = ['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual']

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

const MONTHLY_FACTOR: Record<Cadence, number> = {
  diaria: 30.44,
  semanal: 4.348,
  mensal: 1,
  trimestral: 1 / 3,
  semestral: 1 / 6,
  anual: 1 / 12,
}

export function toMonthlyAmount(amount: number, cadence: Cadence): number {
  return amount * MONTHLY_FACTOR[cadence]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/finance-cadence.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/finance/cadence.ts tests/unit/finance-cadence.test.ts
git commit -m "feat: add cadence normalization utility for finance items"
```

---

### Task 3: Finance queries

**Files:**
- Create: `lib/finance/queries.ts`

**Interfaces:**
- Consumes: `Cadence` from `@/lib/finance/cadence` (Task 2); `Database` from `@/lib/supabase/database.types` (Task 1).
- Produces: `export type LookupOption = { id: string; slug: string; label: string }`, `export type IncomeSourceRow = Database['public']['Tables']['income_sources']['Row']`, `export type RecurringExpenseRow = Database['public']['Tables']['recurring_expenses']['Row']`, `export const getIncomeSourceTypes(supabase): Promise<LookupOption[]>`, `export const getExpenseCategories(supabase): Promise<LookupOption[]>`, `export const getIncomeSources(supabase, workspaceId: string): Promise<IncomeSourceRow[]>`, `export const getRecurringExpenses(supabase, workspaceId: string): Promise<RecurringExpenseRow[]>`. Task 7 (the page) calls all four; Task 6 (UI) consumes `LookupOption`, `IncomeSourceRow`, `RecurringExpenseRow`.

- [ ] **Step 1: Write the implementation**

No new business logic to unit-test here (thin Supabase reads) — this task is verified via the RLS integration test in Task 4, which exercises these exact queries end-to-end.

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'

export type LookupOption = { id: string; slug: string; label: string }
export type IncomeSourceRow = Database['public']['Tables']['income_sources']['Row']
export type RecurringExpenseRow = Database['public']['Tables']['recurring_expenses']['Row']

export const getIncomeSourceTypes = cache(async function getIncomeSourceTypes(
  supabase: SupabaseClient<Database>
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('income_source_types')
    .select('id, slug, label')
    .order('sort_order')
  if (error) throw error
  return data
})

export const getExpenseCategories = cache(async function getExpenseCategories(
  supabase: SupabaseClient<Database>
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, slug, label')
    .order('sort_order')
  if (error) throw error
  return data
})

export const getIncomeSources = cache(async function getIncomeSources(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<IncomeSourceRow[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) throw error
  return data
})

export const getRecurringExpenses = cache(async function getRecurringExpenses(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<RecurringExpenseRow[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) throw error
  return data
})
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/finance/queries.ts
git commit -m "feat: add finance queries for income sources and recurring expenses"
```

---

### Task 4: RLS integration test

**Files:**
- Test: `tests/integration/income-expenses.rls.test.ts`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `deleteTestUser`, `signInAsTestUser` from `../helpers/supabase-test-clients` (existing); the `income_sources`, `recurring_expenses`, `income_source_types`, `expense_categories` tables and `create_family_workspace` RPC from Task 1.

- [ ] **Step 1: Write the test**

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  signInAsTestUser,
} from '../helpers/supabase-test-clients'

const PASSWORD = 'Test1234!Test1234!'
const RUN_ID = Date.now()

let userA: { id: string; email: string; client: SupabaseClient }
let userB: { id: string; email: string; client: SupabaseClient }
let personalWorkspaceIdA: string
let salarioTypeId: string
let habitacaoCategoryId: string

async function setUpUser(label: string) {
  const email = `${label}-${RUN_ID}@onomic.test`
  const authUser = await createTestUser(email, PASSWORD)
  const client = await signInAsTestUser(email, PASSWORD)
  return { id: authUser!.id, email, client }
}

beforeAll(async () => {
  userA = await setUpUser('income-a')
  userB = await setUpUser('income-b')

  const { data: memberships } = await userA.client.from('workspace_members').select('workspace_id')
  personalWorkspaceIdA = memberships![0].workspace_id

  const { data: types } = await adminClient().from('income_source_types').select('id, slug').eq('slug', 'salario').single()
  salarioTypeId = types!.id

  const { data: categories } = await adminClient().from('expense_categories').select('id, slug').eq('slug', 'habitacao').single()
  habitacaoCategoryId = categories!.id
})

afterAll(async () => {
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
})

describe('lookup tables', () => {
  it('lets any authenticated user read income source types', async () => {
    const { data, error } = await userA.client.from('income_source_types').select('slug').order('sort_order')
    expect(error).toBeNull()
    expect(data!.length).toBe(6)
  })

  it('lets any authenticated user read expense categories', async () => {
    const { data, error } = await userA.client.from('expense_categories').select('slug').order('sort_order')
    expect(error).toBeNull()
    expect(data!.length).toBe(10)
  })
})

describe('income_sources RLS', () => {
  it('lets a workspace member create and read their own income source', async () => {
    const { error: insertError } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Salário principal',
      amount: 2000,
      cadence: 'mensal',
    })
    expect(insertError).toBeNull()

    const { data, error } = await userA.client
      .from('income_sources')
      .select('name, amount, cadence')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Salário principal')
  })

  it('hides another user\'s income sources', async () => {
    const { data, error } = await userB.client
      .from('income_sources')
      .select('id')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('rejects a non-positive amount at the database level', async () => {
    const { error } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Inválido',
      amount: 0,
      cadence: 'mensal',
    })
    expect(error).not.toBeNull()
  })

  it('rejects an invalid cadence at the database level', async () => {
    const { error } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Inválido',
      amount: 100,
      cadence: 'quinzenal',
    })
    expect(error).not.toBeNull()
  })
})

describe('recurring_expenses RLS', () => {
  it('lets a workspace member create and read their own recurring expense', async () => {
    const { error: insertError } = await userA.client.from('recurring_expenses').insert({
      workspace_id: personalWorkspaceIdA,
      category_id: habitacaoCategoryId,
      name: 'Renda',
      amount: 800,
      cadence: 'mensal',
    })
    expect(insertError).toBeNull()

    const { data, error } = await userA.client
      .from('recurring_expenses')
      .select('name, amount, cadence')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Renda')
  })

  it('hides another user\'s recurring expenses', async () => {
    const { data, error } = await userB.client
      .from('recurring_expenses')
      .select('id')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('blocks a non-member from inserting into a workspace they do not belong to', async () => {
    const { error } = await userB.client.from('recurring_expenses').insert({
      workspace_id: personalWorkspaceIdA,
      category_id: habitacaoCategoryId,
      name: 'Intruso',
      amount: 100,
      cadence: 'mensal',
    })
    expect(error).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/integration/income-expenses.rls.test.ts`
Expected: PASS, all cases. Requires the local Supabase stack running with Task 1's migration applied (same precondition as the existing `family-workspaces.rls.test.ts`).

- [ ] **Step 3: Commit**

```bash
git add tests/integration/income-expenses.rls.test.ts
git commit -m "test: add RLS integration coverage for income sources and recurring expenses"
```

---

### Task 5: Finance server actions

**Files:**
- Create: `lib/finance/actions.ts`

**Interfaces:**
- Consumes: `Cadence`, `CADENCE_VALUES` from `@/lib/finance/cadence` (Task 2); `createClient` from `@/lib/supabase/server` (existing, same import used in `app/onboarding/actions.ts`).
- Produces: `createIncomeSource`, `updateIncomeSource`, `setIncomeSourceActive`, `deleteIncomeSource`, `createRecurringExpense`, `updateRecurringExpense`, `setRecurringExpenseActive`, `deleteRecurringExpense` — all `async function`, all `'use server'`. Task 6/7 (UI) call these directly. Exact signatures below.

- [ ] **Step 1: Write the implementation**

```ts
'use server'

import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CADENCE_VALUES, type Cadence } from './cadence'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('not_authenticated')
  return { supabase, user }
}

function assertValidItem(name: string, amount: number, cadence: Cadence) {
  if (!name.trim()) throw new Error('name_required')
  if (!(amount > 0)) throw new Error('amount_invalid')
  if (!CADENCE_VALUES.includes(cadence)) throw new Error('cadence_invalid')
}

export async function createIncomeSource(input: {
  workspaceId: string
  sourceTypeId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase.from('income_sources').insert({
    workspace_id: input.workspaceId,
    source_type_id: input.sourceTypeId,
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    notes: input.notes,
  })
  if (error) throw error

  refresh()
}

export async function updateIncomeSource(input: {
  id: string
  sourceTypeId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase
    .from('income_sources')
    .update({
      source_type_id: input.sourceTypeId,
      name: input.name.trim(),
      amount: input.amount,
      cadence: input.cadence,
      notes: input.notes,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function setIncomeSourceActive(id: string, active: boolean) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('income_sources').update({ active }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function deleteIncomeSource(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('income_sources').delete().eq('id', id)
  if (error) throw error

  refresh()
}

export async function createRecurringExpense(input: {
  workspaceId: string
  categoryId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase.from('recurring_expenses').insert({
    workspace_id: input.workspaceId,
    category_id: input.categoryId,
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    notes: input.notes,
  })
  if (error) throw error

  refresh()
}

export async function updateRecurringExpense(input: {
  id: string
  categoryId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      category_id: input.categoryId,
      name: input.name.trim(),
      amount: input.amount,
      cadence: input.cadence,
      notes: input.notes,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function setRecurringExpenseActive(id: string, active: boolean) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('recurring_expenses').update({ active }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function deleteRecurringExpense(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error

  refresh()
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/finance/actions.ts
git commit -m "feat: add server actions for income sources and recurring expenses"
```

---

### Task 6: List and form UI components

**Files:**
- Create: `components/finance/item-form-dialog.tsx`
- Create: `components/finance/item-list.tsx`
- Create: `components/finance/budget-summary.tsx`

**Interfaces:**
- Consumes: `Cadence`, `CADENCE_OPTIONS` from `@/lib/finance/cadence` (Task 2); `LookupOption` from `@/lib/finance/queries` (Task 3); `Dialog` from `@radix-ui/react-dialog` (existing dependency); `Button`, `Input`, `Label` from `@/components/ui/*` (existing).
- Produces: `export type FinanceItemValues = { name: string; amount: number; cadence: Cadence; lookupId: string; notes: string | null }`, `export function ItemFormDialog(props): JSX.Element`, `export type FinanceItem = { id: string; name: string; amount: number; cadence: Cadence; notes: string | null; active: boolean; lookupId: string; lookupLabel: string }`, `export function ItemList(props): JSX.Element`, `export function BudgetSummary(props: { monthlyIncome: number; monthlyExpenses: number }): JSX.Element`. Task 7 renders all three.

- [ ] **Step 1: Write `item-form-dialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CADENCE_OPTIONS, type Cadence } from '@/lib/finance/cadence'

export type FinanceItemValues = {
  name: string
  amount: number
  cadence: Cadence
  lookupId: string
  notes: string | null
}

export function ItemFormDialog({
  trigger,
  title,
  lookupLabel,
  lookupOptions,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactNode
  title: string
  lookupLabel: string
  lookupOptions: { id: string; label: string }[]
  initialValues?: FinanceItemValues
  onSubmit: (values: FinanceItemValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialValues?.name ?? '')
  const [amount, setAmount] = useState(initialValues?.amount.toString() ?? '')
  const [cadence, setCadence] = useState<Cadence>(initialValues?.cadence ?? 'mensal')
  const [lookupId, setLookupId] = useState(initialValues?.lookupId ?? lookupOptions[0]?.id ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setName(initialValues?.name ?? '')
      setAmount(initialValues?.amount.toString() ?? '')
      setCadence(initialValues?.cadence ?? 'mensal')
      setLookupId(initialValues?.lookupId ?? lookupOptions[0]?.id ?? '')
      setNotes(initialValues?.notes ?? '')
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (!name.trim()) {
      setError('Indica um nome.')
      return
    }
    if (!(parsedAmount > 0)) {
      setError('Indica um valor superior a zero.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await onSubmit({
          name: name.trim(),
          amount: parsedAmount,
          cadence,
          lookupId,
          notes: notes.trim() || null,
        })
        setOpen(false)
      } catch {
        setError('Não foi possível guardar. Tenta novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-name">Nome</Label>
              <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-amount">Valor (€)</Label>
              <Input
                id="item-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-cadence">Cadência</Label>
              <select
                id="item-cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              >
                {CADENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-lookup">{lookupLabel}</Label>
              <select
                id="item-lookup"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              >
                {lookupOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-notes">Notas (opcional)</Label>
              <Input id="item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={isPending} className="mt-2">
              Guardar
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Write `item-list.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CADENCE_OPTIONS, type Cadence } from '@/lib/finance/cadence'
import { ItemFormDialog, type FinanceItemValues } from './item-form-dialog'

export type FinanceItem = {
  id: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
  active: boolean
  lookupId: string
  lookupLabel: string
}

function cadenceLabel(cadence: Cadence): string {
  return CADENCE_OPTIONS.find((o) => o.value === cadence)?.label ?? cadence
}

export function ItemList({
  items,
  lookupLabel,
  lookupOptions,
  emptyTitle,
  emptyDescription,
  addLabel,
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
}: {
  items: FinanceItem[]
  lookupLabel: string
  lookupOptions: { id: string; label: string }[]
  emptyTitle: string
  emptyDescription: string
  addLabel: string
  onCreate: (values: FinanceItemValues) => Promise<void>
  onUpdate: (id: string, values: FinanceItemValues) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <ItemFormDialog
        trigger={<Button size="sm">{addLabel}</Button>}
        title={addLabel}
        lookupLabel={lookupLabel}
        lookupOptions={lookupOptions}
        onSubmit={onCreate}
      />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <h3 className="font-display text-lg font-medium">{emptyTitle}</h3>
          <p className="text-sm text-muted">{emptyDescription}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-0.5">
                <span className={`font-medium ${item.active ? 'text-ink' : 'text-muted line-through'}`}>
                  {item.name}
                </span>
                <span className="text-sm text-muted">
                  {item.amount.toFixed(2)}€ · {cadenceLabel(item.cadence)} · {item.lookupLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startTransition(() => onToggleActive(item.id, !item.active))}
                  disabled={isPending}
                  className="text-sm text-muted hover:text-ink"
                >
                  {item.active ? 'Desativar' : 'Ativar'}
                </button>
                <ItemFormDialog
                  trigger={
                    <button type="button" aria-label="Editar" className="text-muted hover:text-ink">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  }
                  title={`Editar ${item.name}`}
                  lookupLabel={lookupLabel}
                  lookupOptions={lookupOptions}
                  initialValues={{
                    name: item.name,
                    amount: item.amount,
                    cadence: item.cadence,
                    lookupId: item.lookupId,
                    notes: item.notes,
                  }}
                  onSubmit={(values) => onUpdate(item.id, values)}
                />
                <button
                  type="button"
                  onClick={() => startTransition(() => onDelete(item.id))}
                  disabled={isPending}
                  aria-label="Remover"
                  className="text-muted hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `budget-summary.tsx`**

```tsx
import { Card } from '@/components/ui/card'

export function BudgetSummary({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const balance = monthlyIncome - monthlyExpenses

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <p className="text-sm text-muted">Rendimento mensal estimado</p>
        <p className="mt-1 font-display text-2xl font-medium text-ink">{monthlyIncome.toFixed(2)}€</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted">Gastos mensais estimados</p>
        <p className="mt-1 font-display text-2xl font-medium text-ink">{monthlyExpenses.toFixed(2)}€</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted">Saldo disponível estimado</p>
        <p className={`mt-1 font-display text-2xl font-medium ${balance >= 0 ? 'text-primary-strong' : 'text-danger'}`}>
          {balance.toFixed(2)}€
        </p>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add components/finance/item-form-dialog.tsx components/finance/item-list.tsx components/finance/budget-summary.tsx
git commit -m "feat: add finance item list, form dialog, and budget summary components"
```

---

### Task 7: Budget page wiring

**Files:**
- Create: `components/finance/budget-client.tsx`
- Modify: `app/(dashboard)/budget/page.tsx` (replace the existing `ComingSoon` stub entirely)

**Interfaces:**
- Consumes: `BudgetSummary`, `ItemList`, `FinanceItem` from `@/components/finance/*` (Task 6); `toMonthlyAmount` from `@/lib/finance/cadence` (Task 2); `IncomeSourceRow`, `RecurringExpenseRow`, `LookupOption`, `getIncomeSources`, `getRecurringExpenses`, `getIncomeSourceTypes`, `getExpenseCategories` from `@/lib/finance/queries` (Task 3); all 8 actions from `@/lib/finance/actions` (Task 5); `createClient` from `@/lib/supabase/server`, `getUserWorkspaces` from `@/lib/workspaces/queries`, `getActiveWorkspaceId` from `@/lib/workspaces/active-workspace` (all existing, same imports as `app/(dashboard)/layout.tsx`).

- [ ] **Step 1: Write `budget-client.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { BudgetSummary } from './budget-summary'
import { ItemList, type FinanceItem } from './item-list'
import { toMonthlyAmount } from '@/lib/finance/cadence'
import type { IncomeSourceRow, RecurringExpenseRow, LookupOption } from '@/lib/finance/queries'
import {
  createIncomeSource,
  updateIncomeSource,
  setIncomeSourceActive,
  deleteIncomeSource,
  createRecurringExpense,
  updateRecurringExpense,
  setRecurringExpenseActive,
  deleteRecurringExpense,
} from '@/lib/finance/actions'

function labelFor(id: string, options: LookupOption[]): string {
  return options.find((o) => o.id === id)?.label ?? 'Outro'
}

export function BudgetClient({
  workspaceId,
  incomeSources,
  recurringExpenses,
  incomeSourceTypes,
  expenseCategories,
}: {
  workspaceId: string
  incomeSources: IncomeSourceRow[]
  recurringExpenses: RecurringExpenseRow[]
  incomeSourceTypes: LookupOption[]
  expenseCategories: LookupOption[]
}) {
  const [tab, setTab] = useState<'income' | 'expenses'>('income')

  const monthlyIncome = useMemo(
    () =>
      incomeSources
        .filter((s) => s.active)
        .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.cadence), 0),
    [incomeSources]
  )
  const monthlyExpenses = useMemo(
    () =>
      recurringExpenses
        .filter((e) => e.active)
        .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.cadence), 0),
    [recurringExpenses]
  )

  const incomeItems: FinanceItem[] = incomeSources.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    cadence: s.cadence,
    notes: s.notes,
    active: s.active,
    lookupId: s.source_type_id,
    lookupLabel: labelFor(s.source_type_id, incomeSourceTypes),
  }))

  const expenseItems: FinanceItem[] = recurringExpenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    cadence: e.cadence,
    notes: e.notes,
    active: e.active,
    lookupId: e.category_id,
    lookupLabel: labelFor(e.category_id, expenseCategories),
  }))

  return (
    <div className="flex flex-col gap-8">
      <BudgetSummary monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('income')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'income' ? 'border-b-2 border-primary text-ink' : 'text-muted'}`}
        >
          Rendimento
        </button>
        <button
          type="button"
          onClick={() => setTab('expenses')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'expenses' ? 'border-b-2 border-primary text-ink' : 'text-muted'}`}
        >
          Gastos Fixos
        </button>
      </div>

      {tab === 'income' ? (
        <ItemList
          items={incomeItems}
          lookupLabel="Tipo"
          lookupOptions={incomeSourceTypes}
          emptyTitle="Ainda não configuraste nenhum rendimento"
          emptyDescription="Adiciona o teu salário ou outra fonte de rendimento para veres o teu saldo disponível estimado."
          addLabel="Adicionar rendimento"
          onCreate={(values) =>
            createIncomeSource({
              workspaceId,
              sourceTypeId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onUpdate={(id, values) =>
            updateIncomeSource({
              id,
              sourceTypeId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onDelete={deleteIncomeSource}
          onToggleActive={setIncomeSourceActive}
        />
      ) : (
        <ItemList
          items={expenseItems}
          lookupLabel="Categoria"
          lookupOptions={expenseCategories}
          emptyTitle="Ainda não configuraste nenhum gasto fixo"
          emptyDescription="Adiciona os teus gastos recorrentes (renda, subscrições, etc.) para veres o teu saldo disponível estimado."
          addLabel="Adicionar gasto fixo"
          onCreate={(values) =>
            createRecurringExpense({
              workspaceId,
              categoryId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onUpdate={(id, values) =>
            updateRecurringExpense({
              id,
              categoryId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onDelete={deleteRecurringExpense}
          onToggleActive={setRecurringExpenseActive}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/(dashboard)/budget/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import {
  getIncomeSources,
  getRecurringExpenses,
  getIncomeSourceTypes,
  getExpenseCategories,
} from '@/lib/finance/queries'
import { BudgetClient } from '@/components/finance/budget-client'

export default async function BudgetPage() {
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const workspaceId = await getActiveWorkspaceId(workspaces)

  if (!workspaceId) {
    redirect('/login')
  }

  const [incomeSources, recurringExpenses, incomeSourceTypes, expenseCategories] = await Promise.all([
    getIncomeSources(supabase, workspaceId),
    getRecurringExpenses(supabase, workspaceId),
    getIncomeSourceTypes(supabase),
    getExpenseCategories(supabase),
  ])

  return (
    <BudgetClient
      workspaceId={workspaceId}
      incomeSources={incomeSources}
      recurringExpenses={recurringExpenses}
      incomeSourceTypes={incomeSourceTypes}
      expenseCategories={expenseCategories}
    />
  )
}
```

- [ ] **Step 3: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean (no new errors/warnings).

- [ ] **Step 4: Manual verification**

Start the dev server (`npm run dev`) if not already running, sign up or log in as a test user, navigate to `/budget`. Confirm: the page shows the 3-card summary (all zeros initially) and two tabs; "Adicionar rendimento" opens a dialog, submitting a valid entry closes the dialog and updates both the list and the summary; switching to "Gastos Fixos" and adding an entry updates the summary's saldo estimado; editing and deleting both work; toggling "Desativar" removes the item from the summary calculation without deleting it; no console errors.

- [ ] **Step 5: Commit**

```bash
git add components/finance/budget-client.tsx "app/(dashboard)/budget/page.tsx"
git commit -m "feat: replace /budget stub with income and recurring expenses management"
```
