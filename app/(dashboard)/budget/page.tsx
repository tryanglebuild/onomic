import { List } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function BudgetPage() {
  return (
    <ComingSoon
      icon={List}
      title="Orçamento"
      description="Defina um orçamento mensal por categoria e acompanhe os desvios. Esta área chega em breve."
    />
  )
}
