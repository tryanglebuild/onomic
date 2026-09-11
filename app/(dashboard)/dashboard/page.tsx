import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { getOnboardingProfile } from '@/lib/onboarding/queries'
import { getIncomeSources, getRecurringExpenses, getExpenseCategories } from '@/lib/finance/queries'
import { WorkspaceSummaryCard } from '@/components/dashboard/workspace-summary-card'
import { OverviewGrid } from '@/components/dashboard/overview-grid'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

  const workspaces = await getUserWorkspaces(supabase)
  const activeWorkspaceId = await getActiveWorkspaceId(workspaces)
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)!

  let pendingInviteCount = 0
  let memberCount = 0
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

  const [incomeSources, recurringExpenses, expenseCategories, onboardingProfile] = await Promise.all([
    getIncomeSources(supabase, activeWorkspace.id),
    getRecurringExpenses(supabase, activeWorkspace.id),
    getExpenseCategories(supabase),
    getOnboardingProfile(supabase, user!.id),
  ])

  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">{firstName ? `Olá, ${firstName}` : 'Olá'}</h2>
        <p className="mt-1 text-muted">Aqui está a visão geral das suas finanças.</p>
      </div>

      <WorkspaceSummaryCard workspace={activeWorkspace} memberCount={memberCount} pendingInviteCount={pendingInviteCount} />

      <OverviewGrid
        incomeSources={incomeSources}
        recurringExpenses={recurringExpenses}
        expenseCategories={expenseCategories}
        onboardingCompleted={Boolean(onboardingProfile?.completed_at)}
        investmentHorizon={onboardingProfile?.investment_horizon ?? null}
        investmentExperience={onboardingProfile?.investment_experience ?? null}
        lossReaction={onboardingProfile?.loss_reaction ?? null}
        pendingInviteCount={pendingInviteCount}
        isFamilyWorkspace={activeWorkspace.type === 'family'}
      />
    </div>
  )
}
