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
grant delete on financial_challenges to authenticated, service_role;
grant select, insert on challenge_entries to authenticated, service_role;

create policy challenge_templates_select on challenge_templates
for select using (true);

create policy financial_challenges_select on financial_challenges
for select using (is_workspace_member(workspace_id));

create policy financial_challenges_insert on financial_challenges
for insert with check (is_workspace_member(workspace_id) and created_by = auth.uid());

create policy financial_challenges_update on financial_challenges
for update using (created_by = auth.uid()) with check (created_by = auth.uid() and is_workspace_member(workspace_id));

create policy financial_challenges_delete on financial_challenges
for delete using (created_by = auth.uid());

create policy challenge_entries_select on challenge_entries
for select using (
  exists (select 1 from financial_challenges c where c.id = challenge_entries.challenge_id and is_workspace_member(c.workspace_id))
);

create policy challenge_entries_insert on challenge_entries
for insert with check (
  created_by = auth.uid()
  and exists (select 1 from financial_challenges c where c.id = challenge_entries.challenge_id and is_workspace_member(c.workspace_id))
);

insert into challenge_templates (key, name, description, metric_type, default_params) values
  ('spending_limit_default', 'Limite de gastos', 'Define um limite de gastos numa categoria durante um período.', 'spending_limit', '{}'),
  ('savings_target_default', 'Meta de poupança', 'Poupa um valor específico até uma data.', 'savings_target', '{}'),
  ('category_reduction_default', 'Reduzir uma categoria', 'Gasta menos numa categoria do que gastaste no período anterior.', 'category_reduction', '{}'),
  ('no_spend_streak_default', 'Sequência sem gastos', 'Fica o máximo de dias seguidos sem gastar numa categoria.', 'no_spend_streak', '{}');
