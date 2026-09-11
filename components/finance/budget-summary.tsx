import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/finance/cadence'

export function BudgetSummary({
  monthlyIncome,
  monthlyExpenses,
}: {
  monthlyIncome: number
  monthlyExpenses: number
}) {
  const balance = monthlyIncome - monthlyExpenses

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <p className="text-sm text-muted">Rendimento mensal estimado</p>
        <p className="mt-1 font-display text-2xl font-medium text-ink">{formatCurrency(monthlyIncome)}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted">Gastos mensais estimados</p>
        <p className="mt-1 font-display text-2xl font-medium text-ink">{formatCurrency(monthlyExpenses)}</p>
      </Card>
      <Card className="p-5">
        <p className="text-sm text-muted">Saldo disponível estimado</p>
        <p className={`mt-1 font-display text-2xl font-medium ${balance >= 0 ? 'text-primary-strong' : 'text-danger'}`}>
          {formatCurrency(balance)}
        </p>
      </Card>
    </div>
  )
}
