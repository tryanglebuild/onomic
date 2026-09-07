import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignupForm } from '@/components/auth/signup-form'

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
      <SignupForm />
      <p className="mt-6 text-sm text-muted">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium text-primary-strong hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
