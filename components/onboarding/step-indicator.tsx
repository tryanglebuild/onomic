import { ONBOARDING_STEPS, TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding/steps'
import { cn } from '@/lib/utils'

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {ONBOARDING_STEPS.map(({ step }) => (
        <span
          key={step}
          aria-current={step === currentStep ? 'step' : undefined}
          className={cn(
            'h-1.5 rounded-full transition-all',
            step === currentStep
              ? 'w-8 bg-primary'
              : step < currentStep
                ? 'w-1.5 bg-primary-strong'
                : 'w-1.5 bg-border-strong'
          )}
        />
      ))}
      <span className="sr-only">
        Passo {currentStep} de {TOTAL_ONBOARDING_STEPS}
      </span>
    </div>
  )
}
