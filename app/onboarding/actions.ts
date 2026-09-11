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
