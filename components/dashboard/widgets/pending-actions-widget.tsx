import { CheckCircle2, ListTodo } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PendingAction } from '@/lib/dashboard/overview'

export function PendingActionsWidget({ actions }: { actions: PendingAction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ListTodo className="size-4" aria-hidden />
        </span>
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
