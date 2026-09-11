'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { OnboardingFlow } from './onboarding-flow'
import type { OnboardingProfile } from '@/lib/onboarding/queries'

export function OnboardingModal({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: OnboardingProfile | null
}) {
  if (!profile || profile.completed_at) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-lifted focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Visible branding now lives inside OnboardingSidePanel — this
              stays sr-only so Radix still has an accessible name/description
              without duplicating the wordmark visually. */}
          <Dialog.Title className="sr-only">Onomic — configura o teu perfil</Dialog.Title>
          <Dialog.Description className="sr-only">
            Um pequeno questionário para conhecer melhor os teus objetivos financeiros.
          </Dialog.Description>
          {/* Keying on current_step forces OnboardingFlow (and every step's
              own useState(initial...)) to remount from a fresh `profile`
              whenever a save action refreshes it (see actions.ts's
              refresh() calls) or the modal reopens on a different step. */}
          <OnboardingFlow key={profile.current_step} profile={profile} onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
