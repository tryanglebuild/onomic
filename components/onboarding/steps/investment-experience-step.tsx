'use client'

import { useState, useTransition } from 'react'
import { GraduationCap } from 'lucide-react'
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Qual a tua experiência a investir?</h1>
          <p className="mt-1 text-sm text-muted">Sem julgamentos — ajuda-nos a explicar as coisas ao teu ritmo.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
