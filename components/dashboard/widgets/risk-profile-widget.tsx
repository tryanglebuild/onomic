import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppRadarChart } from '@/components/charts/app-radar-chart'
import type { RiskRadarPoint } from '@/lib/dashboard/overview'

export function RiskProfileWidget({ data }: { data: RiskRadarPoint[] | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <ShieldCheck className="size-4" aria-hidden />
        </span>
        <CardTitle>O seu perfil de risco</CardTitle>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <p className="py-8 text-center text-sm text-muted">
            Complete o seu perfil de investidor para ver o seu perfil de risco aqui.{' '}
            <Link href="/dashboard?onboarding=1" className="font-medium text-primary-strong underline-offset-4 hover:underline">
              Comece agora
            </Link>
            .
          </p>
        ) : (
          <AppRadarChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
