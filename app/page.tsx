import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { LandingPage } from '@/components/marketing/landing-page'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <LandingPage />
  }

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)

  if (!activeWorkspaceId) {
    // Should not happen — every user gets a personal workspace on signup.
    redirect('/login')
  }

  redirect('/dashboard')
}
