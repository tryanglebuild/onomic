'use client'

import { useState, useTransition } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionButton } from '../option-button'
import { ASSET_PREFERENCE_OPTIONS, type AssetPreference } from '@/lib/onboarding/steps'
import { saveAssetPreferencesStep, skipOnboarding } from '@/app/onboarding/actions'

export function AssetPreferencesStep({
  initialPreferences,
  onAdvance,
  onBack,
}: {
  initialPreferences: AssetPreference[]
  onAdvance: () => void
  onBack: () => void
}) {
  const [selected, setSelected] = useState<AssetPreference[]>(initialPreferences)
  const [isPending, startTransition] = useTransition()

  function toggle(value: AssetPreference) {
    setSelected((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Layers className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Que tipos de ativo te interessam?</h1>
          <p className="mt-1 text-sm text-muted">Podes escolher mais do que uma opção.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ASSET_PREFERENCE_OPTIONS.map((option) => (
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
                await saveAssetPreferencesStep(selected)
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
