import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AppRadarChart } from '@/components/charts/app-radar-chart'
import type { RiskRadarPoint } from '@/lib/dashboard/overview'

export function RiskProfileWidget({ data }: { data: RiskRadarPoint[] | null }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="shrink-0" aria-hidden>
          <polygon
            points="11,2 20,18 2,18"
            fill="var(--color-primary)"
            fillOpacity="0.18"
            stroke="var(--color-primary)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <CardTitle>O seu perfil de risco</CardTitle>
      </CardHeader>
      <CardContent>
        {data === null ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <svg width="90" height="86" viewBox="0 0 90 86" fill="none" aria-hidden>
              <polygon
                points="45,6 82,64 8,64"
                stroke="var(--color-primary)"
                strokeOpacity="0.4"
                strokeWidth="2"
                strokeDasharray="4 7"
                strokeLinejoin="round"
              />
              <polygon
                points="45,28 65,58 25,58"
                stroke="var(--color-primary)"
                strokeOpacity="0.25"
                strokeWidth="1.5"
                strokeDasharray="3 5"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col gap-1">
              <p className="font-display text-lg font-medium text-ink">Qual é o seu perfil de investidor?</p>
              <p className="max-w-xs text-sm text-muted">
                Complete o seu perfil de investidor para ver o seu perfil de risco aqui.{' '}
                <Link href="/dashboard?onboarding=1" className="font-medium text-primary-strong underline-offset-4 hover:underline">
                  Comece agora
                </Link>
                .
              </p>
            </div>
          </div>
        ) : (
          <AppRadarChart data={data} />
        )}
      </CardContent>
    </Card>
  )
}
