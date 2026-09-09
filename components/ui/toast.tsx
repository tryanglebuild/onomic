'use client'

import { Toaster, toast as hotToast, type Toast } from 'react-hot-toast'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

const VARIANT: Record<ToastVariant, { border: string; icon: React.ReactNode }> = {
  success: {
    border: 'border-l-primary',
    icon: <CheckCircle2 className="size-5 shrink-0 text-primary-strong" aria-hidden />,
  },
  error: {
    border: 'border-l-danger',
    icon: <XCircle className="size-5 shrink-0 text-danger" aria-hidden />,
  },
  info: {
    border: 'border-l-sky',
    icon: <Info className="size-5 shrink-0 text-sky" aria-hidden />,
  },
  warning: {
    border: 'border-l-warning',
    icon: <AlertTriangle className="size-5 shrink-0 text-warning" aria-hidden />,
  },
}

function ToastCard({ t, variant, message }: { t: Toast; variant: ToastVariant; message: string }) {
  const { border, icon } = VARIANT[variant]
  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-surface py-3 pl-3.5 pr-3 shadow-lifted transition-all duration-200 border-l-4',
        border,
        t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
      )}
    >
      {icon}
      <p className="flex-1 pt-0.5 text-sm leading-relaxed text-ink">{message}</p>
      <button
        type="button"
        onClick={() => hotToast.dismiss(t.id)}
        className="mt-0.5 shrink-0 text-muted hover:text-ink"
        aria-label="Fechar notificação"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

function show(variant: ToastVariant, message: string) {
  return hotToast.custom((t) => <ToastCard t={t} variant={variant} message={message} />)
}

// Themed replacement for react-hot-toast's default bubble style — a
// left-accent card matching the app's card/border tokens, consistent
// across every "danger box" that used to be duplicated per page.
export const toast = {
  success: (message: string) => show('success', message),
  error: (message: string) => show('error', message),
  info: (message: string) => show('info', message),
  warning: (message: string) => show('warning', message),
}

export function AppToaster() {
  return <Toaster position="top-right" gutter={12} toastOptions={{ duration: 6000 }} />
}
