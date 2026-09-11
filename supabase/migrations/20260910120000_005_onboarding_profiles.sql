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
$$ language plpgsql set search_path = public;

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

-- Backfill: give every existing auth.users row (accounts that predate this
-- migration) a default onboarding_profiles row too, so they can see the
-- onboarding flow instead of being treated as "nothing to do" by
-- app/onboarding/page.tsx. Safe to re-run.
insert into onboarding_profiles (id)
select id from auth.users
on conflict (id) do nothing;
