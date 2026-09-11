'use client'

import { useState, useTransition } from 'react'
import { Compass, GraduationCap, Hourglass, Layers, ShieldCheck, Target, TrendingDown, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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

function SummaryRow({
  icon: Icon,
  label,
  value,
  emphasize,
}: {
  icon: LucideIcon
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 px-5 py-4', emphasize && 'bg-primary-soft/40')}>
      <span className="flex items-center gap-2.5 text-muted">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </span>
      <span className="text-right font-medium text-ink">{value}</span>
    </div>
  )
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-medium">Está quase</h1>
        <p className="text-base text-muted">Confirma o que respondeste — podes voltar atrás para mudar algo.</p>
      </div>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
        <SummaryRow icon={Compass} label="Objetivo" value={labelsFor(profile.primary_goals, PRIMARY_GOAL_OPTIONS)} />
        <SummaryRow
          icon={Hourglass}
          label="Horizonte temporal"
          value={labelFor(profile.investment_horizon, INVESTMENT_HORIZON_OPTIONS)}
        />
        <SummaryRow
          icon={GraduationCap}
          label="Experiência"
          value={labelFor(profile.investment_experience, INVESTMENT_EXPERIENCE_OPTIONS)}
        />
        <SummaryRow
          icon={TrendingDown}
          label="Reação a uma queda"
          value={labelFor(profile.loss_reaction, LOSS_REACTION_OPTIONS)}
        />
        <SummaryRow
          icon={Target}
          label="Propósito"
          value={labelsFor(profile.investment_purpose, INVESTMENT_PURPOSE_OPTIONS)}
        />
        <SummaryRow
          icon={ShieldCheck}
          label="O teu perfil"
          value={labelFor(profile.risk_profile, RISK_PROFILE_OPTIONS)}
          emphasize
        />
        <SummaryRow icon={TrendingUp} label="Meta de investimento" value={targetLabel} />
        <SummaryRow
          icon={Layers}
          label="Preferência de ativos"
          value={labelsFor(profile.asset_preferences, ASSET_PREFERENCE_OPTIONS)}
        />
      </div>

      <div className="flex flex-col gap-2">
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
    </div>
  )
}
