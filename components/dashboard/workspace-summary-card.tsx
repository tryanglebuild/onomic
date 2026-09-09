import { Home, Users2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'

export function WorkspaceSummaryCard({
  workspace,
  memberCount,
  pendingInviteCount,
}: {
  workspace: WorkspaceSummary
  memberCount: number
  pendingInviteCount: number
}) {
  return (
    <Card className="flex items-center gap-4 p-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        {workspace.type === 'family' ? <Users2 className="size-5" aria-hidden /> : <Home className="size-5" aria-hidden />}
      </span>
      <div>
        <p className="font-display text-lg font-medium">
          {workspace.type === 'personal' ? 'Workspace pessoal' : workspace.name}
        </p>
        <p className="text-sm text-muted">
          {workspace.type === 'family'
            ? `${memberCount} membro${memberCount === 1 ? '' : 's'}${
                pendingInviteCount > 0
                  ? ` · ${pendingInviteCount} convite${pendingInviteCount === 1 ? '' : 's'} pendente${pendingInviteCount === 1 ? '' : 's'}`
                  : ''
              }`
            : 'Só visível para si'}
        </p>
      </div>
    </Card>
  )
}
