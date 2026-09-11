'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import type { OnboardingProfile } from '@/lib/onboarding/queries'
import { SIDEBAR_COLLAPSED_COOKIE } from '@/lib/dashboard/sidebar-preference'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { OnboardingAutoOpen } from '@/components/onboarding/onboarding-auto-open'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

export function DashboardShell({
  children,
  workspaces,
  activeWorkspaceId,
  profile,
  initialCollapsed,
  showOnboardingReminder,
  onboardingProfile,
}: {
  children: React.ReactNode
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
  profile: Profile
  initialCollapsed: boolean
  showOnboardingReminder: boolean
  onboardingProfile: OnboardingProfile | null
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const router = useRouter()

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

  function closeOnboarding(open: boolean) {
    setOnboardingOpen(open)
    if (!open) {
      // Refreshes this render's server data (showOnboardingReminder in
      // particular) without a full navigation — the modal never routes
      // anywhere in v2, so this is the only way the badge's visibility
      // catches up with a just-completed onboarding in the same session.
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Suspense fallback={null}>
        <OnboardingAutoOpen onOpen={() => setOnboardingOpen(true)} />
      </Suspense>
      <OnboardingModal open={onboardingOpen} onOpenChange={closeOnboarding} profile={onboardingProfile} />
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
          onOpenOnboarding={() => setOnboardingOpen(true)}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
