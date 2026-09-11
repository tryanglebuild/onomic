import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLineChart } from '@/components/charts/app-line-chart'
import { formatCurrency } from '@/lib/finance/cadence'
import type { ProjectedBalancePoint } from '@/lib/dashboard/overview'

export function ProjectedBalanceWidget({ data, hasData }: { data: ProjectedBalancePoint[]; hasData: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0" aria-hidden>
          <polyline
            points="2,18 8,13 13,15 20,4"
            stroke="var(--color-navy)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="4" r="2.2" fill="var(--color-navy)" />
        </svg>
        <div>
          <CardTitle>Saldo projetado</CardTitle>
          <CardDescription>Projeção baseada nos valores recorrentes configurados, não no histórico real de transações.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <svg width="128" height="60" viewBox="0 0 128 60" fill="none" aria-hidden>
              <polyline
                points="4,50 32,38 60,42 88,20 124,8"
                stroke="var(--color-navy)"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="4 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="124" cy="8" r="3.5" fill="var(--color-navy)" fillOpacity="0.5" />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-medium text-ink">Para onde caminham as suas finanças?</p>
              <p className="max-w-xs text-sm text-muted">
                Configure o seu rendimento e gastos fixos para ver a projeção dos próximos meses.{' '}
                <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
                  Comece agora
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <AppLineChart data={data} valueFormatter={formatCurrency} />
        )}
      </CardContent>
    </Card>
  )
}
