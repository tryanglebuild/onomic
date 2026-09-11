'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PRIMARY_GOAL_OPTIONS,
  INVESTMENT_HORIZON_OPTIONS,
  INVESTMENT_EXPERIENCE_OPTIONS,
  LOSS_REACTION_OPTIONS,
  INVESTMENT_PURPOSE_OPTIONS,
  RISK_PROFILE_OPTIONS,
  ASSET_PREFERENCE_OPTIONS,
} from '@/lib/onboarding/steps'
import { completeOnboarding } from '@/app/onboarding/actions'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

function labelFor(value: string | null, options: { value: string; label: string }[]): string {
  return options.find((o) => o.value === value)?.label ?? 'Não respondido'
}

function labelsFor(values: string[], options: { value: string; label: string }[]): string {
  const labels = options.filter((o) => values.includes(o.value)).map((o) => o.label)
  return labels.length > 0 ? labels.join(', ') : 'Não respondido'
}

export function SummaryStep({
  profile,
  onBack,
  onComplete,
}: {
  profile: OnboardingProfile
  onBack: () => void
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const targetLabel =
    profile.investment_target_amount !== null
      ? `${profile.investment_target_amount}€ / ${profile.investment_target_frequency === 'quarterly' ? 'trimestre' : 'mês'}`
      : 'Não respondido'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <CheckCircle2 className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="font-display text-xl font-medium">Está quase</h1>
          <p className="mt-1 text-sm text-muted">Confirma o que respondeste — podes voltar atrás para mudar algo.</p>
        </div>
      </div>

      <dl className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Objetivo</dt>
          <dd className="text-right font-medium">{labelsFor(profile.primary_goals, PRIMARY_GOAL_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Horizonte temporal</dt>
          <dd className="text-right font-medium">{labelFor(profile.investment_horizon, INVESTMENT_HORIZON_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Experiência</dt>
          <dd className="text-right font-medium">{labelFor(profile.investment_experience, INVESTMENT_EXPERIENCE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Reação a uma queda</dt>
          <dd className="text-right font-medium">{labelFor(profile.loss_reaction, LOSS_REACTION_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Propósito</dt>
          <dd className="text-right font-medium">{labelsFor(profile.investment_purpose, INVESTMENT_PURPOSE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-border pt-3">
          <dt className="text-muted">O teu perfil</dt>
          <dd className="text-right font-medium">{labelFor(profile.risk_profile, RISK_PROFILE_OPTIONS)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Meta de investimento</dt>
          <dd className="text-right font-medium">{targetLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Preferência de ativos</dt>
          <dd className="text-right font-medium">{labelsFor(profile.asset_preferences, ASSET_PREFERENCE_OPTIONS)}</dd>
        </div>
      </dl>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm text-muted hover:text-ink">
          Voltar
        </button>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                setError(null)
                await completeOnboarding()
                onComplete()
              } catch {
                setError('Não foi possível guardar. Tenta novamente.')
              }
            })
          }
        >
          Concluir
        </Button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
