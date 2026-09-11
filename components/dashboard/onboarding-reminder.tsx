import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OnboardingReminder({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <Badge variant="violet" className="cursor-pointer transition-opacity hover:opacity-80">
        <Sparkles className="size-3.5" aria-hidden />
        Completar perfil
      </Badge>
    </button>
  )
}
