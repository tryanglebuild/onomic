import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import { getExpenseCategories } from '@/lib/finance/queries'
import {
  getChallengeTemplates,
  getWorkspaceMemberOptions,
  listChallengeSummaries,
} from '@/lib/challenges/queries'
import { ChallengeCard } from '@/components/challenges/challenge-card'
import { CreateChallengeDialog } from '@/components/challenges/create-challenge-dialog'
import { Card } from '@/components/ui/card'
import type { ChallengeSummary } from '@/lib/challenges/summary'

function groupByStatus(summaries: ChallengeSummary[]) {
  return {
    active: summaries.filter((s) => s.status === 'active'),
    completed: summaries.filter((s) => s.status === 'completed'),
    failed: summaries.filter((s) => s.status === 'failed'),
    abandoned: summaries.filter((s) => s.status === 'abandoned'),
  }
}

export default async function ChallengesPage() {
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const workspaceId = await getActiveWorkspaceId(workspaces)

  if (!workspaceId) {
    return null
  }

  const [templates, categories, members, summaries] = await Promise.all([
    getChallengeTemplates(supabase),
    getExpenseCategories(supabase),
    getWorkspaceMemberOptions(supabase, workspaceId),
    listChallengeSummaries(supabase, workspaceId),
  ])

  const grouped = groupByStatus(summaries)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight">Desafios financeiros</h1>
          <p className="mt-1 text-muted">Metas com prazo, a solo ou em família.</p>
        </div>
        <CreateChallengeDialog workspaceId={workspaceId} templates={templates} categories={categories} members={members} />
      </div>

      {summaries.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <h2 className="font-display text-lg font-medium">Ainda não tem desafios ativos</h2>
          <p className="text-sm text-muted">Crie o primeiro desafio para começar a acompanhar o seu progresso.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.active.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Ativos</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.active.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.completed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Concluídos</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.completed.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.failed.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Falhados</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.failed.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
          {grouped.abandoned.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">Abandonados</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.abandoned.map((s) => (
                  <ChallengeCard key={s.id} summary={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
