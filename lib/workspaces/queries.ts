import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'

export interface WorkspaceSummary {
  id: string
  type: 'personal' | 'family'
  name: string
  role: 'owner' | 'member'
}

// Memoized per request. The dashboard layout and several pages each need
// the workspace list; without this every one of them re-queries Supabase
// even though they run in the same navigation. Keyed on the `supabase`
// client instance — pass the one from lib/supabase/server.ts's
// `createClient()` (itself memoized per request) so repeated calls
// actually hit the cache instead of missing on object identity.
export const getUserWorkspaces = cache(async function getUserWorkspaces(
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
})
