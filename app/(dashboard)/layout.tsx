import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { WorkspaceSelector } from './workspace-selector'

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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <span className="font-semibold">Onomic</span>
        <div className="flex items-center gap-4">
          <Link href="/settings/profile" className="text-sm text-gray-600 hover:text-gray-900">
            Perfil
          </Link>
          <WorkspaceSelector workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
