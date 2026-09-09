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
