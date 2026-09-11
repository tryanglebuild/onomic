import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppBarChart } from '@/components/charts/app-bar-chart'
import { formatCurrency } from '@/lib/finance/cadence'

export function IncomeVsExpensesWidget({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const hasData = monthlyIncome > 0 || monthlyExpenses > 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sky">
          <BarChart3 className="size-4" aria-hidden />
        </span>
        <CardTitle>Rendimento vs. Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-8 text-center text-sm text-muted">
            Configure o seu rendimento e gastos fixos para ver esta comparação.{' '}
            <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              Comece agora
            </Link>
            .
          </p>
        ) : (
          <AppBarChart
            data={[
              { label: 'Rendimento', value: monthlyIncome },
              { label: 'Gastos', value: monthlyExpenses },
            ]}
            valueFormatter={formatCurrency}
          />
        )}
      </CardContent>
    </Card>
  )
}
