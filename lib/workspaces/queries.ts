import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export interface WorkspaceSummary {
  id: string
  type: 'personal' | 'family'
  name: string
  role: 'owner' | 'member'
}

export async function getUserWorkspaces(
  supabase: SupabaseClient<Database>
): Promise<WorkspaceSummary[]> {
  const { data: memberships, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')

  if (error) throw error
  if (!memberships || memberships.length === 0) return []

  const { data: workspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('id, type, name')
    .in(
      'id',
      memberships.map((m) => m.workspace_id)
    )

  if (workspacesError) throw workspacesError

  const roleByWorkspace = new Map(memberships.map((m) => [m.workspace_id, m.role]))

  return (workspaces ?? []).map((w) => ({
    id: w.id,
    type: w.type,
    name: w.name,
    role: roleByWorkspace.get(w.id)!,
  }))
}
