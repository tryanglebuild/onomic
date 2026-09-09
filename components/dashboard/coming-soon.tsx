import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center gap-4 p-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-medium">{title}</h2>
        <p className="text-sm leading-relaxed text-muted">{description}</p>
      </div>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/dashboard">Voltar à visão geral</Link>
      </Button>
    </Card>
  )
}
