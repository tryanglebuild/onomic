import { describe, expect, it } from 'vitest'
import { parseSidebarCollapsed } from '@/lib/dashboard/sidebar-preference'

describe('parseSidebarCollapsed', () => {
  it('returns true for "1"', () => {
    expect(parseSidebarCollapsed('1')).toBe(true)
  })

  it('returns false for "0"', () => {
    expect(parseSidebarCollapsed('0')).toBe(false)
  })

  it('returns false for undefined (no cookie yet)', () => {
    expect(parseSidebarCollapsed(undefined)).toBe(false)
  })

  it('returns false for any other value', () => {
    expect(parseSidebarCollapsed('yes')).toBe(false)
  })
})
