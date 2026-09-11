'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_HORIZON_OPTIONS, type InvestmentHorizon } from '@/lib/onboarding/steps'
import { saveInvestmentHorizonStep } from '@/app/onboarding/actions'

export function InvestmentHorizonStep({
  initialHorizon,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialHorizon: InvestmentHorizon | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentHorizon | null>(initialHorizon)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentHorizon) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">Por quanto tempo queres investir?</h1>
        <p className="text-base text-muted">Pensa em quando esperas precisar deste dinheiro de volta.</p>
      </div>

      <div className="flex flex-col gap-3">
        {INVESTMENT_HORIZON_OPTIONS.map((option) => (
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
          <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
            Completar mais tarde
          </button>
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await saveInvestmentHorizonStep(selected)
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
