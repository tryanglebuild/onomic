'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { RISK_PROFILE_OPTIONS, type RiskProfile } from '@/lib/onboarding/steps'
import { saveRiskProfileStep, skipOnboarding } from '@/app/onboarding/actions'

export function RiskProfileStep({
  initialRiskProfile,
  onAdvance,
  onBack,
}: {
  initialRiskProfile: RiskProfile | null
  onAdvance: () => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<RiskProfile | null>(initialRiskProfile)
  const [isPending, startTransition] = useTransition()

  // Clicking the already-selected option clears it back to null — the
  // field is nullable and "not sure yet" is a deliberately valid answer,
  // same as every other step. No separate "não sei" pill for this one;
  // toggle-to-clear is the whole affordance.
  function toggle(value: RiskProfile) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Como te descreves como investidor?</h1>
          <p className="mt-1 text-sm text-muted">
            Não tens de saber ao certo — clica outra vez numa opção para a desmarcar.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {RISK_PROFILE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            description={option.description}
            selected={selected === option.value}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => startTransition(() => skipOnboarding())}
            className="text-sm text-muted hover:text-ink"
          >
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveRiskProfileStep(selected)
                onAdvance()
              })
            }
          >
            Seguinte
          </Button>
        </div>
      </div>
    </div>
  )
}
