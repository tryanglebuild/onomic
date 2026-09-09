'use client'

import Link from 'next/link'
import { LogOut, UserCircle, Users2 } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Profile = { fullName: string | null; handle: string | null; avatarUrl: string | null }

function initialsFrom(profile: Profile): string {
  if (profile.fullName) {
    const parts = profile.fullName.trim().split(/\s+/)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    return (first + last).toUpperCase() || '?'
  }
  return profile.handle?.[0]?.toUpperCase() ?? '?'
}

export function UserMenu({ profile }: { profile: Profile }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu do utilizador"
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-border-strong bg-primary-soft text-sm font-semibold text-primary-ink transition-opacity hover:opacity-90"
      >
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar comes from Supabase Storage, not a local/remote asset next/image needs to optimize
          <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          initialsFrom(profile)
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <div className="px-2.5 py-1.5">
          <p className="truncate text-sm font-medium text-ink">{profile.fullName ?? 'Sem nome'}</p>
          {profile.handle && <p className="truncate text-xs text-muted">@{profile.handle}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2.5">
            <UserCircle className="size-4 text-muted" aria-hidden />
            Perfil e definições
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/family" className="flex items-center gap-2.5">
            <Users2 className="size-4 text-muted" aria-hidden />
            Família
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut()} className="flex items-center gap-2.5 text-danger">
          <LogOut className="size-4" aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
