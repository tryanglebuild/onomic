import { Wallet } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function AccountsPage() {
  return (
    <ComingSoon
      icon={Wallet}
      title="Contas"
      description="Ligue as suas contas bancárias e veja tudo num único lugar. Esta área chega em breve."
    />
  )
}
