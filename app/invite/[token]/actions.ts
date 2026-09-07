'use server'

import { createClient } from '@/lib/supabase/server'
import { verifyInviteToken } from '@/lib/workspaces/invite-token'
import { redirect } from 'next/navigation'
import { revalidateWorkspaceMembership } from '@/lib/workspaces/revalidate'

export async function acceptInvite(token: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?return_to=${encodeURIComponent(`/invite/${token}`)}`)
  }

  let inviteId: string
  try {
    inviteId = verifyInviteToken(token, process.env.INVITE_TOKEN_SECRET!).inviteId
  } catch {
    redirect(`/invite/${token}?error=invalid_or_expired`)
  }

  const { error } = await supabase.rpc('accept_workspace_invite', {
    p_invite_id: inviteId!,
  })

  if (error) {
    redirect(`/invite/${token}?error=${encodeURIComponent(error.message)}`)
  }

  // The user just joined a new workspace — without this, a browser that
  // already had the dashboard layout cached from before accepting the
  // invite could keep showing the old workspace list for up to 30s.
  revalidateWorkspaceMembership()
  redirect('/')
}
