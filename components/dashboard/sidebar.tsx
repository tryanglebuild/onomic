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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-navy-soft bg-navy transition-transform duration-200',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed && 'lg:w-[72px]'
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2 border-b border-navy-soft px-4',
            collapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <Logomark className="size-7 shrink-0 text-white" />
          {!collapsed && (
            <span className="font-display text-lg font-medium tracking-tight text-white">Onomic</span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <div className="flex flex-col gap-1">
            {PRIMARY_NAV.map((item) => (
              <SidebarNavItem key={item.label} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
            ))}
          </div>
          <div className="flex flex-col gap-1 border-t border-navy-soft pt-4">
            {SECONDARY_NAV.map((item) => (
              <SidebarNavItem key={item.label} item={item} collapsed={collapsed} onNavigate={onCloseMobile} />
            ))}
          </div>
        </nav>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden shrink-0 items-center gap-2 border-t border-navy-soft px-4 py-3 text-sm text-navy-ink transition-colors hover:text-white lg:flex"
        >
          <ChevronLeft className={cn('size-4 shrink-0 transition-transform', collapsed && 'rotate-180')} aria-hidden />
          {!collapsed && <span>Colapsar</span>}
        </button>
      </aside>
    </>
  )
}
