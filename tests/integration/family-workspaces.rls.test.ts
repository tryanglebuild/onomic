import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  signInAsTestUser,
} from '../helpers/supabase-test-clients'

const PASSWORD = 'Test1234!Test1234!'
const RUN_ID = Date.now()

let userA: { id: string; email: string; client: SupabaseClient }
let userB: { id: string; email: string; client: SupabaseClient }
let userC: { id: string; email: string; client: SupabaseClient }
let familyWorkspaceId: string
let pendingInviteId: string

async function setUpUser(label: string) {
  const email = `${label}-${RUN_ID}@onomic.test`
  const authUser = await createTestUser(email, PASSWORD)
  const client = await signInAsTestUser(email, PASSWORD)
  return { id: authUser!.id, email, client }
}

beforeAll(async () => {
  userA = await setUpUser('user-a')
  userB = await setUpUser('user-b')
  userC = await setUpUser('user-c')
})

afterAll(async () => {
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
  await deleteTestUser(userC.id)
})

describe('personal workspace bootstrap', () => {
  it('auto-creates exactly one personal workspace with the user as owner', async () => {
    const { data, error } = await userA.client
      .from('workspace_members')
      .select('role, workspaces(id, type, name)')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].role).toBe('owner')
    expect((data![0] as any).workspaces.type).toBe('personal')
  })

  it('rejects a direct attempt to add a second member to a personal workspace', async () => {
    const { data: memberships } = await userA.client
      .from('workspace_members')
      .select('workspace_id')
    const personalWorkspaceId = memberships![0].workspace_id

    // Uses the admin client to bypass RLS and isolate the trigger's own guard.
    const { error } = await adminClient()
      .from('workspace_members')
      .insert({ workspace_id: personalWorkspaceId, user_id: userB.id, role: 'member' })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/personal workspaces cannot have more than one member/)
  })
})

describe('platform profile (RBAC foundation)', () => {
  it('auto-creates a profile row with role=user on signup', async () => {
    const { data, error } = await userA.client
      .from('profiles')
      .select('id, role')
      .single()

    expect(error).toBeNull()
    expect(data!.id).toBe(userA.id)
    expect(data!.role).toBe('user')
  })

  it('hides another user\'s profile row', async () => {
    const { data, error } = await userA.client
      .from('profiles')
      .select('id')
      .eq('id', userB.id)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('blocks a client from changing its own role', async () => {
    const { error } = await userA.client
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userA.id)

    // No UPDATE policy exists on `profiles`, so RLS silently matches zero rows
    // rather than erroring — assert the role never actually changed.
    expect(error).toBeNull()

    const { data } = await adminClient().from('profiles').select('role').eq('id', userA.id).single()
    expect(data!.role).toBe('user')
  })
})

describe('family workspace creation and isolation', () => {
  it('lets a user create a family workspace and become its owner', async () => {
    const { data, error } = await userA.client.rpc('create_family_workspace', {
      p_name: 'Familia Test',
    })

    expect(error).toBeNull()
    familyWorkspaceId = data as string

    const { data: membership } = await userA.client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', familyWorkspaceId)
      .single()

    expect(membership!.role).toBe('owner')
  })

  it('hides the family workspace from an unrelated user', async () => {
    const { data } = await userC.client
      .from('workspaces')
      .select('id')
      .eq('id', familyWorkspaceId)

    expect(data).toEqual([])
  })
})

describe('invites', () => {
  it('lets the owner create a pending invite', async () => {
    pendingInviteId = crypto.randomUUID()

    const { error } = await userA.client.from('workspace_invites').insert({
      id: pendingInviteId,
      workspace_id: familyWorkspaceId,
      invited_email: userB.email,
      token: `placeholder-token-${pendingInviteId}`,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    })

    expect(error).toBeNull()
  })

  it('blocks a non-owner from creating an invite for the same workspace', async () => {
    const { error } = await userC.client.from('workspace_invites').insert({
      id: crypto.randomUUID(),
      workspace_id: familyWorkspaceId,
      invited_email: 'someone-else@onomic.test',
      token: 'irrelevant-token',
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    })

    expect(error).not.toBeNull()
  })

  it('exposes a public preview of a pending invite without membership', async () => {
    const { data, error } = await userC.client.rpc('get_invite_preview', {
      p_invite_id: pendingInviteId,
    })

    expect(error).toBeNull()
    expect(data![0].workspace_name).toBe('Familia Test')
    expect(data![0].status).toBe('pending')
  })

  it('lets an invited user accept and become a member', async () => {
    const { error } = await userB.client.rpc('accept_workspace_invite', {
      p_invite_id: pendingInviteId,
    })

    expect(error).toBeNull()

    const { data: membership } = await userB.client
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', familyWorkspaceId)
      .single()

    expect(membership!.role).toBe('member')
  })

  it('rejects acceptance when the caller\'s email does not match the invite', async () => {
    const mismatchedInviteId = crypto.randomUUID()
    const { adminClient } = await import('../helpers/supabase-test-clients')

    await adminClient().from('workspace_invites').insert({
      id: mismatchedInviteId,
      workspace_id: familyWorkspaceId,
      invited_email: userB.email,
      token: `placeholder-token-${mismatchedInviteId}`,
      created_by: userA.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    })

    const { error } = await userC.client.rpc('accept_workspace_invite', {
      p_invite_id: mismatchedInviteId,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/invite_email_mismatch/)

    const { data: invite } = await adminClient()
      .from('workspace_invites')
      .select('status')
      .eq('id', mismatchedInviteId)
      .single()

    expect(invite!.status).toBe('pending')
  })

  it('rejects accepting the same invite twice', async () => {
    const { error } = await userB.client.rpc('accept_workspace_invite', {
      p_invite_id: pendingInviteId,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/invite_not_pending/)
  })

  it('marks an expired invite as expired and rejects acceptance', async () => {
    const expiredInviteId = crypto.randomUUID()
    const { adminClient } = await import('../helpers/supabase-test-clients')

    await adminClient().from('workspace_invites').insert({
      id: expiredInviteId,
      workspace_id: familyWorkspaceId,
      invited_email: userC.email,
      token: `placeholder-token-${expiredInviteId}`,
      created_by: userA.id,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })

    const { error } = await userC.client.rpc('accept_workspace_invite', {
      p_invite_id: expiredInviteId,
    })

    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/invite_expired/)

    const { data: invite } = await adminClient()
      .from('workspace_invites')
      .select('status')
      .eq('id', expiredInviteId)
      .single()

    expect(invite!.status).toBe('expired')
  })
})

describe('membership management', () => {
  it('lets the owner remove a member', async () => {
    const { error } = await userA.client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', familyWorkspaceId)
      .eq('user_id', userB.id)

    expect(error).toBeNull()

    const { data } = await userA.client
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', familyWorkspaceId)

    expect(data!.map((m) => m.user_id)).not.toContain(userB.id)
  })

  it('blocks a non-owner from removing the owner', async () => {
    // Re-invite and accept userB so there is a non-owner member to test with.
    const inviteId = crypto.randomUUID()
    const { adminClient } = await import('../helpers/supabase-test-clients')
    await adminClient().from('workspace_invites').insert({
      id: inviteId,
      workspace_id: familyWorkspaceId,
      invited_email: userB.email,
      token: `placeholder-token-${inviteId}`,
      created_by: userA.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    })
    await userB.client.rpc('accept_workspace_invite', { p_invite_id: inviteId })

    const { error } = await userB.client
      .from('workspace_members')
      .delete()
      .eq('workspace_id', familyWorkspaceId)
      .eq('user_id', userA.id)

    expect(error).not.toBeNull()
  })
})
