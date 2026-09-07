import { signUp } from '../actions'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      {error && <p className="text-red-600">{error}</p>}
      <form action={signUp} className="flex flex-col gap-3">
        <input name="email" type="email" placeholder="Email" required className="rounded border p-2" />
        <input name="password" type="password" placeholder="Palavra-passe" required minLength={8} className="rounded border p-2" />
        <button type="submit" className="rounded bg-black p-2 text-white">
          Criar conta
        </button>
      </form>
      <a href="/login" className="text-sm underline">
        Já tens conta? Entrar
      </a>
    </main>
  )
}
