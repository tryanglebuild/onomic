import { describe, expect, it } from 'vitest'
import { PRIMARY_NAV, isNavItemActive, getPageTitle } from '@/lib/dashboard/nav-config'

describe('isNavItemActive', () => {
  it('matches a leaf item by exact href', () => {
    const overview = PRIMARY_NAV.find((i) => i.label === 'Visão geral')!
    expect(isNavItemActive(overview, '/dashboard')).toBe(true)
    expect(isNavItemActive(overview, '/accounts')).toBe(false)
  })

  it('matches a parent item when a child href matches', () => {
    const accounts = PRIMARY_NAV.find((i) => i.label === 'Contas')!
    expect(isNavItemActive(accounts, '/accounts/connect')).toBe(true)
    expect(isNavItemActive(accounts, '/somewhere-else')).toBe(false)
  })
})

describe('getPageTitle', () => {
  it('returns the label for a top-level route', () => {
    expect(getPageTitle('/dashboard')).toBe('Visão geral')
  })

  it('returns the child label for a nested route', () => {
    expect(getPageTitle('/investments/advisor')).toBe('Conselheiro IA')
  })

  it('finds entries in the secondary nav too', () => {
    expect(getPageTitle('/settings/profile')).toBe('Definições')
  })

  it('falls back to Onomic for unknown routes', () => {
    expect(getPageTitle('/somewhere-else')).toBe('Onomic')
  })
})
