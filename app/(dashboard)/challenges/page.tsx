import { Trophy } from 'lucide-react'
import { ComingSoon } from '@/components/dashboard/coming-soon'

export default function ChallengesPage() {
  return (
    <ComingSoon
      icon={Trophy}
      title="Desafios financeiros"
      description="Metas com regras claras, a solo ou em família, para criar o hábito. Esta área chega em breve."
    />
  )
}
