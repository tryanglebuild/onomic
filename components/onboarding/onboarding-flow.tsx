'use client'

import { useState, useTransition } from 'react'
import { StepIndicator } from './step-indicator'
import { GoalsStep } from './steps/goals-step'
import { RiskProfileStep } from './steps/risk-profile-step'
import { InvestmentTargetStep } from './steps/investment-target-step'
import { AssetPreferencesStep } from './steps/asset-preferences-step'
import { SummaryStep } from './steps/summary-step'
import { goToOnboardingStep } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingFlow({ profile }: { profile: OnboardingProfile }) {
  // Local override so clicking "Voltar"/advancing feels instant — the
  // Server Action is still the source of truth for `current_step` on the
  // next full page load (e.g. after a refresh), this just avoids a round
  // trip's worth of visible lag on every step transition.
  const [step, setStep] = useState(profile.current_step)
  const [, startBackTransition] = useTransition()

  // Going back also has to persist `current_step`, same as advancing does —
  // otherwise resuming onboarding later (e.g. via the navbar badge) lands
  // the user back on whatever step they were on before they clicked "Voltar",
  // not the step they actually left from.
  function goBack(n: number) {
    setStep(n)
    startBackTransition(() => goToOnboardingStep(n))
  }

  return (
    <div>
      <StepIndicator currentStep={step} />
      {step === 1 && <GoalsStep initialGoals={profile.primary_goals} onAdvance={() => setStep(2)} />}
      {step === 2 && (
        <RiskProfileStep initialRiskProfile={profile.risk_profile} onAdvance={() => setStep(3)} onBack={() => goBack(1)} />
      )}
      {step === 3 && (
        <InvestmentTargetStep
          initialAmount={profile.investment_target_amount}
          initialFrequency={profile.investment_target_frequency}
          onAdvance={() => setStep(4)}
          onBack={() => goBack(2)}
        />
      )}
      {step === 4 && (
        <AssetPreferencesStep
          initialPreferences={profile.asset_preferences}
          onAdvance={() => setStep(5)}
          onBack={() => goBack(3)}
        />
      )}
      {step === 5 && <SummaryStep profile={profile} onBack={() => goBack(4)} />}
    </div>
  )
}
