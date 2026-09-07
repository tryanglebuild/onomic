import { cookies } from 'next/headers'
import type { WorkspaceSummary } from './queries'

export const ACTIVE_WORKSPACE_COOKIE = 'active_workspace_id'

export async function getActiveWorkspaceId(workspaces: WorkspaceSummary[]): Promise<string | null> {
  if (workspaces.length === 0) return null

  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value

  const stillMember = cookieValue && workspaces.some((w) => w.id === cookieValue)
  if (stillMember) return cookieValue as string

  return workspaces.find((w) => w.type === 'personal')?.id ?? workspaces[0].id
}
