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
