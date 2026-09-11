import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance/cadence'

export function FinancialSummaryWidget({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const balance = monthlyIncome - monthlyExpenses

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center font-display text-xl leading-none text-primary-strong" aria-hidden>
          €
        </span>
        <CardTitle>Resumo financeiro</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Rendimento mensal estimado</span>
          <span className="font-medium text-ink">{formatCurrency(monthlyIncome)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Gastos mensais estimados</span>
          <span className="font-medium text-ink">{formatCurrency(monthlyExpenses)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted">Saldo disponível estimado</span>
          <span className={`font-display text-lg font-medium ${balance >= 0 ? 'text-primary-strong' : 'text-danger'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
        {monthlyIncome === 0 && monthlyExpenses === 0 && (
          <p className="border-t border-dashed border-border pt-3 text-xs text-muted">
            Ainda não configurou rendimento nem gastos fixos —{' '}
            <Link href="/budget" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              comece agora
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  )
}
