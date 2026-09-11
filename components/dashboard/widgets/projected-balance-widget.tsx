import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLineChart } from '@/components/charts/app-line-chart'
import { formatCurrency } from '@/lib/finance/cadence'
import type { ProjectedBalancePoint } from '@/lib/dashboard/overview'

export function ProjectedBalanceWidget({ data, hasData }: { data: ProjectedBalancePoint[]; hasData: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy-ink">
          <TrendingUp className="size-4" aria-hidden />
        </span>
        <div>
          <CardTitle>Saldo projetado</CardTitle>
          <CardDescription>Projeção baseada nos valores recorrentes configurados, não no histórico real de transações.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted">
            Configure o seu rendimento e gastos fixos para ver a projeção dos próximos meses.{' '}
            <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              Comece agora
            </Link>
            .
          </p>
        ) : (
          <AppLineChart data={data} valueFormatter={formatCurrency} />
        )}
      </CardContent>
    </Card>
  )
}
