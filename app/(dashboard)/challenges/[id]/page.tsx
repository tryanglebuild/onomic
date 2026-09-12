import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getChallengeSummaryById } from '@/lib/challenges/queries'
import { formatCurrency } from '@/lib/finance/cadence'
import { getProgressPresentation, formatMetricValue } from '@/lib/challenges/summary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddEntryDialog } from '@/components/challenges/add-entry-dialog'
import { EditChallengeDialog } from '@/components/challenges/edit-challenge-dialog'
import { AbandonButton, DeleteButton } from './challenge-detail-client'

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  failed: 'Falhado',
  abandoned: 'Abandonado',
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const summary = await getChallengeSummaryById(supabase, id)

  if (!summary) {
    notFound()
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isCreator = user?.id === summary.createdBy
  const progress = getProgressPresentation(summary.metricType)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">{summary.ownerLabel}</p>
        <h1 className="font-display text-2xl font-medium tracking-tight">{summary.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="h-3 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={`h-full rounded-full transition-all ${progress.tone === 'caution' ? 'bg-warning' : 'bg-primary'}`}
              style={{ width: `${summary.percentComplete}%` }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>{summary.percentComplete}% {progress.suffix}</span>
            <span>{STATUS_LABEL[summary.status]}</span>
            {summary.status === 'active' && <span>{summary.daysRemaining} dias restantes</span>}
          </div>
          <p className="text-sm text-ink">
            {formatMetricValue(summary.metricType, summary.currentValue)} de {formatMetricValue(summary.metricType, summary.targetValue)}
          </p>
          {summary.categoryLabel && <p className="text-sm text-muted">Categoria: {summary.categoryLabel}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Entradas</CardTitle>
          {summary.status === 'active' && (
            <AddEntryDialog challengeId={summary.id} startDate={summary.startDate} endDate={summary.endDate} metricType={summary.metricType} />
          )}
        </CardHeader>
        <CardContent>
          {summary.recentEntries.length === 0 ? (
            <p className="text-sm text-muted">Ainda não há entradas registadas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {summary.recentEntries.map((entry, index) => (
                <li key={index} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{entry.occurredOn}{entry.note ? ` — ${entry.note}` : ''}</span>
                  <span className="font-medium text-ink">{formatCurrency(entry.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary.status === 'active' && isCreator && (
        <div className="flex items-center gap-3">
          <EditChallengeDialog summary={summary} />
          <AbandonButton challengeId={summary.id} />
          <DeleteButton challengeId={summary.id} />
        </div>
      )}
    </div>
  )
}
