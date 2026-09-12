# Financial Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user or family activate a time-boxed financial challenge (spending limit, savings target, category reduction, no-spend streak) and see its progress calculated automatically from entries they log against it — with a data model and a `getChallengeSummary`/`listChallengeSummaries` query layer designed to be the stable contract a future AI agent reads, not just the UI.

**Architecture:** Three new tables (`challenge_templates`, `financial_challenges`, `challenge_entries`), no dependency on Manual Transactions or Savings Vaults (neither exists). Progress is always derived in application code from a challenge's own `challenge_entries` — never a stored number. A pure calculation module (`lib/challenges/summary.ts`) resolves a challenge + its entries into a fully-typed `ChallengeSummary`; an impure query layer (`lib/challenges/queries.ts`) fetches the raw rows, calls the pure module, and opportunistically persists a resolved `completed`/`failed` status back to the row when the caller has permission to do so.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), Supabase (Postgres + RLS), Tailwind v4 tokens, Vitest.

**Spec:** `docs/project/feature/financial-challenges/feature-spec.md`

## Global Constraints

- No dependency on `transactions` or `vaults` — neither table exists. Progress comes exclusively from this feature's own `challenge_entries`.
- `category_id` references the existing global `expense_categories` table (from the income/expenses feature), not a new `categories` table.
- Every mutating server action calls `refresh()` from `next/cache` as its last statement on success (established pattern — see `app/onboarding/actions.ts`).
- `challenge_entries.occurred_on` must fall within `[start_date, end_date]` of its parent challenge — enforced by a database trigger, not just client-side validation.
- `financial_challenges.status` is only ever set to `'active'`/`'abandoned'` directly by a client action; `'completed'`/`'failed'` are resolved on-read by the query layer (see Task 3) and written back only as a best-effort cache update — never treated as a hard requirement to succeed.
- `category_reduction` challenges require a non-null `baseline_value` at creation (a one-time reference figure the user provides — there is no automatic prior-period baseline, since `challenge_entries` only exist from `start_date` onward).
- All UI copy is European Portuguese, formal "você" register, matching the rest of the app.
- Every table and non-obvious column gets a `comment on table`/`comment on column` in the migration — this is the feature's explicit "AI-agent-legible schema" requirement, not optional polish.
- RLS follows the existing tenancy pattern: `is_workspace_member(workspace_id)` for read, scoped ownership checks for write — same helper functions from `supabase/migrations/20260906120000_001_family_workspaces.sql`.

---

### Task 1: Migration and generated types

**Files:**
- Create: `supabase/migrations/20260912120000_008_financial_challenges.sql`
- Modify: `lib/supabase/database.types.ts` (insert new table entries after the `recurring_expenses` block, before the closing `}` of `Tables`; add the new RPC's `Args`/`Returns` if you added one — this plan does not add a new RPC, it reuses `get_workspace_members_with_email`)

**Interfaces:**
- Produces: tables `challenge_templates(id, key, name, description, metric_type, default_params)`, `financial_challenges(id, workspace_id, owner_user_id, created_by, template_id, name, metric_type, target_value, category_id, baseline_value, start_date, end_date, status, created_at, updated_at)`, `challenge_entries(id, challenge_id, amount, occurred_on, note, created_by, created_at)`.

- [ ] **Step 1: Write the migration**

```sql
-- Financial Challenges (v2 — entries-based progress, no Manual
-- Transactions/Savings Vaults dependency). See
-- docs/project/feature/financial-challenges/feature-spec.md.

create table challenge_templates (
  id             uuid primary key default gen_random_uuid(),
  key            text not null unique,
  name           text not null,
  description    text not null,
  metric_type    text not null check (metric_type in ('spending_limit','savings_target','category_reduction','no_spend_streak')),
  default_params jsonb not null default '{}'
);

comment on table challenge_templates is 'Global, publicly readable catalog of ready-made challenge templates. No workspace_id — not tenant data.';
comment on column challenge_templates.default_params is 'Pre-fill hints only (e.g. {"suggested_target": 1000}) — never core challenge data.';

create table financial_challenges (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  owner_user_id  uuid references auth.users(id) on delete cascade,
  created_by     uuid not null references auth.users(id),
  template_id    uuid references challenge_templates(id),
  name           text not null,
  metric_type    text not null check (metric_type in ('spending_limit','savings_target','category_reduction','no_spend_streak')),
  target_value   numeric(12,2) not null check (target_value > 0),
  category_id    uuid references expense_categories(id),
  baseline_value numeric(12,2) check (baseline_value is null or baseline_value >= 0),
  start_date     date not null,
  end_date       date not null,
  status         text not null default 'active' check (status in ('active','completed','failed','abandoned')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint financial_challenges_end_after_start check (end_date > start_date),
  constraint financial_challenges_baseline_required_for_category_reduction
    check (metric_type <> 'category_reduction' or baseline_value is not null)
);

comment on table financial_challenges is 'A time-boxed financial goal, personal or family-shared. Progress is never stored directly — always derived from this row plus its challenge_entries (see lib/challenges/summary.ts).';
comment on column financial_challenges.owner_user_id is 'null = family challenge (any member contributes/sees it); set = this member''s personal challenge inside the shared workspace.';
comment on column financial_challenges.baseline_value is 'Reference spend for category_reduction only, entered once at creation (e.g. last month''s known spend in the category) — challenge_entries only exist from start_date onward, so there is no automatic prior-period baseline to compare against.';
comment on column financial_challenges.status is 'active/abandoned are set directly by a client action; completed/failed are resolved on-read once end_date has passed (see lib/challenges/queries.ts) and persisted back here on a best-effort basis — never required to succeed for a correct read.';

create index financial_challenges_workspace_status_idx on financial_challenges (workspace_id, status);

create table challenge_entries (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references financial_challenges(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  occurred_on  date not null,
  note         text,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now()
);

comment on table challenge_entries is 'What an entry represents depends on the parent challenge''s metric_type: a spend (spending_limit/category_reduction/no_spend_streak) or a saving contribution (savings_target) — a challenge only has one metric_type, so there is no ambiguity. Immutable once created (no update/delete policy) — abandon or let the parent challenge run its course instead of correcting an entry.';

create index challenge_entries_challenge_occurred_idx on challenge_entries (challenge_id, occurred_on);

create or replace function check_challenge_entry_occurred_on()
returns trigger as $$
declare
  v_start date;
  v_end date;
begin
  select start_date, end_date into v_start, v_end from financial_challenges where id = new.challenge_id;
  if new.occurred_on < v_start or new.occurred_on > v_end then
    raise exception 'challenge_entry_out_of_range';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_challenge_entries_occurred_on
before insert or update on challenge_entries
for each row execute function check_challenge_entry_occurred_on();

create or replace function set_financial_challenges_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_financial_challenges_updated_at
before update on financial_challenges
for each row execute function set_financial_challenges_updated_at();

alter table challenge_templates enable row level security;
alter table financial_challenges enable row level security;
alter table challenge_entries enable row level security;

grant select on challenge_templates to authenticated, service_role;
grant select, insert, update on financial_challenges to authenticated, service_role;
grant select, insert on challenge_entries to authenticated, service_role;

create policy challenge_templates_select on challenge_templates
for select using (true);

create policy financial_challenges_select on financial_challenges
for select using (is_workspace_member(workspace_id));

create policy financial_challenges_insert on financial_challenges
for insert with check (is_workspace_member(workspace_id));

create policy financial_challenges_update on financial_challenges
for update using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy challenge_entries_select on challenge_entries
for select using (
  exists (select 1 from financial_challenges c where c.id = challenge_entries.challenge_id and is_workspace_member(c.workspace_id))
);

create policy challenge_entries_insert on challenge_entries
for insert with check (
  exists (select 1 from financial_challenges c where c.id = challenge_entries.challenge_id and is_workspace_member(c.workspace_id))
);

insert into challenge_templates (key, name, description, metric_type, default_params) values
  ('spending_limit_default', 'Limite de gastos', 'Define um limite de gastos numa categoria durante um período.', 'spending_limit', '{}'),
  ('savings_target_default', 'Meta de poupança', 'Poupa um valor específico até uma data.', 'savings_target', '{}'),
  ('category_reduction_default', 'Reduzir uma categoria', 'Gasta menos numa categoria do que gastaste no período anterior.', 'category_reduction', '{}'),
  ('no_spend_streak_default', 'Sequência sem gastos', 'Fica o máximo de dias seguidos sem gastar numa categoria.', 'no_spend_streak', '{}');
```

- [ ] **Step 2: Apply the migration locally**

Run: `supabase migration up` (the local Supabase stack must already be running — run `supabase status` first; if it isn't running, run `supabase start`).

Expected: migration applies with no errors; `select key, metric_type from challenge_templates order by key;` returns the 4 seeded rows.

- [ ] **Step 3: Reload PostgREST's schema cache**

Run: `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema';"` then, if a query against the new tables still returns `PGRST205 Could not find the table`, run `docker restart supabase_rest_$(basename "$(supabase status -o json 2>/dev/null | grep -o '"DB_URL"[^,]*' || echo local)")` — or more simply, just restart the local stack with `supabase stop && supabase start` if the notify alone doesn't take effect. (This step exists because a prior feature in this repo hit exactly this issue — PostgREST caches the schema at startup and needs a nudge after DDL applied outside its own `db reset` flow.)

- [ ] **Step 4: Add the new tables to `lib/supabase/database.types.ts`**

Insert this block immediately after the `recurring_expenses` table entry (before the `}` that closes `Tables`):

```ts
      challenge_templates: {
        Row: {
          id: string
          key: string
          name: string
          description: string
          metric_type: 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
          default_params: Record<string, unknown>
        }
        Insert: {
          id?: string
          key: string
          name: string
          description: string
          metric_type: 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
          default_params?: Record<string, unknown>
        }
        Update: Partial<Database['public']['Tables']['challenge_templates']['Insert']>
        Relationships: []
      }
      financial_challenges: {
        Row: {
          id: string
          workspace_id: string
          owner_user_id: string | null
          created_by: string
          template_id: string | null
          name: string
          metric_type: 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
          target_value: number
          category_id: string | null
          baseline_value: number | null
          start_date: string
          end_date: string
          status: 'active' | 'completed' | 'failed' | 'abandoned'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          owner_user_id?: string | null
          created_by: string
          template_id?: string | null
          name: string
          metric_type: 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
          target_value: number
          category_id?: string | null
          baseline_value?: number | null
          start_date: string
          end_date: string
          status?: 'active' | 'completed' | 'failed' | 'abandoned'
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['financial_challenges']['Insert']>
        Relationships: []
      }
      challenge_entries: {
        Row: {
          id: string
          challenge_id: string
          amount: number
          occurred_on: string
          note: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          challenge_id: string
          amount: number
          occurred_on: string
          note?: string | null
          created_by: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['challenge_entries']['Insert']>
        Relationships: []
      }
```

- [ ] **Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260912120000_008_financial_challenges.sql lib/supabase/database.types.ts
git commit -m "feat: add financial challenges schema"
```

---

### Task 2: Progress calculation (pure, tested)

**Files:**
- Create: `lib/challenges/summary.ts`
- Test: `tests/unit/challenges-summary.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure module, no DB access).
- Produces: `export type MetricType = 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'`, `export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned'`, `export type ChallengeEntryInput = { amount: number; occurredOn: string; note: string | null }`, `export type ChallengeInput = { id: string; workspaceId: string; ownerUserId: string | null; name: string; metricType: MetricType; targetValue: number; baselineValue: number | null; categoryLabel: string | null; startDate: string; endDate: string; status: ChallengeStatus }`, `export type ChallengeSummary = { id: string; workspaceId: string; ownerUserId: string | null; ownerLabel: string; name: string; metricType: MetricType; categoryLabel: string | null; targetValue: number; baselineValue: number | null; startDate: string; endDate: string; currentValue: number; percentComplete: number; daysRemaining: number; status: ChallengeStatus; recentEntries: ChallengeEntryInput[] }` — note `startDate`/`endDate` are carried straight through from `ChallengeInput` so later tasks (the entry-logging UI) never need to fetch the raw challenge row separately just to know its date bounds. `export function computeCurrentValue(challenge: ChallengeInput, entries: ChallengeEntryInput[], today: string): number`, `export function computePercentComplete(challenge: ChallengeInput, currentValue: number): number`, `export function computeDaysRemaining(challenge: ChallengeInput, today: string): number`, `export function resolveEffectiveStatus(challenge: ChallengeInput, currentValue: number, today: string): ChallengeStatus`, `export function getChallengeSummary(challenge: ChallengeInput, entries: ChallengeEntryInput[], ownerLabel: string, today?: string): ChallengeSummary`. Task 3's query layer calls `getChallengeSummary` for every challenge it fetches.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import {
  computeCurrentValue,
  computePercentComplete,
  computeDaysRemaining,
  resolveEffectiveStatus,
  getChallengeSummary,
  type ChallengeInput,
  type ChallengeEntryInput,
} from '@/lib/challenges/summary'

function baseChallenge(overrides: Partial<ChallengeInput> = {}): ChallengeInput {
  return {
    id: 'c1',
    workspaceId: 'w1',
    ownerUserId: null,
    name: 'Test',
    metricType: 'spending_limit',
    targetValue: 100,
    baselineValue: null,
    categoryLabel: null,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'active',
    ...overrides,
  }
}

describe('computeCurrentValue', () => {
  it('spending_limit sums entries in the challenge window', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit' })
    const entries: ChallengeEntryInput[] = [
      { amount: 30, occurredOn: '2026-01-05', note: null },
      { amount: 20, occurredOn: '2026-01-10', note: null },
    ]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(50)
  })

  it('savings_target sums entries the same way', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 500 })
    const entries: ChallengeEntryInput[] = [
      { amount: 200, occurredOn: '2026-01-05', note: null },
      { amount: 150, occurredOn: '2026-01-10', note: null },
    ]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(350)
  })

  it('category_reduction returns baseline minus entries (reduction achieved so far)', () => {
    const challenge = baseChallenge({ metricType: 'category_reduction', targetValue: 100, baselineValue: 400 })
    const entries: ChallengeEntryInput[] = [{ amount: 250, occurredOn: '2026-01-05', note: null }]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(150)
  })

  it('no_spend_streak counts days since the latest entry (or start_date if none)', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    const entries: ChallengeEntryInput[] = [{ amount: 5, occurredOn: '2026-01-10', note: null }]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(5)
  })

  it('no_spend_streak with no entries counts from start_date', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    expect(computeCurrentValue(challenge, [], '2026-01-06')).toBe(5)
  })
})

describe('computePercentComplete', () => {
  it('clamps to 100', () => {
    const challenge = baseChallenge({ targetValue: 100 })
    expect(computePercentComplete(challenge, 150)).toBe(100)
  })

  it('clamps to 0 for a negative current value', () => {
    const challenge = baseChallenge({ targetValue: 100 })
    expect(computePercentComplete(challenge, -10)).toBe(0)
  })

  it('rounds to the nearest integer', () => {
    const challenge = baseChallenge({ targetValue: 300 })
    expect(computePercentComplete(challenge, 100)).toBe(33)
  })
})

describe('computeDaysRemaining', () => {
  it('counts full days from today to end_date', () => {
    const challenge = baseChallenge({ endDate: '2026-01-31' })
    expect(computeDaysRemaining(challenge, '2026-01-25')).toBe(6)
  })

  it('never goes negative after end_date', () => {
    const challenge = baseChallenge({ endDate: '2026-01-31' })
    expect(computeDaysRemaining(challenge, '2026-02-05')).toBe(0)
  })
})

describe('resolveEffectiveStatus', () => {
  it('stays active before end_date regardless of current value', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 500, '2026-01-15')).toBe('active')
  })

  it('resolves spending_limit as completed when under target at end_date', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 80, '2026-02-01')).toBe('completed')
  })

  it('resolves spending_limit as failed when over target at end_date', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 150, '2026-02-01')).toBe('failed')
  })

  it('resolves savings_target as completed early, before end_date, once target is reached', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 500 })
    expect(resolveEffectiveStatus(challenge, 500, '2026-01-15')).toBe('completed')
  })

  it('never overrides an abandoned status', () => {
    const challenge = baseChallenge({ status: 'abandoned' })
    expect(resolveEffectiveStatus(challenge, 1000, '2026-02-01')).toBe('abandoned')
  })
})

describe('getChallengeSummary', () => {
  it('assembles a full summary with sorted, capped recent entries', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    const entries: ChallengeEntryInput[] = [
      { amount: 10, occurredOn: '2026-01-05', note: 'a' },
      { amount: 20, occurredOn: '2026-01-10', note: 'b' },
    ]
    const summary = getChallengeSummary(challenge, entries, 'Família', '2026-01-15')

    expect(summary.currentValue).toBe(30)
    expect(summary.percentComplete).toBe(30)
    expect(summary.status).toBe('active')
    expect(summary.ownerLabel).toBe('Família')
    expect(summary.recentEntries).toEqual([
      { amount: 20, occurredOn: '2026-01-10', note: 'b' },
      { amount: 10, occurredOn: '2026-01-05', note: 'a' },
    ])
  })

  it('caps recentEntries at 10, most recent first', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 1000 })
    const entries: ChallengeEntryInput[] = Array.from({ length: 12 }, (_, i) => ({
      amount: 10,
      occurredOn: `2026-01-${String(i + 1).padStart(2, '0')}`,
      note: null,
    }))
    const summary = getChallengeSummary(challenge, entries, 'Família', '2026-01-31')
    expect(summary.recentEntries).toHaveLength(10)
    expect(summary.recentEntries[0].occurredOn).toBe('2026-01-12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/challenges-summary.test.ts`
Expected: FAIL with "Cannot find module '@/lib/challenges/summary'".

- [ ] **Step 3: Write the implementation**

```ts
export type MetricType = 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned'

export type ChallengeEntryInput = { amount: number; occurredOn: string; note: string | null }

export type ChallengeInput = {
  id: string
  workspaceId: string
  ownerUserId: string | null
  name: string
  metricType: MetricType
  targetValue: number
  baselineValue: number | null
  categoryLabel: string | null
  startDate: string
  endDate: string
  status: ChallengeStatus
}

export type ChallengeSummary = {
  id: string
  workspaceId: string
  ownerUserId: string | null
  ownerLabel: string
  name: string
  metricType: MetricType
  categoryLabel: string | null
  targetValue: number
  baselineValue: number | null
  startDate: string
  endDate: string
  currentValue: number
  percentComplete: number
  daysRemaining: number
  status: ChallengeStatus
  recentEntries: ChallengeEntryInput[]
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function sumInRange(entries: ChallengeEntryInput[], start: string, end: string): number {
  return entries
    .filter((e) => e.occurredOn >= start && e.occurredOn <= end)
    .reduce((sum, e) => sum + e.amount, 0)
}

function latestEntryDate(entries: ChallengeEntryInput[]): string | null {
  if (entries.length === 0) return null
  return entries.reduce((latest, e) => (e.occurredOn > latest ? e.occurredOn : latest), entries[0].occurredOn)
}

export function computeCurrentValue(challenge: ChallengeInput, entries: ChallengeEntryInput[], today: string): number {
  const inRange = sumInRange(entries, challenge.startDate, challenge.endDate)
  switch (challenge.metricType) {
    case 'spending_limit':
    case 'savings_target':
      return Math.round(inRange * 100) / 100
    case 'category_reduction': {
      const baseline = challenge.baselineValue ?? 0
      return Math.round((baseline - inRange) * 100) / 100
    }
    case 'no_spend_streak': {
      const latest = latestEntryDate(entries)
      const since = latest && latest > challenge.startDate ? latest : challenge.startDate
      const evalDate = today < challenge.endDate ? today : challenge.endDate
      return Math.max(0, daysBetween(new Date(since), new Date(evalDate)))
    }
  }
}

export function computePercentComplete(challenge: ChallengeInput, currentValue: number): number {
  if (challenge.targetValue <= 0) return 0
  const raw = (currentValue / challenge.targetValue) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export function computeDaysRemaining(challenge: ChallengeInput, today: string): number {
  return Math.max(0, daysBetween(new Date(today), new Date(challenge.endDate)))
}

export function resolveEffectiveStatus(
  challenge: ChallengeInput,
  currentValue: number,
  today: string
): ChallengeStatus {
  if (challenge.status === 'abandoned') return 'abandoned'

  if (challenge.metricType === 'savings_target' && currentValue >= challenge.targetValue) {
    return 'completed'
  }

  const ended = today > challenge.endDate
  if (!ended) return 'active'

  switch (challenge.metricType) {
    case 'spending_limit':
      return currentValue <= challenge.targetValue ? 'completed' : 'failed'
    case 'savings_target':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
    case 'category_reduction':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
    case 'no_spend_streak':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
  }
}

export function getChallengeSummary(
  challenge: ChallengeInput,
  entries: ChallengeEntryInput[],
  ownerLabel: string,
  today: string = new Date().toISOString().slice(0, 10)
): ChallengeSummary {
  const currentValue = computeCurrentValue(challenge, entries, today)
  const percentComplete = computePercentComplete(challenge, currentValue)
  const daysRemaining = computeDaysRemaining(challenge, today)
  const status = resolveEffectiveStatus(challenge, currentValue, today)
  const recentEntries = [...entries].sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1)).slice(0, 10)

  return {
    id: challenge.id,
    workspaceId: challenge.workspaceId,
    ownerUserId: challenge.ownerUserId,
    ownerLabel,
    name: challenge.name,
    metricType: challenge.metricType,
    categoryLabel: challenge.categoryLabel,
    targetValue: challenge.targetValue,
    baselineValue: challenge.baselineValue,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    currentValue,
    percentComplete,
    daysRemaining,
    status,
    recentEntries,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/challenges-summary.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/challenges/summary.ts tests/unit/challenges-summary.test.ts
git commit -m "feat: add pure challenge progress calculation"
```

---

### Task 3: Query layer

**Files:**
- Create: `lib/challenges/queries.ts`

**Interfaces:**
- Consumes: everything from `@/lib/challenges/summary` (Task 2); `Database` from `@/lib/supabase/database.types` (Task 1).
- Produces: `export type ChallengeTemplateRow = Database['public']['Tables']['challenge_templates']['Row']`, `export type FinancialChallengeRow = Database['public']['Tables']['financial_challenges']['Row']`, `export type ChallengeEntryRow = Database['public']['Tables']['challenge_entries']['Row']`, `export const getChallengeTemplates(supabase): Promise<ChallengeTemplateRow[]>`, `export const getFinancialChallenges(supabase, workspaceId): Promise<FinancialChallengeRow[]>`, `export async function getChallengeEntries(supabase, challengeId): Promise<ChallengeEntryRow[]>`, `export async function getWorkspaceMemberOptions(supabase, workspaceId): Promise<{ userId: string; label: string }[]>`, `export async function listChallengeSummaries(supabase, workspaceId): Promise<ChallengeSummary[]>`, `export async function getChallengeSummaryById(supabase, challengeId): Promise<ChallengeSummary | null>`. Task 6/7's pages call `listChallengeSummaries`/`getChallengeSummaryById`/`getChallengeTemplates`/`getWorkspaceMemberOptions`.

- [ ] **Step 1: Write the implementation**

No new business logic to unit-test here (thin Supabase reads plus a best-effort write) — verified via the RLS integration test in Task 4.

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'
import { getChallengeSummary, type ChallengeSummary, type ChallengeEntryInput } from './summary'

export type ChallengeTemplateRow = Database['public']['Tables']['challenge_templates']['Row']
export type FinancialChallengeRow = Database['public']['Tables']['financial_challenges']['Row']
export type ChallengeEntryRow = Database['public']['Tables']['challenge_entries']['Row']

export const getChallengeTemplates = cache(async function getChallengeTemplates(
  supabase: SupabaseClient<Database>
): Promise<ChallengeTemplateRow[]> {
  const { data, error } = await supabase.from('challenge_templates').select('*').order('name')
  if (error) throw error
  return data
})

export const getFinancialChallenges = cache(async function getFinancialChallenges(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<FinancialChallengeRow[]> {
  const { data, error } = await supabase
    .from('financial_challenges')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
})

export async function getChallengeEntries(
  supabase: SupabaseClient<Database>,
  challengeId: string
): Promise<ChallengeEntryRow[]> {
  const { data, error } = await supabase
    .from('challenge_entries')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('occurred_on', { ascending: false })
  if (error) throw error
  return data
}

export async function getWorkspaceMemberOptions(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<{ userId: string; label: string }[]> {
  const { data, error } = await supabase.rpc('get_workspace_members_with_email', {
    p_workspace_id: workspaceId,
  })
  if (error) throw error
  return (data ?? []).map((member) => ({ userId: member.user_id, label: member.email.split('@')[0] }))
}

function toEntryInput(row: ChallengeEntryRow): ChallengeEntryInput {
  return { amount: row.amount, occurredOn: row.occurred_on, note: row.note }
}

async function resolveOwnerLabel(
  ownerUserId: string | null,
  members: { userId: string; label: string }[]
): Promise<string> {
  if (ownerUserId === null) return 'Família'
  return members.find((m) => m.userId === ownerUserId)?.label ?? 'Membro'
}

async function resolveCategoryLabel(
  supabase: SupabaseClient<Database>,
  categoryId: string | null
): Promise<string | null> {
  if (categoryId === null) return null
  const { data } = await supabase.from('expense_categories').select('label').eq('id', categoryId).single()
  return data?.label ?? null
}

// Best-effort: RLS only allows the challenge's own creator to write this
// (financial_challenges_update policy is `created_by = auth.uid()`). A
// non-creator viewer's computed summary above is correct regardless of
// whether this write succeeds — this is purely an opportunistic cache
// update for other queries that filter on `status`, never something a
// caller should treat as a hard requirement.
async function persistResolvedStatus(
  supabase: SupabaseClient<Database>,
  challenge: FinancialChallengeRow,
  resolvedStatus: ChallengeSummary['status']
) {
  if (challenge.status === resolvedStatus) return
  if (resolvedStatus !== 'completed' && resolvedStatus !== 'failed') return
  await supabase.from('financial_challenges').update({ status: resolvedStatus }).eq('id', challenge.id)
}

async function buildSummary(
  supabase: SupabaseClient<Database>,
  challenge: FinancialChallengeRow,
  members: { userId: string; label: string }[]
): Promise<ChallengeSummary> {
  const [entries, categoryLabel] = await Promise.all([
    getChallengeEntries(supabase, challenge.id),
    resolveCategoryLabel(supabase, challenge.category_id),
  ])

  const summary = getChallengeSummary(
    {
      id: challenge.id,
      workspaceId: challenge.workspace_id,
      ownerUserId: challenge.owner_user_id,
      name: challenge.name,
      metricType: challenge.metric_type,
      targetValue: challenge.target_value,
      baselineValue: challenge.baseline_value,
      categoryLabel,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      status: challenge.status,
    },
    entries.map(toEntryInput),
    await resolveOwnerLabel(challenge.owner_user_id, members)
  )

  await persistResolvedStatus(supabase, challenge, summary.status)
  return summary
}

export async function listChallengeSummaries(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<ChallengeSummary[]> {
  const challenges = await getFinancialChallenges(supabase, workspaceId)
  if (challenges.length === 0) return []

  const members = await getWorkspaceMemberOptions(supabase, workspaceId)
  return Promise.all(challenges.map((challenge) => buildSummary(supabase, challenge, members)))
}

export async function getChallengeSummaryById(
  supabase: SupabaseClient<Database>,
  challengeId: string
): Promise<ChallengeSummary | null> {
  const { data: challenge, error } = await supabase
    .from('financial_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()
  if (error || !challenge) return null

  const members = await getWorkspaceMemberOptions(supabase, challenge.workspace_id)
  return buildSummary(supabase, challenge, members)
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/challenges/queries.ts
git commit -m "feat: add financial challenges query layer"
```

---

### Task 4: RLS integration test

**Files:**
- Test: `tests/integration/financial-challenges.rls.test.ts`

**Interfaces:**
- Consumes: `adminClient`, `createTestUser`, `deleteTestUser`, `signInAsTestUser` from `../helpers/supabase-test-clients` (existing); the `financial_challenges`, `challenge_entries`, `challenge_templates` tables and `create_family_workspace` RPC from Task 1.

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
let workspaceId: string
let categoryId: string

async function setUpUser(label: string) {
  const email = `${label}-${RUN_ID}@onomic.test`
  const authUser = await createTestUser(email, PASSWORD)
  const client = await signInAsTestUser(email, PASSWORD)
  return { id: authUser!.id, email, client }
}

beforeAll(async () => {
  userA = await setUpUser('challenges-a')
  userB = await setUpUser('challenges-b')

  const { data: newWorkspaceId } = await userA.client.rpc('create_family_workspace', {
    p_name: 'Challenges Test Family',
  })
  workspaceId = newWorkspaceId as string

  const { data: category } = await adminClient()
    .from('expense_categories')
    .select('id')
    .eq('slug', 'alimentacao')
    .single()
  categoryId = category!.id
})

afterAll(async () => {
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
})

describe('challenge_templates', () => {
  it('lets any authenticated user read the seeded templates', async () => {
    const { data, error } = await userA.client.from('challenge_templates').select('key')
    expect(error).toBeNull()
    expect(data!.length).toBe(4)
  })
})

describe('financial_challenges RLS', () => {
  let challengeId: string

  it('lets a workspace member create a challenge', async () => {
    const { data, error } = await userA.client
      .from('financial_challenges')
      .insert({
        workspace_id: workspaceId,
        created_by: userA.id,
        owner_user_id: null,
        name: 'Reduzir Alimentação',
        metric_type: 'spending_limit',
        target_value: 100,
        category_id: categoryId,
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    challengeId = data!.id
  })

  it('lets any workspace member read the challenge', async () => {
    const { data, error } = await userB.client
      .from('financial_challenges')
      .select('name')
      .eq('id', challengeId)
      .single()
    expect(error).toBeNull()
    expect(data!.name).toBe('Reduzir Alimentação')
  })

  it('hides the challenge from a non-member', async () => {
    const outsider = await setUpUser('challenges-outsider')
    const { data, error } = await outsider.client.from('financial_challenges').select('id').eq('id', challengeId)
    expect(error).toBeNull()
    expect(data).toEqual([])
    await deleteTestUser(outsider.id)
  })

  it('blocks a non-creator member from updating the challenge', async () => {
    const { error } = await userB.client
      .from('financial_challenges')
      .update({ name: 'Hacked' })
      .eq('id', challengeId)
    // RLS silently filters rows the caller isn't allowed to update rather than erroring.
    expect(error).toBeNull()

    const { data } = await adminClient().from('financial_challenges').select('name').eq('id', challengeId).single()
    expect(data!.name).toBe('Reduzir Alimentação')
  })

  it('lets the creator update their own challenge', async () => {
    const { error } = await userA.client
      .from('financial_challenges')
      .update({ name: 'Reduzir Alimentação (revisto)' })
      .eq('id', challengeId)
    expect(error).toBeNull()

    const { data } = await userA.client.from('financial_challenges').select('name').eq('id', challengeId).single()
    expect(data!.name).toBe('Reduzir Alimentação (revisto)')
  })

  it('rejects a category_reduction challenge with no baseline_value', async () => {
    const { error } = await userA.client.from('financial_challenges').insert({
      workspace_id: workspaceId,
      created_by: userA.id,
      name: 'Sem baseline',
      metric_type: 'category_reduction',
      target_value: 50,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
    expect(error).not.toBeNull()
  })

  describe('challenge_entries', () => {
    it('lets any workspace member add an entry inside the challenge window', async () => {
      const { error } = await userB.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 20,
        occurred_on: '2026-01-10',
        created_by: userB.id,
      })
      expect(error).toBeNull()
    })

    it('rejects an entry with occurred_on outside the challenge window', async () => {
      const { error } = await userA.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 10,
        occurred_on: '2026-02-15',
        created_by: userA.id,
      })
      expect(error).not.toBeNull()
    })

    it('lets any workspace member read entries', async () => {
      const { data, error } = await userA.client
        .from('challenge_entries')
        .select('amount')
        .eq('challenge_id', challengeId)
      expect(error).toBeNull()
      expect(data!.length).toBe(1)
    })

    it('blocks a non-member from inserting an entry', async () => {
      const outsider = await setUpUser('challenges-entry-outsider')
      const { error } = await outsider.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 5,
        occurred_on: '2026-01-15',
        created_by: outsider.id,
      })
      expect(error).not.toBeNull()
      await deleteTestUser(outsider.id)
    })
  })
})
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run tests/integration/financial-challenges.rls.test.ts`
Expected: PASS, all cases. Requires the local Supabase stack running with Task 1's migration applied.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/financial-challenges.rls.test.ts
git commit -m "test: add RLS integration coverage for financial challenges"
```

---

### Task 5: Server actions

**Files:**
- Create: `lib/challenges/actions.ts`

**Interfaces:**
- Consumes: `MetricType` from `@/lib/challenges/summary` (Task 2); `createClient` from `@/lib/supabase/server` (existing).
- Produces: `createChallenge`, `updateChallenge`, `abandonChallenge`, `addChallengeEntry` — all `async function`, all `'use server'`. Task 6/7 (UI) call these directly.

- [ ] **Step 1: Write the implementation**

```ts
'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MetricType } from './summary'

const VALID_METRIC_TYPES: MetricType[] = ['spending_limit', 'savings_target', 'category_reduction', 'no_spend_streak']

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

function assertValidChallenge(name: string, targetValue: number, metricType: MetricType, startDate: string, endDate: string, baselineValue: number | null) {
  if (!name.trim()) throw new Error('name_required')
  if (!(targetValue > 0)) throw new Error('target_invalid')
  if (!VALID_METRIC_TYPES.includes(metricType)) throw new Error('metric_type_invalid')
  if (!(endDate > startDate)) throw new Error('date_range_invalid')
  if (metricType === 'category_reduction' && (baselineValue === null || baselineValue < 0)) {
    throw new Error('baseline_required')
  }
}

export async function createChallenge(input: {
  workspaceId: string
  ownerUserId: string | null
  templateId: string | null
  name: string
  metricType: MetricType
  targetValue: number
  categoryId: string | null
  baselineValue: number | null
  startDate: string
  endDate: string
}) {
  const { supabase, user } = await requireUser()
  assertValidChallenge(input.name, input.targetValue, input.metricType, input.startDate, input.endDate, input.baselineValue)

  const { error } = await supabase.from('financial_challenges').insert({
    workspace_id: input.workspaceId,
    owner_user_id: input.ownerUserId,
    created_by: user.id,
    template_id: input.templateId,
    name: input.name.trim(),
    metric_type: input.metricType,
    target_value: input.targetValue,
    category_id: input.categoryId,
    baseline_value: input.metricType === 'category_reduction' ? input.baselineValue : null,
    start_date: input.startDate,
    end_date: input.endDate,
  })
  if (error) throw error

  refresh()
}

export async function updateChallenge(input: {
  id: string
  name: string
  metricType: MetricType
  targetValue: number
  startDate: string
  endDate: string
  baselineValue: number | null
}) {
  const { supabase } = await requireUser()
  assertValidChallenge(input.name, input.targetValue, input.metricType, input.startDate, input.endDate, input.baselineValue)

  const { error } = await supabase
    .from('financial_challenges')
    .update({
      name: input.name.trim(),
      target_value: input.targetValue,
      start_date: input.startDate,
      end_date: input.endDate,
      baseline_value: input.metricType === 'category_reduction' ? input.baselineValue : null,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function abandonChallenge(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('financial_challenges').update({ status: 'abandoned' }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function addChallengeEntry(input: {
  challengeId: string
  amount: number
  occurredOn: string
  note: string | null
}) {
  const { supabase, user } = await requireUser()
  if (!(input.amount > 0)) throw new Error('amount_invalid')

  const { error } = await supabase.from('challenge_entries').insert({
    challenge_id: input.challengeId,
    amount: input.amount,
    occurred_on: input.occurredOn,
    note: input.note,
    created_by: user.id,
  })
  if (error) throw error

  refresh()
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/challenges/actions.ts
git commit -m "feat: add server actions for financial challenges"
```

---

### Task 6: List page — catalog, active/completed/failed/abandoned challenges, create dialog

**Files:**
- Create: `components/challenges/challenge-card.tsx`
- Create: `components/challenges/create-challenge-dialog.tsx`
- Modify: `app/(dashboard)/challenges/page.tsx` (replace the `ComingSoon` stub)

**Interfaces:**
- Consumes: `ChallengeSummary` type from `@/lib/challenges/summary` (Task 2); `getChallengeTemplates`, `getWorkspaceMemberOptions`, `listChallengeSummaries`, `ChallengeTemplateRow` from `@/lib/challenges/queries` (Task 3); `createChallenge` from `@/lib/challenges/actions` (Task 5); `getIncomeSourceTypes`/`getExpenseCategories` — only `getExpenseCategories` and its `LookupOption` type from `@/lib/finance/queries` (existing); `createClient` from `@/lib/supabase/server`, `getUserWorkspaces` from `@/lib/workspaces/queries`, `getActiveWorkspaceId` from `@/lib/workspaces/active-workspace` (all existing, same pattern as `app/(dashboard)/budget/page.tsx`).
- Produces: `export function ChallengeCard(props: { summary: ChallengeSummary }): JSX.Element`, `export function CreateChallengeDialog(props: { workspaceId: string; templates: ChallengeTemplateRow[]; categories: LookupOption[]; members: { userId: string; label: string }[] }): JSX.Element`.

- [ ] **Step 1: Write `challenge-card.tsx`**

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import type { ChallengeSummary } from '@/lib/challenges/summary'

const STATUS_LABEL: Record<ChallengeSummary['status'], string> = {
  active: 'Ativo',
  completed: 'Concluído',
  failed: 'Falhado',
  abandoned: 'Abandonado',
}

const STATUS_COLOR: Record<ChallengeSummary['status'], string> = {
  active: 'text-primary-strong',
  completed: 'text-primary-strong',
  failed: 'text-danger',
  abandoned: 'text-muted',
}

export function ChallengeCard({ summary }: { summary: ChallengeSummary }) {
  return (
    <Link href={`/challenges/${summary.id}`}>
      <Card className="flex flex-col gap-3 p-5 transition-colors hover:bg-surface-sunken">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-base font-medium text-ink">{summary.name}</p>
          <span className={`text-xs font-semibold ${STATUS_COLOR[summary.status]}`}>{STATUS_LABEL[summary.status]}</span>
        </div>
        <p className="text-xs text-muted">{summary.ownerLabel}</p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${summary.percentComplete}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{summary.percentComplete}% do caminho</span>
          {summary.status === 'active' && <span>{summary.daysRemaining} dias restantes</span>}
        </div>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Write `create-challenge-dialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createChallenge } from '@/lib/challenges/actions'
import type { MetricType } from '@/lib/challenges/summary'
import type { ChallengeTemplateRow } from '@/lib/challenges/queries'
import type { LookupOption } from '@/lib/finance/queries'

const METRIC_LABELS: Record<MetricType, string> = {
  spending_limit: 'Limite de gastos',
  savings_target: 'Meta de poupança',
  category_reduction: 'Reduzir uma categoria',
  no_spend_streak: 'Sequência sem gastos',
}

export function CreateChallengeDialog({
  workspaceId,
  templates,
  categories,
  members,
}: {
  workspaceId: string
  templates: ChallengeTemplateRow[]
  categories: LookupOption[]
  members: { userId: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [metricType, setMetricType] = useState<MetricType>('spending_limit')
  const [targetValue, setTargetValue] = useState('')
  const [baselineValue, setBaselineValue] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [ownerUserId, setOwnerUserId] = useState<string>('family')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function applyTemplate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (template) setMetricType(template.metric_type)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = Number.parseFloat(targetValue)
    if (!name.trim()) {
      setError('Indica um nome.')
      return
    }
    if (!(parsedTarget > 0)) {
      setError('Indica um valor alvo superior a zero.')
      return
    }
    if (!startDate || !endDate || endDate <= startDate) {
      setError('Indica um período válido (data de fim depois da data de início).')
      return
    }
    const parsedBaseline = baselineValue.trim() === '' ? null : Number.parseFloat(baselineValue)
    if (metricType === 'category_reduction' && (parsedBaseline === null || !(parsedBaseline >= 0))) {
      setError('Indica o valor de referência do período anterior.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await createChallenge({
          workspaceId,
          ownerUserId: ownerUserId === 'family' ? null : ownerUserId,
          templateId: null,
          name: name.trim(),
          metricType,
          targetValue: parsedTarget,
          categoryId: categoryId || null,
          baselineValue: parsedBaseline,
          startDate,
          endDate,
        })
        setOpen(false)
        setName('')
        setTargetValue('')
        setBaselineValue('')
        setStartDate('')
        setEndDate('')
      } catch {
        setError('Não foi possível criar o desafio. Tenta novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">Criar desafio</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Novo desafio</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-template">Modelo (opcional)</Label>
                <select
                  id="challenge-template"
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Personalizado</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-name">Nome</Label>
              <Input id="challenge-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-metric">Tipo</Label>
              <select
                id="challenge-metric"
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as MetricType)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {Object.entries(METRIC_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-target">Valor alvo (€)</Label>
              <Input
                id="challenge-target"
                type="number"
                min="0.01"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            {metricType === 'category_reduction' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-baseline">Gasto no período anterior (€)</Label>
                <Input
                  id="challenge-baseline"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                />
              </div>
            )}

            {categories.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-category">Categoria (opcional)</Label>
                <select
                  id="challenge-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {members.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-owner">Quem participa</Label>
                <select
                  id="challenge-owner"
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="family">Toda a família</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      Só {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-start">Início</Label>
                <Input id="challenge-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-end">Fim</Label>
                <Input id="challenge-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={isPending} className="mt-2">
              Criar desafio
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 3: Replace `app/(dashboard)/challenges/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { getExpenseCategories } from '@/lib/finance/queries'
import {
  getChallengeTemplates,
  getWorkspaceMemberOptions,
  listChallengeSummaries,
} from '@/lib/challenges/queries'
import { ChallengeCard } from '@/components/challenges/challenge-card'
import { CreateChallengeDialog } from '@/components/challenges/create-challenge-dialog'
import { Card } from '@/components/ui/card'
import type { ChallengeSummary } from '@/lib/challenges/summary'

function groupByStatus(summaries: ChallengeSummary[]) {
  return {
    active: summaries.filter((s) => s.status === 'active'),
    completed: summaries.filter((s) => s.status === 'completed'),
    failed: summaries.filter((s) => s.status === 'failed'),
    abandoned: summaries.filter((s) => s.status === 'abandoned'),
  }
}

export default async function ChallengesPage() {
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const workspaceId = await getActiveWorkspaceId(workspaces)

  if (!workspaceId) {
    return null
  }

  const [templates, categories, members, summaries] = await Promise.all([
    getChallengeTemplates(supabase),
    getExpenseCategories(supabase),
    getWorkspaceMemberOptions(supabase, workspaceId),
    listChallengeSummaries(supabase, workspaceId),
  ])

  const grouped = groupByStatus(summaries)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Desafios financeiros</h1>
          <p className="mt-1 text-muted">Metas com prazo, a solo ou em família.</p>
        </div>
        <CreateChallengeDialog workspaceId={workspaceId} templates={templates} categories={categories} members={members} />
      </div>

      {summaries.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <h2 className="font-display text-lg font-medium">Ainda não tem desafios ativos</h2>
          <p className="text-sm text-muted">Crie o primeiro desafio para começar a acompanhar o seu progresso.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Ativos</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.active.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.completed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Concluídos</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.completed.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.failed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Falhados</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.failed.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.abandoned.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Abandonados</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.abandoned.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 5: Commit**

```bash
git add components/challenges/challenge-card.tsx components/challenges/create-challenge-dialog.tsx "app/(dashboard)/challenges/page.tsx"
git commit -m "feat: add financial challenges list page and create dialog"
```

---

### Task 7: Detail page — progress, entries, abandon/edit

**Files:**
- Create: `components/challenges/add-entry-dialog.tsx`
- Create: `components/challenges/edit-challenge-dialog.tsx`
- Create: `app/(dashboard)/challenges/[id]/page.tsx`
- Create: `app/(dashboard)/challenges/[id]/challenge-detail-client.tsx`

**Interfaces:**
- Consumes: `getChallengeSummaryById` from `@/lib/challenges/queries` (Task 3); `addChallengeEntry`, `abandonChallenge`, `updateChallenge` from `@/lib/challenges/actions` (Task 5); `ChallengeSummary` from `@/lib/challenges/summary` (Task 2).
- Produces: `export function AddEntryDialog(props: { challengeId: string; startDate: string; endDate: string; metricType: MetricType }): JSX.Element`, `export function EditChallengeDialog(props: { summary: ChallengeSummary }): JSX.Element`. The other two files are page-level, not imported elsewhere.

- [ ] **Step 1: Write `add-entry-dialog.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addChallengeEntry } from '@/lib/challenges/actions'
import type { MetricType } from '@/lib/challenges/summary'

const AMOUNT_LABEL: Record<MetricType, string> = {
  spending_limit: 'Valor gasto (€)',
  savings_target: 'Valor poupado (€)',
  category_reduction: 'Valor gasto (€)',
  no_spend_streak: 'Valor gasto (€)',
}

export function AddEntryDialog({
  challengeId,
  startDate,
  endDate,
  metricType,
}: {
  challengeId: string
  startDate: string
  endDate: string
  metricType: MetricType
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (!(parsedAmount > 0)) {
      setError('Indica um valor superior a zero.')
      return
    }
    if (!occurredOn) {
      setError('Indica uma data.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await addChallengeEntry({
          challengeId,
          amount: parsedAmount,
          occurredOn,
          note: note.trim() || null,
        })
        setOpen(false)
        setAmount('')
        setOccurredOn('')
        setNote('')
      } catch {
        setError('Não foi possível registar. Confirme que a data está dentro do período do desafio.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">Registar entrada</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Nova entrada</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-amount">{AMOUNT_LABEL[metricType]}</Label>
              <Input
                id="entry-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-date">Data</Label>
              <Input
                id="entry-date"
                type="date"
                min={startDate}
                max={endDate}
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-note">Nota (opcional)</Label>
              <Input id="entry-note" value={note} onChange={(e) => setNote(e.target.value)} />
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

- [ ] **Step 2: Write `challenge-detail-client.tsx`**

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { abandonChallenge } from '@/lib/challenges/actions'

export function AbandonButton({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await abandonChallenge(challengeId)
          router.refresh()
        })
      }
    >
      Abandonar desafio
    </Button>
  )
}
```

- [ ] **Step 3: Write `app/(dashboard)/challenges/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChallengeSummaryById } from '@/lib/challenges/queries'
import { formatCurrency } from '@/lib/finance/cadence'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddEntryDialog } from '@/components/challenges/add-entry-dialog'
import { AbandonButton } from './challenge-detail-client'

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  failed: 'Falhado',
  abandoned: 'Abandonado',
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const summary = await getChallengeSummaryById(supabase, id)

  if (!summary) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">{summary.ownerLabel}</p>
        <h1 className="font-display text-2xl font-medium tracking-tight">{summary.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-3 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.percentComplete}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>{summary.percentComplete}% do caminho</span>
            <span>{STATUS_LABEL[summary.status]}</span>
            {summary.status === 'active' && <span>{summary.daysRemaining} dias restantes</span>}
          </div>
          {summary.categoryLabel && <p className="text-sm text-muted">Categoria: {summary.categoryLabel}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Entradas</CardTitle>
          {summary.status === 'active' && (
            <AddEntryDialog challengeId={summary.id} startDate={summary.startDate} endDate={summary.endDate} metricType={summary.metricType} />
          )}
        </CardHeader>
        <CardContent>
          {summary.recentEntries.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há entradas registadas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.recentEntries.map((entry, index) => (
                <li key={index} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{entry.occurredOn}{entry.note ? ` — ${entry.note}` : ''}</span>
                  <span className="font-medium text-ink">{formatCurrency(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary.status === 'active' && (
        <div>
          <AbandonButton challengeId={summary.id} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write `edit-challenge-dialog.tsx`**

Per the spec's "fácil gestão" requirement, the creator can edit a challenge's name/target/dates/baseline while it's still `active` — this dialog is the UI for the `updateChallenge` action from Task 5 (which otherwise has no caller).

**File:** `components/challenges/edit-challenge-dialog.tsx` (new)

```tsx
'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateChallenge } from '@/lib/challenges/actions'
import type { ChallengeSummary } from '@/lib/challenges/summary'

export function EditChallengeDialog({ summary }: { summary: ChallengeSummary }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(summary.name)
  const [targetValue, setTargetValue] = useState(String(summary.targetValue))
  const [baselineValue, setBaselineValue] = useState(summary.baselineValue !== null ? String(summary.baselineValue) : '')
  const [startDate, setStartDate] = useState(summary.startDate)
  const [endDate, setEndDate] = useState(summary.endDate)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = Number.parseFloat(targetValue)
    if (!name.trim()) {
      setError('Indica um nome.')
      return
    }
    if (!(parsedTarget > 0)) {
      setError('Indica um valor alvo superior a zero.')
      return
    }
    if (!(endDate > startDate)) {
      setError('A data de fim tem de ser depois da data de início.')
      return
    }
    const parsedBaseline = baselineValue.trim() === '' ? null : Number.parseFloat(baselineValue)
    if (summary.metricType === 'category_reduction' && (parsedBaseline === null || !(parsedBaseline >= 0))) {
      setError('Indica o valor de referência do período anterior.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await updateChallenge({
          id: summary.id,
          name: name.trim(),
          metricType: summary.metricType,
          targetValue: parsedTarget,
          startDate,
          endDate,
          baselineValue: parsedBaseline,
        })
        setOpen(false)
      } catch {
        setError('Não foi possível guardar. Tenta novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Editar desafio</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-target">Valor alvo (€)</Label>
              <Input
                id="edit-target"
                type="number"
                min="0.01"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            {summary.metricType === 'category_reduction' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-baseline">Gasto no período anterior (€)</Label>
                <Input
                  id="edit-baseline"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-start">Início</Label>
                <Input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-end">Fim</Label>
                <Input id="edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
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

Then, in `app/(dashboard)/challenges/[id]/page.tsx` (Step 3 above), import `EditChallengeDialog` from `@/components/challenges/edit-challenge-dialog` and render it next to `AbandonButton` in the final `{summary.status === 'active' && (...)}` block:

```tsx
      {summary.status === 'active' && (
        <div className="flex items-center gap-3">
          <EditChallengeDialog summary={summary} />
          <AbandonButton challengeId={summary.id} />
        </div>
      )}
```

(This replaces the single-button block shown in Step 3 — same condition, now two buttons side by side.)

- [ ] **Step 5: Verify types and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both clean.

- [ ] **Step 6: Run the full unit and integration test suites**

Run: `npx vitest run tests/unit/ tests/integration/financial-challenges.rls.test.ts`
Expected: all pass.

- [ ] **Step 7: Manual verification**

Start the dev server if not already running, sign up or log in, navigate to `/challenges`. Confirm: create dialog works for all 4 metric types (category_reduction requires the baseline field); the list groups by status; clicking a card opens the detail page; registering an entry inside the challenge's date range succeeds and updates the progress bar; registering one outside the range fails with a clear error; abandoning a challenge moves it to the "Abandonados" group; no console errors.

- [ ] **Step 8: Commit**

```bash
git add components/challenges/add-entry-dialog.tsx components/challenges/edit-challenge-dialog.tsx "app/(dashboard)/challenges/[id]/page.tsx" "app/(dashboard)/challenges/[id]/challenge-detail-client.tsx"
git commit -m "feat: add financial challenge detail page with entry logging, edit, and abandon"
```
