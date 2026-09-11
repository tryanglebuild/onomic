'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function OptionButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string
  description?: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-lg border px-5 py-4 text-left transition-colors',
        selected
          ? 'border-primary bg-primary-soft text-primary-ink'
          : 'border-border bg-surface text-ink hover:bg-surface-sunken'
      )}
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-1 block text-sm text-muted">{description}</span>}
      </span>
      {selected && <Check className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />}
    </button>
  )
}
