import { ArrowLeftRight } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function TransactionsPage() {
  return (
    <ComingSoon
      icon={ArrowLeftRight}
      title="Transações"
      description="As suas transações, categorizadas automaticamente por IA. Esta área chega em breve."
    />
  )
}
