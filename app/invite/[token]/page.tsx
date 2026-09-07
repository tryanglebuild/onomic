import { createClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/workspaces/invite-token'
import { acceptInvite } from './actions'

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const { error } = await searchParams

  let preview: { workspace_name: string; status: string } | null = null

  try {
    const { inviteId } = verifyInviteToken(token, process.env.INVITE_TOKEN_SECRET!)
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_invite_preview', { p_invite_id: inviteId })
    preview = data?.[0] ?? null
  } catch {
    preview = null
  }

  if (!preview || preview.status !== 'pending') {
    return (
      <main className="mx-auto max-w-sm p-8">
        <p>Este convite é inválido ou já expirou.</p>
      </main>
    )
  }

  const boundAccept = acceptInvite.bind(null, token)

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Convite para {preview.workspace_name}</h1>
      {error && <p className="text-red-600">Não foi possível aceitar o convite: {error}</p>}
      <form action={boundAccept}>
        <button type="submit" className="rounded bg-black p-2 text-white">
          Aceitar convite
        </button>
      </form>
    </main>
  )
}
