import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignupForm } from '@/components/auth/signup-form'
import { QueryErrorToast } from '@/components/ui/query-error-toast'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell eyebrow="Comece agora" title="Criar a sua conta">
      <QueryErrorToast error={error} />
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
