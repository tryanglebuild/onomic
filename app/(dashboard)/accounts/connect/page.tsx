import { Link2 } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function ConnectAccountPage() {
  return (
    <ComingSoon
      icon={Link2}
      title="Ligar conta"
      description="Vai poder ligar uma conta bancária, importar um extrato ou lançar transações à mão. Esta área chega em breve."
    />
  )
}
