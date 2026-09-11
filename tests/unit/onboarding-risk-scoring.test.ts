import { describe, expect, it } from 'vitest'
import { computeRiskProfile } from '@/lib/onboarding/risk-scoring'

describe('computeRiskProfile', () => {
  it('returns conservative for the lowest possible score', () => {
    expect(computeRiskProfile('short', 'none', 'sell_all')).toBe('conservative')
  })

  it('returns conservative at the top of its range (score = 2)', () => {
    expect(computeRiskProfile('long', 'none', 'sell_all')).toBe('conservative') // 2 + 0 + 0 = 2
  })

  it('returns moderate at the bottom of its range (score = 3)', () => {
    expect(computeRiskProfile('medium', 'some', 'sell_some')).toBe('moderate') // 1 + 1 + 1 = 3
  })

  it('returns moderate at the top of its range (score = 4)', () => {
    expect(computeRiskProfile('long', 'some', 'sell_some')).toBe('moderate') // 2 + 1 + 1 = 4
  })

  it('returns aggressive at the bottom of its range (score = 5)', () => {
    expect(computeRiskProfile('long', 'experienced', 'sell_some')).toBe('aggressive') // 2 + 2 + 1 = 5
  })

  it('returns aggressive for the highest possible score', () => {
    expect(computeRiskProfile('long', 'experienced', 'buy_more')).toBe('aggressive') // 2 + 2 + 3 = 7
  })

  it('treats every missing answer as 0 points, never throws', () => {
    expect(computeRiskProfile(null, null, null)).toBe('conservative')
  })

  it('scores partial answers using only what is present', () => {
    expect(computeRiskProfile('long', null, null)).toBe('conservative') // 2 points
    expect(computeRiskProfile('long', 'experienced', null)).toBe('moderate') // 4 points
  })
})
