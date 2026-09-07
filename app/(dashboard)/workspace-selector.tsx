import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import { switchWorkspace } from './switch-workspace/actions'

export function WorkspaceSelector({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
}) {
  return (
    <form action={switchWorkspace} className="flex items-center gap-2">
      <select
        name="workspaceId"
        defaultValue={activeWorkspaceId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded border p-1"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.type === 'personal' ? 'Pessoal' : w.name}
          </option>
        ))}
      </select>
    </form>
  )
}
