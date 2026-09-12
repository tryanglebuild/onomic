import { describe, expect, it } from 'vitest'
import {
  computeCurrentValue,
  computePercentComplete,
  computeDaysRemaining,
  resolveEffectiveStatus,
  getChallengeSummary,
  type ChallengeInput,
  type ChallengeEntryInput,
} from '@/lib/challenges/summary'

function baseChallenge(overrides: Partial<ChallengeInput> = {}): ChallengeInput {
  return {
    id: 'c1',
    workspaceId: 'w1',
    ownerUserId: null,
    createdBy: 'u1',
    name: 'Test',
    metricType: 'spending_limit',
    targetValue: 100,
    baselineValue: null,
    categoryLabel: null,
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'active',
    ...overrides,
  }
}

describe('computeCurrentValue', () => {
  it('spending_limit sums entries in the challenge window', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit' })
    const entries: ChallengeEntryInput[] = [
      { amount: 30, occurredOn: '2026-01-05', note: null },
      { amount: 20, occurredOn: '2026-01-10', note: null },
    ]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(50)
  })

  it('savings_target sums entries the same way', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 500 })
    const entries: ChallengeEntryInput[] = [
      { amount: 200, occurredOn: '2026-01-05', note: null },
      { amount: 150, occurredOn: '2026-01-10', note: null },
    ]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(350)
  })

  it('category_reduction returns baseline minus entries (reduction achieved so far)', () => {
    const challenge = baseChallenge({ metricType: 'category_reduction', targetValue: 100, baselineValue: 400 })
    const entries: ChallengeEntryInput[] = [{ amount: 250, occurredOn: '2026-01-05', note: null }]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(150)
  })

  it('no_spend_streak counts days since the latest entry (or start_date if none)', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    const entries: ChallengeEntryInput[] = [{ amount: 5, occurredOn: '2026-01-10', note: null }]
    expect(computeCurrentValue(challenge, entries, '2026-01-15')).toBe(5)
  })

  it('no_spend_streak with no entries counts from start_date', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    expect(computeCurrentValue(challenge, [], '2026-01-06')).toBe(5)
  })
})

describe('computePercentComplete', () => {
  it('clamps to 100', () => {
    const challenge = baseChallenge({ targetValue: 100 })
    expect(computePercentComplete(challenge, 150)).toBe(100)
  })

  it('clamps to 0 for a negative current value', () => {
    const challenge = baseChallenge({ targetValue: 100 })
    expect(computePercentComplete(challenge, -10)).toBe(0)
  })

  it('rounds to the nearest integer', () => {
    const challenge = baseChallenge({ targetValue: 300 })
    expect(computePercentComplete(challenge, 100)).toBe(33)
  })
})

describe('computeDaysRemaining', () => {
  it('counts full days from today to end_date', () => {
    const challenge = baseChallenge({ endDate: '2026-01-31' })
    expect(computeDaysRemaining(challenge, '2026-01-25')).toBe(6)
  })

  it('never goes negative after end_date', () => {
    const challenge = baseChallenge({ endDate: '2026-01-31' })
    expect(computeDaysRemaining(challenge, '2026-02-05')).toBe(0)
  })
})

describe('resolveEffectiveStatus', () => {
  it('stays active before end_date regardless of current value', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 500, '2026-01-15')).toBe('active')
  })

  it('resolves spending_limit as completed when under target at end_date', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 80, '2026-02-01')).toBe('completed')
  })

  it('resolves spending_limit as failed when over target at end_date', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    expect(resolveEffectiveStatus(challenge, 150, '2026-02-01')).toBe('failed')
  })

  it('resolves savings_target as completed early, before end_date, once target is reached', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 500 })
    expect(resolveEffectiveStatus(challenge, 500, '2026-01-15')).toBe('completed')
  })

  it('never overrides an abandoned status', () => {
    const challenge = baseChallenge({ status: 'abandoned' })
    expect(resolveEffectiveStatus(challenge, 1000, '2026-02-01')).toBe('abandoned')
  })

  it('resolves category_reduction as completed when the reduction target is met at end_date', () => {
    const challenge = baseChallenge({ metricType: 'category_reduction', targetValue: 100, baselineValue: 400 })
    expect(resolveEffectiveStatus(challenge, 150, '2026-02-01')).toBe('completed')
  })

  it('resolves category_reduction as failed when the reduction target is missed at end_date', () => {
    const challenge = baseChallenge({ metricType: 'category_reduction', targetValue: 100, baselineValue: 400 })
    expect(resolveEffectiveStatus(challenge, 50, '2026-02-01')).toBe('failed')
  })

  it('resolves no_spend_streak as completed when the streak target is met at end_date', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    expect(resolveEffectiveStatus(challenge, 10, '2026-02-01')).toBe('completed')
  })

  it('resolves no_spend_streak as failed when the streak target is missed at end_date', () => {
    const challenge = baseChallenge({ metricType: 'no_spend_streak', targetValue: 10 })
    expect(resolveEffectiveStatus(challenge, 3, '2026-02-01')).toBe('failed')
  })
})

describe('getChallengeSummary', () => {
  it('assembles a full summary with sorted, capped recent entries', () => {
    const challenge = baseChallenge({ metricType: 'spending_limit', targetValue: 100 })
    const entries: ChallengeEntryInput[] = [
      { amount: 10, occurredOn: '2026-01-05', note: 'a' },
      { amount: 20, occurredOn: '2026-01-10', note: 'b' },
    ]
    const summary = getChallengeSummary(challenge, entries, 'Família', '2026-01-15')

    expect(summary.currentValue).toBe(30)
    expect(summary.percentComplete).toBe(30)
    expect(summary.status).toBe('active')
    expect(summary.ownerLabel).toBe('Família')
    expect(summary.recentEntries).toEqual([
      { amount: 20, occurredOn: '2026-01-10', note: 'b' },
      { amount: 10, occurredOn: '2026-01-05', note: 'a' },
    ])
  })

  it('caps recentEntries at 10, most recent first', () => {
    const challenge = baseChallenge({ metricType: 'savings_target', targetValue: 1000 })
    const entries: ChallengeEntryInput[] = Array.from({ length: 12 }, (_, i) => ({
      amount: 10,
      occurredOn: `2026-01-${String(i + 1).padStart(2, '0')}`,
      note: null,
    }))
    const summary = getChallengeSummary(challenge, entries, 'Família', '2026-01-31')
    expect(summary.recentEntries).toHaveLength(10)
    expect(summary.recentEntries[0].occurredOn).toBe('2026-01-12')
  })
})
