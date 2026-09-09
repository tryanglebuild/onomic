import Link from 'next/link'
import { signIn } from '../actions'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeRedirectPath } from '@/lib/navigation'
import { QueryErrorToast } from '@/components/ui/query-error-toast'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>
}) {
  const { error, return_to } = await searchParams
  // return_to is attacker-controllable (a query param) — never let it
  // reach the hidden field un-sanitized, or a crafted link like
  // /login?return_to=https://evil.com becomes a working phishing redirect.
  const safeReturnTo = safeRedirectPath(return_to)

  return (
    <AuthShell eyebrow="Bem-vindo de volta" title="Entrar na sua conta">
      <QueryErrorToast error={error} />
      <form action={signIn} className="flex flex-col gap-4">
        <input type="hidden" name="return_to" value={safeReturnTo} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="voce@email.com" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input id="password" name="password" type="password" placeholder="••••••••" required />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Entrar
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Ainda não tens conta?{' '}
        <Link href="/signup" className="font-medium text-primary-strong hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  )
}
