'use client'

import { useState, useTransition } from 'react'
import { Target } from 'lucide-react'
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Target className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Para que estás a investir?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
