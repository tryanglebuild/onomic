import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOnboardingProfile } from '@/lib/onboarding/queries'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getOnboardingProfile(supabase, user.id)

  if (!profile || profile.completed_at) {
    redirect('/dashboard')
  }

  return (
    <OnboardingShell>
      <OnboardingFlow profile={profile} />
    </OnboardingShell>
  )
}
