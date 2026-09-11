-- Reconciles onboarding_profiles with the v2 schema in migration 005 for
-- any database where 005's ORIGINAL (v1) create table was already applied
-- by hand before 005 was edited in place for the v2 (modal) redesign. See
-- docs/project/feature/onboarding/feature-spec.md. Safe to re-run.

alter table onboarding_profiles drop column if exists skipped_at;

alter table onboarding_profiles
  add column if not exists investment_horizon text,
  add column if not exists investment_experience text,
  add column if not exists loss_reaction text,
  add column if not exists investment_purpose text[] not null default '{}';

alter table onboarding_profiles drop constraint if exists onboarding_profiles_current_step_range;
alter table onboarding_profiles add constraint onboarding_profiles_current_step_range
  check (current_step between 1 and 8);

alter table onboarding_profiles drop constraint if exists onboarding_profiles_horizon_valid;
alter table onboarding_profiles add constraint onboarding_profiles_horizon_valid
  check (investment_horizon is null or investment_horizon in ('short', 'medium', 'long'));

alter table onboarding_profiles drop constraint if exists onboarding_profiles_experience_valid;
alter table onboarding_profiles add constraint onboarding_profiles_experience_valid
  check (investment_experience is null or investment_experience in ('none', 'some', 'experienced'));

alter table onboarding_profiles drop constraint if exists onboarding_profiles_loss_reaction_valid;
alter table onboarding_profiles add constraint onboarding_profiles_loss_reaction_valid
  check (loss_reaction is null or loss_reaction in ('sell_all', 'sell_some', 'hold', 'buy_more'));

alter table onboarding_profiles drop constraint if exists onboarding_profiles_purpose_valid;
alter table onboarding_profiles add constraint onboarding_profiles_purpose_valid
  check (investment_purpose <@ array['retirement', 'home', 'grow_wealth', 'passive_income', 'other']::text[]);

alter table onboarding_profiles drop constraint if exists onboarding_profiles_risk_profile_valid;
alter table onboarding_profiles add constraint onboarding_profiles_risk_profile_valid
  check (risk_profile is null or risk_profile in ('conservative', 'moderate', 'aggressive'));
