import Link from 'next/link'
import { signUp } from '../actions'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell eyebrow="Comece agora" title="Criar a sua conta">
      {error && (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <form action={signUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="voce@email.com" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
          />
        </div>
        <Button type="submit" className="mt-2 w-full">
          Criar conta
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium text-primary-strong hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
