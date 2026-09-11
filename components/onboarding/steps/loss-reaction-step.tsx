'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { LOSS_REACTION_OPTIONS, type LossReaction } from '@/lib/onboarding/steps'
import { saveLossReactionStep } from '@/app/onboarding/actions'

export function LossReactionStep({
  initialReaction,
  onAdvance,
  onBack,
  onSkip,
}: {
  initialReaction: LossReaction | null
  onAdvance: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<LossReaction | null>(initialReaction)
  const [isPending, startTransition] = useTransition()

  function toggle(value: LossReaction) {
    setSelected((prev) => (prev === value ? null : value))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">Se o teu investimento caísse 20%, o que farias?</h1>
        <p className="text-base text-muted">Não há resposta certa — só queremos perceber a tua reação real.</p>
      </div>

      <div className="flex flex-col gap-3">
        {LOSS_REACTION_OPTIONS.map((option) => (
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
                await saveLossReactionStep(selected)
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
