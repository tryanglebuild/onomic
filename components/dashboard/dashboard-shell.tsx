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
  showOnboardingReminder,
}: {
  children: React.ReactNode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  initialCollapsed: boolean
  showOnboardingReminder: boolean
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
          showOnboardingReminder={showOnboardingReminder}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
