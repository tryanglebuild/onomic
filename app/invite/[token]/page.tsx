import Link from 'next/link'
import { ShieldAlert, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/workspaces/invite-token'
import { acceptInvite } from './actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function InviteScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6">
      <Card className="w-full max-w-sm">{children}</Card>
    </main>
  )
}

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
      <InviteScreen>
        <CardHeader>
          <span className="flex size-10 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="size-5" aria-hidden />
          </span>
          <CardTitle className="mt-3">Convite inválido</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Este convite é inválido ou já expirou. Peça a quem convidou para
            enviar um novo.
          </CardDescription>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/login">Voltar para o login</Link>
          </Button>
        </CardContent>
      </InviteScreen>
    )
  }

  const boundAccept = acceptInvite.bind(null, token)

  return (
    <InviteScreen>
      <CardHeader>
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <Users className="size-5" aria-hidden />
        </span>
        <CardTitle className="mt-3">Convite para {preview.workspace_name}</CardTitle>
        <CardDescription>
          Ao aceitar, vai passar a ver e a gerir as contas partilhadas deste
          workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            Não foi possível aceitar o convite: {error}
          </p>
        )}
        <form action={boundAccept}>
          <Button type="submit" className="w-full">
            Aceitar convite
          </Button>
        </form>
      </CardContent>
    </InviteScreen>
  )
}
