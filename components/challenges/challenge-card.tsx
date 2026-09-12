import Link from 'next/link'
import { Card } from '@/components/ui/card'
import type { ChallengeSummary } from '@/lib/challenges/summary'
import { getProgressPresentation, formatMetricValue } from '@/lib/challenges/summary'

const STATUS_LABEL: Record<ChallengeSummary['status'], string> = {
  active: 'Ativo',
  completed: 'Concluído',
  failed: 'Falhado',
  abandoned: 'Abandonado',
}

const STATUS_COLOR: Record<ChallengeSummary['status'], string> = {
  active: 'text-primary-strong',
  completed: 'text-primary-strong',
  failed: 'text-danger',
  abandoned: 'text-muted',
}

export function ChallengeCard({ summary }: { summary: ChallengeSummary }) {
  const progress = getProgressPresentation(summary.metricType)

  return (
    <Link href={`/challenges/${summary.id}`}>
      <Card className="flex flex-col gap-3 p-5 transition-colors hover:bg-surface-sunken">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-base font-medium text-ink">{summary.name}</p>
          <span className={`text-xs font-semibold ${STATUS_COLOR[summary.status]}`}>{STATUS_LABEL[summary.status]}</span>
        </div>
        <p className="text-xs text-muted">{summary.ownerLabel}</p>
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={`h-full rounded-full transition-all ${progress.tone === 'caution' ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${summary.percentComplete}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{summary.percentComplete}% {progress.suffix}</span>
          {summary.status === 'active' && <span>{summary.daysRemaining} dias restantes</span>}
        </div>
        <p className="text-xs text-muted">
          {formatMetricValue(summary.metricType, summary.currentValue)} de {formatMetricValue(summary.metricType, summary.targetValue)}
        </p>
      </Card>
    </Link>
  )
}
