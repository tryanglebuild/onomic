import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PendingAction } from '@/lib/dashboard/overview'

export function PendingActionsWidget({ actions }: { actions: PendingAction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0" aria-hidden>
          <path d="M3 5.5l2 2 4-4" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 5.5h8" stroke="var(--color-warning)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 11.5l2 2 4-4" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 11.5h8" stroke="var(--color-warning)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 17.5l2 2 4-4" stroke="var(--color-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 17.5h5" stroke="var(--color-warning)" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <CardTitle>Ações pendentes</CardTitle>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="flex items-center gap-2 py-4 text-sm text-muted">
            <CheckCircle2 className="size-4 shrink-0 text-primary-strong" aria-hidden />
            Tudo em dia por agora.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actions.map((action) => (
              <li key={action.label}>
                <a
                  href={action.href}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-ink transition-colors hover:bg-surface-sunken"
                >
                  {action.label}
                  <span className="text-primary-strong">→</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
