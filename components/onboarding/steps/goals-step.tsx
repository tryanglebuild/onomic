'use client'

import { useState, useTransition } from 'react'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { PRIMARY_GOAL_OPTIONS, type PrimaryGoal } from '@/lib/onboarding/steps'
import { saveGoalsStep, skipOnboarding } from '@/app/onboarding/actions'

export function GoalsStep({
  initialGoals,
  onAdvance,
}: {
  initialGoals: PrimaryGoal[]
  onAdvance: () => void
}) {
  const [selected, setSelected] = useState<PrimaryGoal[]>(initialGoals)
  const [isPending, startTransition] = useTransition()

  function toggle(goal: PrimaryGoal) {
    setSelected((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Compass className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">O que procuras na Onomic?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
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
