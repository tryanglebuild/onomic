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
