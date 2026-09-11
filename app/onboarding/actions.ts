'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { refresh } from 'next/cache'
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

  refresh()
}

export async function saveInvestmentHorizonStep(horizon: InvestmentHorizon | null) {
  const { supabase, user } = await requireUser()
  const clean = horizon && VALID_HORIZONS.includes(horizon) ? horizon : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_horizon: clean, current_step: 3 })
    .eq('id', user.id)
  if (error) throw error

  refresh()
}

export async function saveInvestmentExperienceStep(experience: InvestmentExperience | null) {
  const { supabase, user } = await requireUser()
  const clean = experience && VALID_EXPERIENCES.includes(experience) ? experience : null

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_experience: clean, current_step: 4 })
    .eq('id', user.id)
  if (error) throw error

  refresh()
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

  refresh()
}

export async function saveInvestmentPurposeStep(purposes: InvestmentPurpose[]) {
  const { supabase, user } = await requireUser()
  const clean = purposes.filter((p) => VALID_PURPOSES.includes(p))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ investment_purpose: clean, current_step: 6 })
    .eq('id', user.id)
  if (error) throw error

  refresh()
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

  refresh()
}

export async function saveAssetPreferencesStep(preferences: AssetPreference[]) {
  const { supabase, user } = await requireUser()
  const clean = preferences.filter((p) => VALID_ASSET_PREFERENCES.includes(p))

  const { error } = await supabase
    .from('onboarding_profiles')
    .update({ asset_preferences: clean, current_step: TOTAL_ONBOARDING_STEPS })
    .eq('id', user.id)
  if (error) throw error

  refresh()
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

  refresh()
}
