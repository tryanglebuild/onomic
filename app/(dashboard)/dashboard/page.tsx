import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { WorkspaceSummaryCard } from '@/components/dashboard/workspace-summary-card'
import { Button } from '@/components/ui/button'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)!

  let memberCount = 0
  let pendingInviteCount = 0
  if (activeWorkspace.type === 'family') {
    const { data: members } = await supabase.rpc('get_workspace_members_with_email', {
      p_workspace_id: activeWorkspace.id,
    })
    memberCount = members?.length ?? 0

    const { data: invites } = await supabase
      .from('workspace_invites')
      .select('id')
      .eq('workspace_id', activeWorkspace.id)
      .eq('status', 'pending')
    pendingInviteCount = invites?.length ?? 0
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">{firstName ? `Olá, ${firstName}` : 'Olá'}</h2>
        <p className="mt-1 text-muted">Aqui vai ficar a visão geral das suas finanças.</p>
      </div>

      <WorkspaceSummaryCard workspace={activeWorkspace} memberCount={memberCount} pendingInviteCount={pendingInviteCount} />

      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong bg-surface p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Wallet className="size-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="font-display text-xl font-medium">Ligue a sua primeira conta</h3>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Assim que ligar uma conta ou importar um extrato, o saldo e as transações categorizadas por IA aparecem aqui.
          </p>
        </div>
        <Button asChild size="sm" className="mt-2">
          <Link href="/accounts/connect">Ligar conta</Link>
        </Button>
      </div>
    </div>
  )
}
