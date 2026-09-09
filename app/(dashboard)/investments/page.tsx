import { TrendingUp } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function InvestmentsPage() {
  return (
    <ComingSoon
      icon={TrendingUp}
      title="Investimentos"
      description="Acompanhe a sua carteira de investimentos com categorização automática. Esta área chega em breve."
    />
  )
}
