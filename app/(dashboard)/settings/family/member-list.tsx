import { removeMember } from './actions'

interface Member {
  user_id: string
  role: 'owner' | 'member'
  email: string
}

export function MemberList({
  workspaceId,
  members,
  canManage,
}: {
  workspaceId: string
  members: Member[]
  canManage: boolean
}) {
  return (
    <ul className="mt-2 flex flex-col gap-1 text-sm">
      {members.map((m) => (
        <li key={m.user_id} className="flex items-center justify-between">
          <span>
            {m.email} ({m.role === 'owner' ? 'dono' : 'membro'})
          </span>
          {canManage && m.role !== 'owner' && (
            <form action={removeMember.bind(null, workspaceId, m.user_id)}>
              <button type="submit" className="text-red-600 underline">
                Remover
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
