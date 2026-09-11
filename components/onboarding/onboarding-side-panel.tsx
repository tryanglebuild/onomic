import { Lock } from 'lucide-react'
import { Logomark } from '@/components/ui/logomark'
import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding/steps'
import { cn } from '@/lib/utils'

/**
 * The onboarding modal's context panel — current step's icon/title/blurb,
 * progress, and a standing trust note. Kept as a distinct component (not
 * folded into OnboardingFlow) since it renders from `currentStep` alone,
 * with no server-action or transition concerns of its own.
 */
export function OnboardingSidePanel({ currentStep }: { currentStep: number }) {
  const current = ONBOARDING_STEPS.find((s) => s.step === currentStep) ?? ONBOARDING_STEPS[0]
  const Icon = current.icon

  return (
    <div className="grain-overlay flex w-full shrink-0 flex-col justify-between gap-6 bg-navy px-6 py-6 text-white sm:w-80 sm:gap-10 sm:px-9 sm:py-10">
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex items-center gap-2.5">
          <Logomark className="size-7 text-white" />
          <span className="font-display text-lg font-medium tracking-tight">Onomic</span>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-start">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
            <Icon className="size-6" aria-hidden />
          </span>
          <div className="sm:mt-4">
            <h2 className="font-display text-2xl font-medium">{current.title}</h2>
            <p className="mt-2 hidden text-base leading-relaxed text-navy-ink sm:block">{current.blurb}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ONBOARDING_STEPS.map(({ step }) => (
            <span
              key={step}
              aria-current={step === currentStep ? 'step' : undefined}
              className={cn(
                'h-2 rounded-full transition-all',
                step === currentStep ? 'w-10 bg-primary' : step < currentStep ? 'w-5 bg-primary-strong' : 'w-5 bg-white/15'
              )}
            />
          ))}
          <span className="sr-only">
            Passo {currentStep} de {TOTAL_ONBOARDING_STEPS}
          </span>
        </div>
      </div>

      <div className="hidden items-start gap-2.5 text-sm leading-relaxed text-navy-ink sm:flex">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>As tuas respostas ficam associadas apenas à tua conta e nunca são partilhadas.</p>
      </div>
    </div>
  )
}
