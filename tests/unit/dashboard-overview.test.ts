import { describe, expect, it } from 'vitest'
import {
  groupMonthlyTotals,
  sumActiveMonthly,
  buildProjectedBalanceSeries,
  buildRiskRadarData,
  buildPendingActions,
} from '@/lib/dashboard/overview'

describe('groupMonthlyTotals', () => {
  const lookups = [
    { id: 'cat-a', slug: 'a', label: 'Categoria A' },
    { id: 'cat-b', slug: 'b', label: 'Categoria B' },
  ]

  it('sums active items per lookup id, normalized to monthly', () => {
    const items = [
      { active: true, amount: 100, cadence: 'mensal' as const, category_id: 'cat-a' },
      { active: true, amount: 1200, cadence: 'anual' as const, category_id: 'cat-a' },
      { active: true, amount: 50, cadence: 'semanal' as const, category_id: 'cat-b' },
    ]
    const result = groupMonthlyTotals(items, (i) => i.category_id, lookups)
    expect(result).toEqual([
      { label: 'Categoria A', value: 200 },
      { label: 'Categoria B', value: 217.4 },
    ])
  })

  it('excludes inactive items and lookups with zero total', () => {
    const items = [
      { active: false, amount: 999, cadence: 'mensal' as const, category_id: 'cat-a' },
      { active: true, amount: 10, cadence: 'mensal' as const, category_id: 'cat-b' },
    ]
    const result = groupMonthlyTotals(items, (i) => i.category_id, lookups)
    expect(result).toEqual([{ label: 'Categoria B', value: 10 }])
  })
})

describe('sumActiveMonthly', () => {
  it('sums only active items, normalized to monthly', () => {
    const items = [
      { active: true, amount: 100, cadence: 'mensal' as const },
      { active: false, amount: 500, cadence: 'mensal' as const },
      { active: true, amount: 1200, cadence: 'anual' as const },
    ]
    expect(sumActiveMonthly(items)).toBe(200)
  })

  it('returns 0 for an empty list', () => {
    expect(sumActiveMonthly([])).toBe(0)
  })
})

describe('buildProjectedBalanceSeries', () => {
  it('accumulates a constant monthly net over the requested number of months', () => {
    const result = buildProjectedBalanceSeries(100, 3)
    expect(result).toHaveLength(3)
    expect(result[0].balance).toBe(100)
    expect(result[1].balance).toBe(200)
    expect(result[2].balance).toBe(300)
  })

  it('defaults to 6 months', () => {
    expect(buildProjectedBalanceSeries(10)).toHaveLength(6)
  })

  it('handles a negative net', () => {
    const result = buildProjectedBalanceSeries(-50, 2)
    expect(result[0].balance).toBe(-50)
    expect(result[1].balance).toBe(-100)
  })
})

describe('buildRiskRadarData', () => {
  it('returns null when any input is null', () => {
    expect(buildRiskRadarData(null, 'some', 'hold')).toBeNull()
    expect(buildRiskRadarData('long', null, 'hold')).toBeNull()
    expect(buildRiskRadarData('long', 'some', null)).toBeNull()
  })

  it('normalizes each axis to a 0-100 percentage of its own max', () => {
    const result = buildRiskRadarData('long', 'experienced', 'buy_more')
    expect(result).toEqual([
      { axis: 'Horizonte', value: 100 },
      { axis: 'Experiência', value: 100 },
      { axis: 'Reação a perdas', value: 100 },
    ])
  })

  it('scores the lowest answers as 0', () => {
    const result = buildRiskRadarData('short', 'none', 'sell_all')
    expect(result).toEqual([
      { axis: 'Horizonte', value: 0 },
      { axis: 'Experiência', value: 0 },
      { axis: 'Reação a perdas', value: 0 },
    ])
  })
})

describe('buildPendingActions', () => {
  it('returns no actions when everything is complete and there are no pending invites', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 0,
      isFamilyWorkspace: true,
    })
    expect(result).toEqual([])
  })

  it('lists onboarding, income, and expenses actions when all are missing', () => {
    const result = buildPendingActions({
      onboardingCompleted: false,
      hasIncome: false,
      hasExpenses: false,
      pendingInviteCount: 0,
      isFamilyWorkspace: false,
    })
    expect(result).toEqual([
      { label: 'Complete o seu perfil de investidor', href: '/dashboard?onboarding=1' },
      { label: 'Configure o seu rendimento', href: '/budget' },
      { label: 'Configure os seus gastos fixos', href: '/budget' },
    ])
  })

  it('adds a pending-invites action only for family workspaces with pending invites', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 2,
      isFamilyWorkspace: true,
    })
    expect(result).toEqual([{ label: '2 convites de família pendentes', href: '/settings/family' }])
  })

  it('does not add a pending-invites action for a personal workspace', () => {
    const result = buildPendingActions({
      onboardingCompleted: true,
      hasIncome: true,
      hasExpenses: true,
      pendingInviteCount: 3,
      isFamilyWorkspace: false,
    })
    expect(result).toEqual([])
  })
})
