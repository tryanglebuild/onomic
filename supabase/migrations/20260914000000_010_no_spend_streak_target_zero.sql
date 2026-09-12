-- Migration 008 already shipped with `target_value > 0` for every challenge,
-- including no_spend_streak. A 0-day no-spend streak target is a real
-- (if trivial) goal a user can pick, so relax the constraint for that
-- metric type only; every other metric type keeps a strictly positive
-- target requirement.

alter table financial_challenges drop constraint financial_challenges_target_value_check;

alter table financial_challenges add constraint financial_challenges_target_value_valid
  check (
    (metric_type = 'no_spend_streak' and target_value >= 0)
    or (metric_type <> 'no_spend_streak' and target_value > 0)
  );

comment on constraint financial_challenges_target_value_valid on financial_challenges is 'no_spend_streak alone may target 0 days (a plausible, if trivial, streak goal); every other metric type requires a strictly positive target.';
