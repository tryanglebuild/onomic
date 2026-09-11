import { Button } from '@/components/ui/button'

export function OnboardingReminder({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="moss" size="sm" onClick={onClick} className="gap-2">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="white" strokeOpacity="0.35" strokeWidth="2.5" />
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="22 38"
          transform="rotate(-90 8 8)"
        />
      </svg>
      Completar perfil
    </Button>
  )
}
