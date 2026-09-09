import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Wallet,
  List,
  ArrowLeftRight,
  PiggyBank,
  Trophy,
  TrendingUp,
  Users,
  Settings,
} from 'lucide-react'

export type NavLeaf = { label: string; href: string }
export type NavItem = { label: string; icon: LucideIcon; href?: string; children?: NavLeaf[] }

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Visão geral', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Contas',
    icon: Wallet,
    children: [
      { label: 'Todas as contas', href: '/accounts' },
      { label: 'Ligar conta', href: '/accounts/connect' },
    ],
  },
  { label: 'Transações', icon: ArrowLeftRight, href: '/transactions' },
  { label: 'Orçamento', icon: List, href: '/budget' },
  { label: 'Vaults', icon: PiggyBank, href: '/vaults' },
  { label: 'Desafios', icon: Trophy, href: '/challenges' },
  {
    label: 'Investimentos',
    icon: TrendingUp,
    children: [
      { label: 'Carteira', href: '/investments' },
      { label: 'Conselheiro IA', href: '/investments/advisor' },
    ],
  },
]

export const SECONDARY_NAV: NavItem[] = [
  {
    label: 'Família',
    icon: Users,
    children: [{ label: 'Membros e convites', href: '/settings/family' }],
  },
  { label: 'Definições', icon: Settings, href: '/settings/profile' },
]

/** True when `pathname` matches this item's own href, or any child href —
 * drives both the active highlight and which parent group starts open. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href) return pathname === item.href
  return (item.children ?? []).some((child) => pathname === child.href)
}

/** Page title shown in the navbar — the label of whichever nav entry
 * (top-level or child, primary or secondary) matches the current path,
 * falling back to "Onomic" for routes outside the configured nav. */
export function getPageTitle(pathname: string): string {
  for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) {
    if (item.href === pathname) return item.label
    const child = item.children?.find((c) => c.href === pathname)
    if (child) return child.label
  }
  return 'Onomic'
}
