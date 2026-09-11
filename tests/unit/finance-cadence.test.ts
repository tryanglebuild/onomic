import { describe, expect, it } from 'vitest'
import { toMonthlyAmount, CADENCE_VALUES, CADENCE_OPTIONS } from '@/lib/finance/cadence'

describe('toMonthlyAmount', () => {
  it('returns the same amount for mensal', () => {
    expect(toMonthlyAmount(100, 'mensal')).toBe(100)
  })

  it('multiplies a daily amount by ~30.44', () => {
    expect(toMonthlyAmount(10, 'diaria')).toBeCloseTo(304.4, 1)
  })

  it('multiplies a weekly amount by ~4.348', () => {
    expect(toMonthlyAmount(50, 'semanal')).toBeCloseTo(217.4, 1)
  })

  it('divides a quarterly amount by 3', () => {
    expect(toMonthlyAmount(300, 'trimestral')).toBeCloseTo(100, 5)
  })

  it('divides a semiannual amount by 6', () => {
    expect(toMonthlyAmount(600, 'semestral')).toBeCloseTo(100, 5)
  })

  it('divides an annual amount by 12', () => {
    expect(toMonthlyAmount(1200, 'anual')).toBeCloseTo(100, 5)
  })
})

describe('CADENCE_VALUES / CADENCE_OPTIONS', () => {
  it('has exactly 6 cadences, in the same order', () => {
    expect(CADENCE_VALUES).toEqual(['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual'])
    expect(CADENCE_OPTIONS.map((o) => o.value)).toEqual(CADENCE_VALUES)
  })

  it('gives every cadence a non-empty Portuguese label', () => {
    for (const option of CADENCE_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
    }
  })
})
