'use client'

import { useTransition } from 'react'
import { Check, ChevronsUpDown, Home, Users2 } from 'lucide-react'
import type { WorkspaceSummary } from '@/lib/workspaces/queries'
import { switchWorkspace } from '@/app/(dashboard)/switch-workspace/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function WorkspaceMenu({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceSummary[]
  activeWorkspaceId: string
}) {
  const [isPending, startTransition] = useTransition()
  const active = workspaces.find((w) => w.id === activeWorkspaceId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken disabled:opacity-60"
      >
        {active?.type === 'family' ? (
          <Users2 className="size-4 text-muted" aria-hidden />
        ) : (
          <Home className="size-4 text-muted" aria-hidden />
        )}
        <span className="max-w-[140px] truncate">
          {active ? (active.type === 'personal' ? 'Pessoal' : active.name) : '—'}
        </span>
        <ChevronsUpDown className="size-3.5 text-muted" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => startTransition(() => switchWorkspace(w.id))}
            className="justify-between"
          >
            <span className="truncate">{w.type === 'personal' ? 'Pessoal' : w.name}</span>
            {w.id === activeWorkspaceId && <Check className="size-4 text-primary-strong" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
