'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { PRIMARY_GOAL_OPTIONS, type PrimaryGoal } from '@/lib/onboarding/steps'
import { saveGoalsStep } from '@/app/onboarding/actions'

export function GoalsStep({
  initialGoals,
  onAdvance,
  onSkip,
}: {
  initialGoals: PrimaryGoal[]
  onAdvance: () => void
  onSkip: () => void
}) {
  const [selected, setSelected] = useState<PrimaryGoal[]>(initialGoals)
  const [isPending, startTransition] = useTransition()

  function toggle(goal: PrimaryGoal) {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">O que procuras na Onomic?</h1>
        <p className="text-base text-muted">Podes escolher mais do que uma opção.</p>
      </div>

      <div className="flex flex-col gap-3">
        {PRIMARY_GOAL_OPTIONS.map((option) => (
          <OptionButton
            key={option.value}
            label={option.label}
            selected={selected.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onSkip} className="text-sm text-muted hover:text-ink">
          Completar mais tarde
        </button>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await saveGoalsStep(selected)
              onAdvance()
            })
          }
        >
          Seguinte
        </Button>
      </div>
    </div>
  )
}
