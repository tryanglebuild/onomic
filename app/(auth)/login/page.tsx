import { signIn } from '../actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; return_to?: string }>
}) {
  const { error, return_to } = await searchParams

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Entrar</h1>
      {error && <p className="text-red-600">{error}</p>}
      <form action={signIn} className="flex flex-col gap-3">
        <input type="hidden" name="return_to" value={return_to ?? '/'} />
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Palavra-passe" required className="rounded border p-2" />
        <button type="submit" className="rounded bg-black p-2 text-white">
          Entrar
        </button>
      </form>
      <a href="/signup" className="text-sm underline">
        Ainda não tens conta? Criar conta
      </a>
    </main>
  )
}
