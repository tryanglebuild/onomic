import Link from 'next/link'
import { Logomark } from '@/components/ui/logomark'

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logomark className="size-7 text-navy" />
          <span className="font-display text-lg font-medium tracking-tight">Onomic</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  )
}
