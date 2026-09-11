import { PieChart } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppPieChart } from '@/components/charts/app-pie-chart'
import { formatCurrency } from '@/lib/finance/cadence'
import type { CategoryTotal } from '@/lib/dashboard/overview'

export function ExpensesByCategoryWidget({ data }: { data: CategoryTotal[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-soft text-violet">
          <PieChart className="size-4" aria-hidden />
        </span>
        <CardTitle>Gastos por categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Ainda não tem gastos fixos configurados.{' '}
            <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              Configure os seus gastos fixos
            </Link>
            .
          </p>
        ) : (
          <AppPieChart data={data} valueFormatter={formatCurrency} />
        )}
      </CardContent>
    </Card>
  )
}
