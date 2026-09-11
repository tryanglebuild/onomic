import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppPieChart } from '@/components/charts/app-pie-chart'
import { formatCurrency } from '@/lib/finance/cadence'
import type { CategoryTotal } from '@/lib/dashboard/overview'

export function ExpensesByCategoryWidget({ data }: { data: CategoryTotal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0" aria-hidden>
          <circle cx="11" cy="11" r="8" stroke="var(--color-violet)" strokeOpacity="0.25" strokeWidth="3.5" />
          <circle
            cx="11"
            cy="11"
            r="8"
            stroke="var(--color-violet)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="15 35"
            transform="rotate(-90 11 11)"
          />
        </svg>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden>
              <circle
                cx="44"
                cy="44"
                r="34"
                stroke="var(--color-violet)"
                strokeOpacity="0.4"
                strokeWidth="10"
                strokeDasharray="3 8"
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-medium text-ink">Onde vai o seu dinheiro?</p>
              <p className="max-w-xs text-sm text-muted">
                Ainda não tem gastos fixos configurados.{' '}
                <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
                  Configure os seus gastos fixos
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <AppPieChart data={data} valueFormatter={formatCurrency} />
        )}
      </CardContent>
    </Card>
  )
}
