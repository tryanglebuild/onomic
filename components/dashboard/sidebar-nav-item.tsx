'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isNavItemActive, type NavItem } from '@/lib/dashboard/nav-config'

export function SidebarNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const active = isNavItemActive(item, pathname)
  const Icon = item.icon

  if (!item.children) {
    return (
      <Link
        href={item.href!}
        title={collapsed ? item.label : undefined}
        onClick={onNavigate}
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

  if (collapsed) {
    return (
      <Link
        href={item.children[0].href}
        title={item.label}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors justify-center px-2',
          active ? 'bg-primary-soft text-primary-ink' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink'
        )}
      >
        <Icon className="size-[18px] shrink-0" aria-hidden />
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
              onClick={onNavigate}
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
