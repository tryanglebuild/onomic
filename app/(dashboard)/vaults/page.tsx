import { PiggyBank } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function VaultsPage() {
  return (
    <ComingSoon
      icon={PiggyBank}
      title="Vaults de poupança"
      description="Separe dinheiro para um objetivo concreto sem abrir uma conta nova. Esta área chega em breve."
    />
  )
}
