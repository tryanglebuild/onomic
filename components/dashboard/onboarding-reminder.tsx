import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OnboardingReminder() {
  return (
    <Link href="/onboarding">
      <Badge variant="violet" className="cursor-pointer transition-opacity hover:opacity-80">
        <Sparkles className="size-3.5" aria-hidden />
        Completar perfil
      </Badge>
    </Link>
  )
}
