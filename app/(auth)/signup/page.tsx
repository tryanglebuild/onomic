import Link from 'next/link'
import { signUp } from '../actions'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

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
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" type="text" placeholder="O seu nome" required autoComplete="name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="voce@email.com" required autoComplete="email" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Palavra-passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password_confirmation">Confirmar</Label>
            <Input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              placeholder="Repita a palavra-passe"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="birth_date">Data de nascimento (opcional)</Label>
          <Input id="birth_date" name="birth_date" type="date" autoComplete="bday" />
        </div>

        <Checkbox
          id="terms_accepted"
          name="terms_accepted"
          required
          label={
            <>
              Li e aceito os{' '}
              <Link href="/terms" target="_blank" className="font-medium text-primary-strong hover:underline">
                Termos e Condições
              </Link>{' '}
              e a{' '}
              <Link href="/privacy" target="_blank" className="font-medium text-primary-strong hover:underline">
                Política de Privacidade
              </Link>
              .
            </>
          }
        />

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
