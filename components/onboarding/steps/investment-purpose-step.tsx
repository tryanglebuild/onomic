'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_PURPOSE_OPTIONS, type InvestmentPurpose } from '@/lib/onboarding/steps'
import { saveInvestmentPurposeStep } from '@/app/onboarding/actions'

export function InvestmentPurposeStep({
  initialPurposes,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialPurposes: InvestmentPurpose[]
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentPurpose[]>(initialPurposes)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentPurpose) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">Para que estás a investir?</h1>
        <p className="text-base text-muted">Podes escolher mais do que uma opção.</p>
      </div>

      <div className="flex flex-col gap-3">
        {INVESTMENT_PURPOSE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
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
                await saveInvestmentPurposeStep(selected)
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
