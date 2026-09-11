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
