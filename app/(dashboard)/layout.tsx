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

  // Deliberate cache-busting: this is a Server Component render (not a
  // client render the React Compiler needs to memoize), and a changing
  // value here is exactly the point — without it the browser/CDN would
  // keep serving a stale avatar after re-upload, since avatarPathFor()
  // returns a fixed key per user.
  /* eslint-disable react-hooks/purity */
  const avatarUrl = profileRow?.avatar_path
    ? `${supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profileRow.avatar_path).data.publicUrl}?v=${Date.now()}`
    : null
  /* eslint-enable react-hooks/purity */

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
