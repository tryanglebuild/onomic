'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { Logomark } from '@/components/ui/logomark'
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
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-8 shadow-lifted focus:outline-none"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="mb-6 flex items-center gap-2">
            <Logomark className="size-6 text-navy" />
            <Dialog.Title className="font-display text-base font-medium tracking-tight">Onomic</Dialog.Title>
          </div>
          <Dialog.Description className="sr-only">
            Um pequeno questionário para conhecer melhor os teus objetivos financeiros.
          </Dialog.Description>
          {/* Keying on current_step forces OnboardingFlow (and every step's
              own useState(initial...)) to remount from a fresh `profile`
              whenever a save action refreshes it (see actions.ts's new
              refresh() calls) or the modal reopens on a different step. */}
          <OnboardingFlow key={profile.current_step} profile={profile} onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
