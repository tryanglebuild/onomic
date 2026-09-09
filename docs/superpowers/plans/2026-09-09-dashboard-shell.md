# Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give authenticated users a real destination (`/dashboard`) with a collapsible sidebar, nested nav dropdowns, and a navbar with a user menu — replacing the current dead-end redirect to a near-empty `/workspace/[id]` placeholder.

**Architecture:** A single stable `/dashboard` URL replaces per-workspace URLs (workspace switching stays cookie-based, as it already is). A new `components/dashboard/` component tree (Sidebar, Navbar, DashboardShell, UserMenu, WorkspaceMenu) replaces the bare `<header>` in `app/(dashboard)/layout.tsx`. Every product area that doesn't have a data model yet (contas, transações, orçamento, vaults, desafios, investimentos) gets a real route with a shared `<ComingSoon>` empty state, so the nav IA is complete even though most of it is not yet backed by data.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 (CSS custom properties in `app/globals.css`), `@radix-ui/react-dropdown-menu` and `@radix-ui/react-collapsible` (new — same unstyled/accessible family as the already-installed `@radix-ui/react-slot`), `lucide-react` icons, Supabase (`@supabase/ssr`), Vitest (node environment, no component-rendering tests — this codebase verifies UI by `tsc` + manual/Playwright passes, not RTL; see Task 13).

**Spec:** `docs/superpowers/specs/2026-09-09-dashboard-shell-design.md`

## Global Constraints

- No fabricated financial data anywhere in the UI (no placeholder balances/transactions) — this is a financial app; empty states must read as empty states, not fake data.
- Every "em breve" area is a real Next.js route using `<ComingSoon>`, never a dead link.
- Workspace switching stays cookie-based (`active_workspace_id`) — no per-workspace URL segments.
- Match existing design tokens in `app/globals.css` exactly (`--color-primary`, `--color-danger`, `--color-ink`, `--color-muted`, `--color-border`, `--color-surface`, `--color-paper`, radii `--radius-sm/md/lg/xl`) — no ad-hoc colors like the `text-red-600`/`bg-green-100` that existed before the toast redesign.
- No new animation/dependency beyond `@radix-ui/react-dropdown-menu` and `@radix-ui/react-collapsible` — no `framer-motion`, no `tailwindcss-animate` (not installed; don't reference `animate-in`/`fade-in-0` utility classes, they're no-ops here).
- Server actions callable directly from client components (not just via `<form action>`) — `switchWorkspace` and `signOut` are called as plain async functions from `onClick`/`onSelect` handlers.

---

## File Structure

```
lib/dashboard/
  sidebar-preference.ts       # cookie name + parseSidebarCollapsed() (new)
  nav-config.ts                # nav IA data + isNavItemActive()/getPageTitle() (new)

components/ui/
  dropdown-menu.tsx            # Radix DropdownMenu wrapper, app-styled (new)

components/dashboard/
  coming-soon.tsx               # shared empty-state block (new)
  sidebar-nav-item.tsx          # leaf link or collapsible group (new)
  sidebar.tsx                   # left nav column, collapse + mobile drawer (new)
  workspace-menu.tsx            # navbar workspace switcher dropdown (new)
  user-menu.tsx                 # navbar avatar dropdown (new)
  navbar.tsx                    # top bar (new)
  dashboard-shell.tsx            # client wrapper owning collapse/mobile state (new)
  workspace-summary-card.tsx     # /dashboard overview card (new)

app/(dashboard)/
  layout.tsx                    # modified: fetch profile, read cookie, render DashboardShell
  workspace-selector.tsx        # deleted (replaced by workspace-menu.tsx)
  dashboard/page.tsx             # new: the /dashboard overview page
  workspace/[id]/page.tsx        # deleted
  accounts/page.tsx              # new: ComingSoon
  accounts/connect/page.tsx      # new: ComingSoon
  transactions/page.tsx          # new: ComingSoon
  budget/page.tsx                # new: ComingSoon
  vaults/page.tsx                # new: ComingSoon
  challenges/page.tsx            # new: ComingSoon
  investments/page.tsx           # new: ComingSoon
  investments/advisor/page.tsx   # new: ComingSoon
  switch-workspace/actions.ts    # modified: FormData -> (workspaceId: string), redirect target
  settings/family/actions.ts     # modified: createFamilyWorkspace sets cookie + redirects to /dashboard

app/(auth)/actions.ts            # modified: signUp redirect, signIn fallback, new signOut()
app/(auth)/login/page.tsx        # modified: safeRedirectPath fallback
app/page.tsx                     # modified: redirect target

tests/unit/
  sidebar-preference.test.ts     # new
  nav-config.test.ts             # new
```

---

## Task 1: Install Radix dependencies + sidebar collapse preference

**Files:**
- Modify: `package.json` (via `npm install`)
- Create: `lib/dashboard/sidebar-preference.ts`
- Test: `tests/unit/sidebar-preference.test.ts`

**Interfaces:**
- Produces: `SIDEBAR_COLLAPSED_COOKIE: string`, `parseSidebarCollapsed(value: string | undefined): boolean` — consumed by Task 10 (layout) and Task 10 (dashboard-shell).

- [ ] **Step 1: Install dependencies**

```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-collapsible
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/unit/sidebar-preference.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/unit/sidebar-preference.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard/sidebar-preference'`

- [ ] **Step 4: Write the implementation**

```ts
// lib/dashboard/sidebar-preference.ts
export const SIDEBAR_COLLAPSED_COOKIE = 'sidebar_collapsed'

/** Parses the raw cookie string into a boolean. Any value other than
 * exactly "1" is treated as expanded (the default), including no cookie
 * at all (first visit). */
export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === '1'
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/sidebar-preference.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/dashboard/sidebar-preference.ts tests/unit/sidebar-preference.test.ts
git commit -m "feat(dashboard): add sidebar collapse preference + radix deps"
```

---

## Task 2: Navigation config (IA data + pure helpers)

**Files:**
- Create: `lib/dashboard/nav-config.ts`
- Test: `tests/unit/nav-config.test.ts`

**Interfaces:**
- Consumes: nothing (pure data + logic module).
- Produces: `NavLeaf = { label: string; href: string }`, `NavItem = { label: string; icon: LucideIcon; href?: string; children?: NavLeaf[] }`, `PRIMARY_NAV: NavItem[]`, `SECONDARY_NAV: NavItem[]`, `isNavItemActive(item: NavItem, pathname: string): boolean`, `getPageTitle(pathname: string): string` — consumed by Task 5 (sidebar-nav-item), Task 6 (sidebar), Task 9 (navbar).

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/nav-config.test.ts
import { describe, expect, it } from 'vitest'
import { PRIMARY_NAV, SECONDARY_NAV, isNavItemActive, getPageTitle } from '@/lib/dashboard/nav-config'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/nav-config.test.ts`
Expected: FAIL — `Cannot find module '@/lib/dashboard/nav-config'`

- [ ] **Step 3: Write the implementation**

```ts
// lib/dashboard/nav-config.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/nav-config.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the whole unit suite to make sure nothing else broke**

Run: `npm test`
Expected: all tests pass (existing `invite-token.test.ts` unaffected; `family-workspaces.rls.test.ts` is an integration test that needs a live Supabase connection — skip/ignore it if it fails for connectivity reasons unrelated to this change)

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/nav-config.ts tests/unit/nav-config.test.ts
git commit -m "feat(dashboard): add navigation IA config"
```

---

## Task 3: Dropdown menu UI primitive

**Files:**
- Create: `components/ui/dropdown-menu.tsx`

**Interfaces:**
- Consumes: `cn` from `@/lib/utils`, `@radix-ui/react-dropdown-menu` (Task 1).
- Produces: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuLabel` — consumed by Task 7 (workspace-menu) and Task 8 (user-menu).

- [ ] **Step 1: Write the component**

```tsx
// components/ui/dropdown-menu.tsx
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

function DropdownMenuContent({
  className,
  sideOffset = 8,
  align = 'end',
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-[220px] overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-lifted outline-none',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item>) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink outline-none transition-colors',
        'data-[highlighted]:bg-surface-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...props} />
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-muted', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/ui/dropdown-menu.tsx
git commit -m "feat(ui): add themed dropdown-menu primitive"
```

---

## Task 4: Coming-soon component + 8 placeholder routes

**Files:**
- Create: `components/dashboard/coming-soon.tsx`
- Create: `app/(dashboard)/accounts/page.tsx`
- Create: `app/(dashboard)/accounts/connect/page.tsx`
- Create: `app/(dashboard)/transactions/page.tsx`
- Create: `app/(dashboard)/budget/page.tsx`
- Create: `app/(dashboard)/vaults/page.tsx`
- Create: `app/(dashboard)/challenges/page.tsx`
- Create: `app/(dashboard)/investments/page.tsx`
- Create: `app/(dashboard)/investments/advisor/page.tsx`

**Interfaces:**
- Consumes: `Card` from `@/components/ui/card`, `Button` from `@/components/ui/button`, `LucideIcon` type from `lucide-react`.
- Produces: `ComingSoon({ icon, title, description }): JSX.Element` — consumed by the 8 pages here (and available for any future placeholder route).

- [ ] **Step 1: Write the component**

```tsx
// components/dashboard/coming-soon.tsx
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center gap-4 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-medium">{title}</h2>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/dashboard">Voltar à visão geral</Link>
      </Button>
    </Card>
  )
}
```

- [ ] **Step 2: Write the 8 placeholder pages**

```tsx
// app/(dashboard)/accounts/page.tsx
import { Wallet } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function AccountsPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Contas"
      description="Ligue as suas contas bancárias e veja tudo num único lugar. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/accounts/connect/page.tsx
import { Link2 } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function ConnectAccountPage() {
  return (
    <ComingSoon
      icon={Link2}
      title="Ligar conta"
      description="Vai poder ligar uma conta bancária, importar um extrato ou lançar transações à mão. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/transactions/page.tsx
import { ArrowLeftRight } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function TransactionsPage() {
  return (
    <ComingSoon
      icon={ArrowLeftRight}
      title="Transações"
      description="As suas transações, categorizadas automaticamente por IA. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/budget/page.tsx
import { List } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function BudgetPage() {
  return (
    <ComingSoon
      icon={List}
      title="Orçamento"
      description="Defina um orçamento mensal por categoria e acompanhe os desvios. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/vaults/page.tsx
import { PiggyBank } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function VaultsPage() {
  return (
    <ComingSoon
      icon={PiggyBank}
      title="Vaults de poupança"
      description="Separe dinheiro para um objetivo concreto sem abrir uma conta nova. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/challenges/page.tsx
import { Trophy } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function ChallengesPage() {
  return (
    <ComingSoon
      icon={Trophy}
      title="Desafios financeiros"
      description="Metas com regras claras, a solo ou em família, para criar o hábito. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/investments/page.tsx
import { TrendingUp } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function InvestmentsPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Investimentos"
      description="Acompanhe a sua carteira de investimentos com categorização automática. Esta área chega em breve."
    />
  )
}
```

```tsx
// app/(dashboard)/investments/advisor/page.tsx
import { Bot } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function InvestmentAdvisorPage() {
  return (
    <ComingSoon
      icon={Bot}
      title="Conselheiro financeiro (IA)"
      description="Um conselheiro de investimentos com IA, disponível diretamente na app. Esta área chega em breve."
    />
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/coming-soon.tsx "app/(dashboard)/accounts" "app/(dashboard)/transactions" "app/(dashboard)/budget" "app/(dashboard)/vaults" "app/(dashboard)/challenges" "app/(dashboard)/investments"
git commit -m "feat(dashboard): add ComingSoon component and placeholder routes"
```

---

## Task 5: Sidebar nav item (leaf + collapsible group)

**Files:**
- Create: `components/dashboard/sidebar-nav-item.tsx`

**Interfaces:**
- Consumes: `NavItem`, `isNavItemActive` from `@/lib/dashboard/nav-config` (Task 2), `cn` from `@/lib/utils`, `@radix-ui/react-collapsible` (Task 1).
- Produces: `SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }): JSX.Element` — consumed by Task 6 (sidebar).

- [ ] **Step 1: Write the component**

```tsx
// components/dashboard/sidebar-nav-item.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNavItemActive, type NavItem } from '@/lib/dashboard/nav-config'

export function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = isNavItemActive(item, pathname)
  const Icon = item.icon

  if (!item.children) {
    return (
      <Link
        href={item.href!}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primary-soft text-primary-ink' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    )
  }

  return (
    <Collapsible.Root defaultOpen={active}>
      <Collapsible.Trigger
        title={collapsed ? item.label : undefined}
        className={cn(
          'group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active ? 'bg-primary-soft text-primary-ink' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
          collapsed && 'justify-center px-2'
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            <ChevronDown
              className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </>
        )}
      </Collapsible.Trigger>
      {!collapsed && (
        <Collapsible.Content className="flex flex-col gap-0.5 overflow-hidden py-1 pl-[2.375rem]">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                pathname === child.href ? 'font-medium text-primary-strong' : 'text-ink-soft hover:text-ink'
              )}
            >
              {child.label}
            </Link>
          ))}
        </Collapsible.Content>
      )}
    </Collapsible.Root>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar-nav-item.tsx
git commit -m "feat(dashboard): add sidebar nav item component"
```

---

## Task 6: Sidebar (nav column, collapse toggle, mobile drawer)

**Files:**
- Create: `components/dashboard/sidebar.tsx`

**Interfaces:**
- Consumes: `PRIMARY_NAV`, `SECONDARY_NAV` (Task 2), `SidebarNavItem` (Task 5), `Logomark` from `@/components/ui/logomark`, `cn` from `@/lib/utils`.
- Produces: `Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }): JSX.Element` — consumed by Task 10 (dashboard-shell).

- [ ] **Step 1: Write the component**

```tsx
// components/dashboard/sidebar.tsx
'use client'

import { ChevronLeft } from 'lucide-react'
import { PRIMARY_NAV, SECONDARY_NAV } from '@/lib/dashboard/nav-config'
import { SidebarNavItem } from './sidebar-nav-item'
import { Logomark } from '@/components/ui/logomark'
import { cn } from '@/lib/utils'

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={onCloseMobile} aria-hidden />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-[72px]'
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2 border-b border-border px-4',
            collapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <Logomark className="size-7 shrink-0 text-navy" />
          {!collapsed && <span className="font-display text-lg font-medium tracking-tight">Onomic</span>}
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <SidebarNavItem key={item.label} item={item} collapsed={collapsed} />
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-4">
            {SECONDARY_NAV.map((item) => (
              <SidebarNavItem key={item.label} item={item} collapsed={collapsed} />
            ))}
          </div>
        </nav>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden shrink-0 items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted transition-colors hover:text-ink lg:flex"
        >
          <ChevronLeft className={cn('size-4 shrink-0 transition-transform', collapsed && 'rotate-180')} aria-hidden />
          {!collapsed && <span>Colapsar</span>}
        </button>
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/sidebar.tsx
git commit -m "feat(dashboard): add sidebar shell component"
```

---

## Task 7: Workspace switcher — action signature + navbar dropdown

**Files:**
- Modify: `app/(dashboard)/switch-workspace/actions.ts`
- Create: `components/dashboard/workspace-menu.tsx`

**Interfaces:**
- Consumes: `WorkspaceSummary` from `@/lib/workspaces/queries`, `DropdownMenu*` (Task 3).
- Produces: `switchWorkspace(workspaceId: string): Promise<void>` (signature change — was `(formData: FormData)`), `WorkspaceMenu({ workspaces, activeWorkspaceId }): JSX.Element` — consumed by Task 9 (navbar).

- [ ] **Step 1: Change the action signature**

```ts
// app/(dashboard)/switch-workspace/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/workspaces/active-workspace'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function switchWorkspace(workspaceId: string) {
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)

  const isMember = workspaces.some((w) => w.id === workspaceId)
  if (!isMember) {
    throw new Error('not_a_member_of_workspace')
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
}
```

- [ ] **Step 2: Write the dropdown component**

```tsx
// components/dashboard/workspace-menu.tsx
'use client'

import { useTransition } from 'react'
import { Check, ChevronsUpDown, Home, Users2 } from 'lucide-react'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import { switchWorkspace } from '@/app/(dashboard)/switch-workspace/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function WorkspaceMenu({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
}) {
  const [isPending, startTransition] = useTransition()
  const active = workspaces.find((w) => w.id === activeWorkspaceId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken disabled:opacity-60"
      >
        {active?.type === 'family' ? (
          <Users2 className="size-4 text-muted" aria-hidden />
        ) : (
          <Home className="size-4 text-muted" aria-hidden />
        )}
        <span className="max-w-[140px] truncate">
          {active ? (active.type === 'personal' ? 'Pessoal' : active.name) : '—'}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => startTransition(() => switchWorkspace(w.id))}
            className="justify-between"
          >
            <span className="truncate">{w.type === 'personal' ? 'Pessoal' : w.name}</span>
            {w.id === activeWorkspaceId && <Check className="size-4 text-primary-strong" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (the old `app/(dashboard)/workspace-selector.tsx`, which used `<form action={switchWorkspace}>`, will start failing to type-check against the new signature — that's expected and fixed in Task 10, which deletes it)

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/switch-workspace/actions.ts" components/dashboard/workspace-menu.tsx
git commit -m "feat(dashboard): switch-workspace as direct action + navbar dropdown"
```

---

## Task 8: Sign-out action + user menu

**Files:**
- Modify: `app/(auth)/actions.ts`
- Create: `components/dashboard/user-menu.tsx`

**Interfaces:**
- Consumes: `DropdownMenu*` (Task 3).
- Produces: `signOut(): Promise<void>` (new export from `app/(auth)/actions.ts`), `UserMenu({ profile }: { profile: { fullName: string | null; handle: string | null; avatarUrl: string | null } }): JSX.Element` — consumed by Task 9 (navbar), Task 10 (dashboard-shell/layout, which defines the `profile` shape passed down).

- [ ] **Step 1: Add the sign-out action**

Add to the end of `app/(auth)/actions.ts` (same file that already exports `signUp`/`signIn`, so no new import wiring needed elsewhere):

```ts
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Write the user menu component**

```tsx
// components/dashboard/user-menu.tsx
'use client'

import Link from 'next/link'
import { LogOut, UserCircle, Users2 } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

function initialsFrom(profile: Profile): string {
  if (profile.fullName) {
    const parts = profile.fullName.trim().split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    return (first + last).toUpperCase() || '?'
  }
  return profile.handle?.[0]?.toUpperCase() ?? '?'
}

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-primary-soft text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Supabase Storage, not a local/remote asset next/image needs to optimize
          <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initialsFrom(profile)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2.5 py-1.5">
          <p className="truncate text-sm font-medium text-ink">{profile.fullName ?? 'Sem nome'}</p>
          {profile.handle && <p className="truncate text-xs text-muted">@{profile.handle}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2.5">
            <UserCircle className="size-4 text-muted" aria-hidden />
            Perfil e definições
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/family" className="flex items-center gap-2.5">
            <Users2 className="size-4 text-muted" aria-hidden />
            Família
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} className="flex items-center gap-2.5 text-danger">
          <LogOut className="size-4" aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/actions.ts" components/dashboard/user-menu.tsx
git commit -m "feat(dashboard): add sign-out action and user menu"
```

---

## Task 9: Navbar

**Files:**
- Create: `components/dashboard/navbar.tsx`

**Interfaces:**
- Consumes: `WorkspaceSummary` from `@/lib/workspaces/queries`, `getPageTitle` from `@/lib/dashboard/nav-config` (Task 2), `WorkspaceMenu` (Task 7), `UserMenu` (Task 8).
- Produces: `Navbar({ workspaces, activeWorkspaceId, profile, onOpenMobileSidebar }): JSX.Element` — consumed by Task 10 (dashboard-shell).

- [ ] **Step 1: Write the component**

```tsx
// components/dashboard/navbar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu } from 'lucide-react'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import { getPageTitle } from '@/lib/dashboard/nav-config'
import { WorkspaceMenu } from './workspace-menu'
import { UserMenu } from './user-menu'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

export function Navbar({
  workspaces,
  activeWorkspaceId,
  profile,
  onOpenMobileSidebar,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  onOpenMobileSidebar: () => void
}) {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-paper/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileSidebar}
        className="flex size-9 items-center justify-center rounded-md text-ink-soft hover:bg-surface-sunken lg:hidden"
        aria-label="Abrir navegação"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <h1 className="font-display text-lg font-medium tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <WorkspaceMenu workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken"
          aria-label="Notificações"
        >
          <Bell className="size-[18px]" aria-hidden />
        </button>
        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/navbar.tsx
git commit -m "feat(dashboard): add navbar component"
```

---

## Task 10: Dashboard shell + wire into layout

**Files:**
- Create: `components/dashboard/dashboard-shell.tsx`
- Modify: `app/(dashboard)/layout.tsx`
- Delete: `app/(dashboard)/workspace-selector.tsx`

**Interfaces:**
- Consumes: `Sidebar` (Task 6), `Navbar` (Task 9), `WorkspaceSummary` from `@/lib/workspaces/queries`, `SIDEBAR_COLLAPSED_COOKIE`/`parseSidebarCollapsed` (Task 1), `AVATAR_BUCKET` from `@/lib/storage/avatar`.
- Produces: `DashboardShell({ children, workspaces, activeWorkspaceId, profile, initialCollapsed }): JSX.Element` — consumed by `app/(dashboard)/layout.tsx`.

- [ ] **Step 1: Write the shell component**

```tsx
// components/dashboard/dashboard-shell.tsx
'use client'

import { useState } from 'react'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import { SIDEBAR_COLLAPSED_COOKIE } from '@/lib/dashboard/sidebar-preference'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

export function DashboardShell({
  children,
  workspaces,
  activeWorkspaceId,
  profile,
  initialCollapsed,
}: {
  children: React.ReactNode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  initialCollapsed: boolean
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      // Non-httpOnly on purpose — this is a UI preference, not sensitive,
      // and needs to be writable from the client for an instant toggle
      // (no round-trip through a server action).
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; SameSite=Lax`
      return next
    })
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          profile={profile}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into the dashboard layout**

Replace the full contents of `app/(dashboard)/layout.tsx`:

```tsx
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { AVATAR_BUCKET } from '@/lib/storage/avatar'
import { SIDEBAR_COLLAPSED_COOKIE, parseSidebarCollapsed } from '@/lib/dashboard/sidebar-preference'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)

  if (!activeWorkspaceId) {
    redirect('/login')
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('full_name, handle, avatar_path')
    .eq('id', user.id)
    .single()

  const avatarUrl = profileRow?.avatar_path
    ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profileRow.avatar_path).data.publicUrl
    : null

  const cookieStore = await cookies()
  const initialCollapsed = parseSidebarCollapsed(cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value)

  return (
    <DashboardShell
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      profile={{
        fullName: profileRow?.full_name ?? null,
        handle: profileRow?.handle ?? null,
        avatarUrl,
      }}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </DashboardShell>
  )
}
```

- [ ] **Step 3: Delete the now-unused old header component**

```bash
git rm "app/(dashboard)/workspace-selector.tsx"
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/dashboard-shell.tsx "app/(dashboard)/layout.tsx"
git commit -m "feat(dashboard): wire dashboard shell into layout"
```

---

## Task 11: Workspace summary card + `/dashboard` overview page

**Files:**
- Create: `components/dashboard/workspace-summary-card.tsx`
- Create: `app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `WorkspaceSummary` from `@/lib/workspaces/queries`, `Card` from `@/components/ui/card`, `Button` from `@/components/ui/button`, `getUserWorkspaces`/`getActiveWorkspaceId`.
- Produces: `WorkspaceSummaryCard({ workspace, memberCount, pendingInviteCount }): JSX.Element` — consumed only by the new `/dashboard` page.

- [ ] **Step 1: Write the summary card**

```tsx
// components/dashboard/workspace-summary-card.tsx
import { Home, Users2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'

export function WorkspaceSummaryCard({
  workspace,
  memberCount,
  pendingInviteCount,
}: {
  workspace: WorkspaceSummary
  memberCount: number
  pendingInviteCount: number
}) {
  return (
    <Card className="flex items-center gap-4 p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        {workspace.type === 'family' ? <Users2 className="size-5" aria-hidden /> : <Home className="size-5" aria-hidden />}
      </span>
      <div>
        <p className="font-display text-lg font-medium">
          {workspace.type === 'personal' ? 'Workspace pessoal' : workspace.name}
        </p>
        <p className="text-sm text-muted">
          {workspace.type === 'family'
            ? `${memberCount} membro${memberCount === 1 ? '' : 's'}${
                pendingInviteCount > 0
                  ? ` · ${pendingInviteCount} convite${pendingInviteCount === 1 ? '' : 's'} pendente${pendingInviteCount === 1 ? '' : 's'}`
                  : ''
              }`
            : 'Só visível para si'}
        </p>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Write the overview page**

```tsx
// app/(dashboard)/dashboard/page.tsx
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { WorkspaceSummaryCard } from '@/components/dashboard/workspace-summary-card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)!

  let memberCount = 0
  let pendingInviteCount = 0
  if (activeWorkspace.type === 'family') {
    const { data: members } = await supabase.rpc('get_workspace_members_with_email', {
      p_workspace_id: activeWorkspace.id,
    })
    memberCount = members?.length ?? 0

    const { data: invites } = await supabase
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', activeWorkspace.id)
      .eq('status', 'pending')
    pendingInviteCount = invites?.length ?? 0
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">{firstName ? `Olá, ${firstName}` : 'Olá'}</h2>
        <p className="mt-1 text-muted">Aqui vai ficar a visão geral das suas finanças.</p>
      </div>

      <WorkspaceSummaryCard workspace={activeWorkspace} memberCount={memberCount} pendingInviteCount={pendingInviteCount} />

      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Wallet className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-xl font-medium">Ligue a sua primeira conta</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Assim que ligar uma conta ou importar um extrato, o saldo e as transações categorizadas por IA aparecem aqui.
          </p>
        </div>
        <Button asChild size="sm" className="mt-2">
          <Link href="/accounts/connect">Ligar conta</Link>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/workspace-summary-card.tsx "app/(dashboard)/dashboard"
git commit -m "feat(dashboard): add /dashboard overview page"
```

---

## Task 12: Redirect fixes + remove the old `/workspace/[id]` route

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/(auth)/actions.ts`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(dashboard)/settings/family/actions.ts`
- Delete: `app/(dashboard)/workspace/[id]/page.tsx`

**Interfaces:**
- Consumes: `ACTIVE_WORKSPACE_COOKIE` from `@/lib/workspaces/active-workspace`, `cookies` from `next/headers`, `safeRedirectPath` from `@/lib/navigation`.
- Produces: nothing new — this task only redirects existing flows to `/dashboard`.

- [ ] **Step 1: Fix the root page redirect**

In `app/page.tsx`, change:

```ts
  redirect(`/workspace/${activeWorkspaceId}`)
```

to:

```ts
  redirect('/dashboard')
```

- [ ] **Step 2: Fix `signUp`'s success redirect and `signIn`'s fallback**

In `app/(auth)/actions.ts`, change the `signUp` success redirect (currently the last line of the function):

```ts
  redirect('/')
```

to:

```ts
  redirect('/dashboard')
```

And in `signIn`, change:

```ts
  const returnTo = safeRedirectPath(String(formData.get('return_to') || ''))
```

to:

```ts
  const returnTo = safeRedirectPath(String(formData.get('return_to') || ''), '/dashboard')
```

- [ ] **Step 3: Fix the login page's fallback**

In `app/(auth)/login/page.tsx`, change:

```ts
  const safeReturnTo = safeRedirectPath(return_to)
```

to:

```ts
  const safeReturnTo = safeRedirectPath(return_to, '/dashboard')
```

- [ ] **Step 4: Fix `createFamilyWorkspace` — set the active workspace cookie, redirect to `/dashboard`**

In `app/(dashboard)/settings/family/actions.ts`, add the imports:

```ts
import { cookies } from 'next/headers'
import { ACTIVE_WORKSPACE_COOKIE } from '@/lib/workspaces/active-workspace'
```

and change the end of `createFamilyWorkspace` from:

```ts
  // A new workspace exists now — the dashboard layout's workspace selector
  // must show it on the very next navigation, not after its cache expires.
  revalidateWorkspaceMembership()
  redirect(`/workspace/${workspaceId}`)
```

to:

```ts
  // A new workspace exists now — the dashboard layout's workspace selector
  // must show it on the very next navigation, not after its cache expires.
  revalidateWorkspaceMembership()

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
```

- [ ] **Step 5: Delete the old per-workspace route**

```bash
git rm "app/(dashboard)/workspace/[id]/page.tsx"
rmdir "app/(dashboard)/workspace/[id]" "app/(dashboard)/workspace" 2>/dev/null || true
```

- [ ] **Step 6: Confirm no remaining references to `/workspace/`**

Run: `grep -rn "/workspace/" app components lib --include="*.tsx" --include="*.ts"`
Expected: no matches

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add app/page.tsx "app/(auth)/actions.ts" "app/(auth)/login/page.tsx" "app/(dashboard)/settings/family/actions.ts"
git commit -m "feat(dashboard): redirect auth flows to /dashboard, remove old workspace route"
```

---

## Task 13: Full verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 3: Run the unit test suite**

Run: `npm test`
Expected: `sidebar-preference.test.ts` and `nav-config.test.ts` pass; `invite-token.test.ts` passes; the RLS integration test may need a live Supabase connection — note its result but it's unrelated to this change.

- [ ] **Step 4: Start the dev server**

```bash
lsof -ti:3002 -sTCP:LISTEN | xargs -r kill
npm run dev &
timeout 30 bash -c 'until curl -sf http://localhost:3002 >/dev/null; do sleep 1; done'
```

- [ ] **Step 5: Playwright pass — signup lands on `/dashboard`**

Use a throwaway Playwright script (see the pattern already used for the toast redesign in this session — launch chromium, `page.goto`, fill the signup form with a fresh random email/handle, submit, then assert `page.url()` ends in `/dashboard` and the sidebar/navbar render). Take a screenshot.

Expected: URL is `http://localhost:3002/dashboard`, screenshot shows sidebar (with all `PRIMARY_NAV`/`SECONDARY_NAV` labels) + navbar (workspace pill + bell + avatar) + the "Olá, `<name>`" heading and "Ligue a sua primeira conta" empty state.

- [ ] **Step 6: Playwright pass — sidebar collapse**

Click the "Colapsar" button at the bottom of the sidebar. Assert the sidebar's width shrinks (e.g. read the `<aside>` bounding box before/after) and labels disappear, icons remain. Reload the page (`page.reload()`) and assert it's still collapsed (cookie persisted). Screenshot both states.

- [ ] **Step 7: Playwright pass — dropdowns open**

Click the user avatar in the navbar; assert the menu shows "Perfil e definições", "Família", "Sair". Click the workspace pill; assert it lists the user's workspace(s) with a checkmark on the active one. Screenshot both.

- [ ] **Step 8: Playwright pass — nested nav group**

Click "Contas" in the sidebar; assert it expands to show "Todas as contas" and "Ligar conta", and clicking "Todas as contas" navigates to `/accounts` and renders the `<ComingSoon>` card with the "Contas" title.

- [ ] **Step 9: Check console for errors**

Read the Playwright script's collected `console`/`pageerror` events across all steps above.
Expected: empty array.

- [ ] **Step 10: Stop the dev server**

```bash
lsof -ti:3002 -sTCP:LISTEN | xargs -r kill
```

- [ ] **Step 11: Final commit (if any fixups were needed)**

```bash
git add -A
git commit -m "fix(dashboard): address verification findings"
```

(Skip this step if verification found nothing to fix.)
