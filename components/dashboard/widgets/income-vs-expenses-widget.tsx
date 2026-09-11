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
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0" aria-hidden>
          <rect x="3" y="9" width="5" height="13" rx="1.5" fill="var(--color-sky)" />
          <rect x="13" y="4" width="5" height="18" rx="1.5" fill="var(--color-sky)" fillOpacity="0.5" />
        </svg>
        <CardTitle>Rendimento vs. Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <svg width="88" height="72" viewBox="0 0 88 72" fill="none" aria-hidden>
              <rect
                x="12"
                y="16"
                width="24"
                height="56"
                rx="4"
                stroke="var(--color-sky)"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeDasharray="3 6"
              />
              <rect
                x="52"
                y="32"
                width="24"
                height="40"
                rx="4"
                stroke="var(--color-sky)"
                strokeOpacity="0.45"
                strokeWidth="2"
                strokeDasharray="3 6"
              />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-medium text-ink">O seu rendimento chega para os gastos?</p>
              <p className="max-w-xs text-sm text-muted">
                Configure o seu rendimento e gastos fixos para ver esta comparação.{' '}
                <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
                  Comece agora
                </Link>
                .
              </p>
            </div>
          </div>
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
