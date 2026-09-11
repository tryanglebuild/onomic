'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { INVESTMENT_EXPERIENCE_OPTIONS, type InvestmentExperience } from '@/lib/onboarding/steps'
import { saveInvestmentExperienceStep } from '@/app/onboarding/actions'

export function InvestmentExperienceStep({
  initialExperience,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialExperience: InvestmentExperience | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<InvestmentExperience | null>(initialExperience)
  const [isPending, startTransition] = useTransition()

  function toggle(value: InvestmentExperience) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">Qual a tua experiência a investir?</h1>
        <p className="text-base text-muted">Sem julgamentos — ajuda-nos a explicar as coisas ao teu ritmo.</p>
      </div>

      <div className="flex flex-col gap-3">
        {INVESTMENT_EXPERIENCE_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
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
                await saveInvestmentExperienceStep(selected)
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
