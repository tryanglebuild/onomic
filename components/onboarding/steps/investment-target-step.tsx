'use client'

import { useState, useTransition } from 'react'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionButton } from '../option-button'
import { INVESTMENT_FREQUENCY_OPTIONS, type InvestmentFrequency } from '@/lib/onboarding/steps'
import { saveInvestmentTargetStep, skipOnboarding } from '@/app/onboarding/actions'

export function InvestmentTargetStep({
  initialAmount,
  initialFrequency,
  onAdvance,
  onBack,
}: {
  initialAmount: number | null
  initialFrequency: InvestmentFrequency | null
  onAdvance: () => void
  onBack: () => void
}) {
  const [amount, setAmount] = useState(initialAmount !== null ? String(initialAmount) : '')
  const [frequency, setFrequency] = useState<InvestmentFrequency | null>(initialFrequency)
  const [isPending, startTransition] = useTransition()

  const parsedAmount = amount.trim() === '' ? null : Number(amount)
  const hasValidAmount = parsedAmount !== null && parsedAmount > 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <TrendingUp className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Tens uma meta de investimento?</h1>
          <p className="mt-1 text-sm text-muted">
            Deixa em branco se ainda não investes, mas queres começar — também é uma resposta válida.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="investment_target_amount">Valor</Label>
        <Input
          id="investment_target_amount"
          type="number"
          min={0}
          step="0.01"
          placeholder="Ex.: 300"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      {hasValidAmount && (
        <div className="flex flex-col gap-2">
          <Label>Frequência</Label>
          {INVESTMENT_FREQUENCY_OPTIONS.map((option) => (
            <OptionButton
              key={option.value}
              label={option.label}
              selected={frequency === option.value}
              onClick={() => setFrequency(option.value)}
            />
          ))}
        </div>
      )}

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
                await saveInvestmentTargetStep(hasValidAmount ? parsedAmount : null, frequency)
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
