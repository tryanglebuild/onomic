'use client'

import { useState, useTransition } from 'react'
import { StepIndicator } from './step-indicator'
import { GoalsStep } from './steps/goals-step'
import { InvestmentHorizonStep } from './steps/investment-horizon-step'
import { InvestmentExperienceStep } from './steps/investment-experience-step'
import { LossReactionStep } from './steps/loss-reaction-step'
import { InvestmentPurposeStep } from './steps/investment-purpose-step'
import { InvestmentTargetStep } from './steps/investment-target-step'
import { AssetPreferencesStep } from './steps/asset-preferences-step'
import { SummaryStep } from './steps/summary-step'
import { goToOnboardingStep } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingFlow({
  profile,
  onClose,
}: {
  profile: OnboardingProfile
  onClose: () => void
}) {
  const [step, setStep] = useState(profile.current_step)
  const [, startBackTransition] = useTransition()

  // Going back also has to persist `current_step`, same as advancing does —
  // otherwise resuming later (e.g. via the navbar badge) lands the user on
  // whatever step they were on before they clicked "Voltar", not the step
  // they actually left from.
  function goBack(n: number) {
    setStep(n)
    startBackTransition(() => goToOnboardingStep(n))
  }

  // "Completar mais tarde" needs no server round-trip in v2 — there's no
  // skipped_at column anymore, current_step already reflects wherever the
  // user last landed, and closing the modal is a purely client-side act.
  function skip() {
    onClose()
  }

  return (
    <div>
      <StepIndicator currentStep={step} />
      {step === 1 && (
        <GoalsStep initialGoals={profile.primary_goals} onAdvance={() => setStep(2)} onSkip={skip} />
      )}
      {step === 2 && (
        <InvestmentHorizonStep
          initialHorizon={profile.investment_horizon}
          onAdvance={() => setStep(3)}
          onBack={() => goBack(1)}
          onSkip={skip}
        />
      )}
      {step === 3 && (
        <InvestmentExperienceStep
          initialExperience={profile.investment_experience}
          onAdvance={() => setStep(4)}
          onBack={() => goBack(2)}
          onSkip={skip}
        />
      )}
      {step === 4 && (
        <LossReactionStep
          initialReaction={profile.loss_reaction}
          onAdvance={() => setStep(5)}
          onBack={() => goBack(3)}
          onSkip={skip}
        />
      )}
      {step === 5 && (
        <InvestmentPurposeStep
          initialPurposes={profile.investment_purpose}
          onAdvance={() => setStep(6)}
          onBack={() => goBack(4)}
          onSkip={skip}
        />
      )}
      {step === 6 && (
        <InvestmentTargetStep
          initialAmount={profile.investment_target_amount}
          initialFrequency={profile.investment_target_frequency}
          onAdvance={() => setStep(7)}
          onBack={() => goBack(5)}
          onSkip={skip}
        />
      )}
      {step === 7 && (
        <AssetPreferencesStep
          initialPreferences={profile.asset_preferences}
          onAdvance={() => setStep(8)}
          onBack={() => goBack(6)}
          onSkip={skip}
        />
      )}
      {step === 8 && <SummaryStep profile={profile} onBack={() => goBack(7)} onComplete={onClose} />}
    </div>
  )
}
