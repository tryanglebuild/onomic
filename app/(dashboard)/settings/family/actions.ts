'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { randomUUID } from 'node:crypto'
import { generateInviteToken } from '@/lib/workspaces/invite-token'
import { buildInviteUrl } from '@/lib/workspaces/invite-links'
import { revalidatePath } from 'next/cache'

export async function createFamilyWorkspace(formData: FormData) {
  const name = String(formData.get('name'))
  const supabase = await createClient()

  const { data: workspaceId, error } = await supabase.rpc('create_family_workspace', {
    p_name: name,
  })

  if (error) {
    redirect(`/settings/family?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/workspace/${workspaceId}`)
}

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function createInvite(workspaceId: string, formData: FormData) {
  const invitedEmail = String(formData.get('email'))
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const inviteId = randomUUID()
  const expiresAt = Date.now() + INVITE_TTL_MS
  const token = generateInviteToken({ inviteId, expiresAt }, process.env.INVITE_TOKEN_SECRET!)

  const { error } = await supabase.from('workspace_invites').insert({
    id: inviteId,
    workspace_id: workspaceId,
    invited_email: invitedEmail,
    token,
    created_by: user!.id,
    expires_at: new Date(expiresAt).toISOString(),
  })

  if (error) {
    redirect(`/settings/family?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/settings/family')
  redirect(`/settings/family?invite_link=${encodeURIComponent(buildInviteUrl(token))}`)
}
