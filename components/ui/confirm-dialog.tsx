'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'

/**
 * Generic themed confirmation modal — for any destructive or discard-style
 * action that needs an explicit "are you sure" step (unsaved changes,
 * deletions, etc.). Renders above any other open Dialog via its z-index.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ButtonProps['variant']
  onConfirm: () => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-navy/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-3rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 text-center shadow-lifted focus:outline-none">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <Dialog.Title className="mt-4 font-display text-lg font-medium text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted">{description}</Dialog.Description>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Dialog.Close asChild>
              <Button type="button" variant="outline" size="sm">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button type="button" variant={variant} size="sm" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
