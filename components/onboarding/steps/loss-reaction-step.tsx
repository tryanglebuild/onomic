'use client'

import { useState, useTransition } from 'react'
import { TrendingDown } from 'lucide-react'
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <TrendingDown className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Se o teu investimento caísse 20%, o que farias?</h1>
          <p className="mt-1 text-sm text-muted">Não há resposta certa — só queremos perceber a tua reação real.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
