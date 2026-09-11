import { redirect } from 'next/navigation'

// The dedicated onboarding page from v1 is gone — onboarding is a modal
// over /dashboard now (see components/onboarding/onboarding-modal.tsx).
// This route stays only so an old bookmarked/shared /onboarding link still
// does something sensible: re-trigger the auto-open on the dashboard.
export default function OnboardingPage() {
  redirect('/dashboard?onboarding=1')
}
