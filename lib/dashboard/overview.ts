import { toMonthlyAmount, type Cadence } from '@/lib/finance/cadence'
import type { LookupOption } from '@/lib/finance/queries'
import {
  HORIZON_POINTS,
  EXPERIENCE_POINTS,
  LOSS_REACTION_POINTS,
  HORIZON_MAX,
  EXPERIENCE_MAX,
  LOSS_REACTION_MAX,
} from '@/lib/onboarding/risk-scoring'
import type { InvestmentHorizon, InvestmentExperience, LossReaction } from '@/lib/onboarding/steps'

export type CategoryTotal = { label: string; value: number }

export function groupMonthlyTotals<T extends { active: boolean; amount: number; cadence: Cadence }>(
  items: T[],
  lookupIdOf: (item: T) => string,
  lookupOptions: LookupOption[]
): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    if (!item.active) continue
    const id = lookupIdOf(item)
    const monthly = toMonthlyAmount(item.amount, item.cadence)
    totals.set(id, Math.round(((totals.get(id) ?? 0) + monthly) * 100) / 100)
  }
  return lookupOptions
    .map((option) => ({ label: option.label, value: totals.get(option.id) ?? 0 }))
    .filter((entry) => entry.value > 0)
}

export function sumActiveMonthly<T extends { active: boolean; amount: number; cadence: Cadence }>(items: T[]): number {
  return Math.round(
    items.filter((item) => item.active).reduce((sum, item) => sum + toMonthlyAmount(item.amount, item.cadence), 0) * 100
  ) / 100
}

export type ProjectedBalancePoint = { month: string; balance: number }

export function buildProjectedBalanceSeries(monthlyNet: number, months = 6): ProjectedBalancePoint[] {
  const formatter = new Intl.DateTimeFormat('pt-PT', { month: 'short' })
  const base = new Date()
  const points: ProjectedBalancePoint[] = []
  let cumulative = 0
  for (let i = 1; i <= months; i++) {
    cumulative = Math.round((cumulative + monthlyNet) * 100) / 100
    const monthDate = new Date(base.getFullYear(), base.getMonth() + i, 1)
    points.push({ month: formatter.format(monthDate), balance: cumulative })
  }
  return points
}

export type RiskRadarPoint = { axis: string; value: number }

export function buildRiskRadarData(
  horizon: InvestmentHorizon | null,
  experience: InvestmentExperience | null,
  lossReaction: LossReaction | null
): RiskRadarPoint[] | null {
  if (horizon === null || experience === null || lossReaction === null) return null

  return [
    { axis: 'Horizonte', value: Math.round((HORIZON_POINTS[horizon] / HORIZON_MAX) * 100) },
    { axis: 'Experiência', value: Math.round((EXPERIENCE_POINTS[experience] / EXPERIENCE_MAX) * 100) },
    { axis: 'Reação a perdas', value: Math.round((LOSS_REACTION_POINTS[lossReaction] / LOSS_REACTION_MAX) * 100) },
  ]
}

export type PendingAction = { label: string; href: string }

export function buildPendingActions(input: {
  onboardingCompleted: boolean
  hasIncome: boolean
  hasExpenses: boolean
  pendingInviteCount: number
  isFamilyWorkspace: boolean
}): PendingAction[] {
  const actions: PendingAction[] = []

  if (!input.onboardingCompleted) {
    actions.push({ label: 'Complete o seu perfil de investidor', href: '/dashboard?onboarding=1' })
  }
  if (!input.hasIncome) {
    actions.push({ label: 'Configure o seu rendimento', href: '/budget' })
  }
  if (!input.hasExpenses) {
    actions.push({ label: 'Configure os seus gastos fixos', href: '/budget' })
  }
  if (input.isFamilyWorkspace && input.pendingInviteCount > 0) {
    actions.push({
      label: `${input.pendingInviteCount} convite${input.pendingInviteCount === 1 ? '' : 's'} de família pendente${
        input.pendingInviteCount === 1 ? '' : 's'
      }`,
      href: '/settings/family',
    })
  }

  return actions
}
