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
let workspaceId: string
let categoryId: string

async function setUpUser(label: string) {
  const email = `${label}-${RUN_ID}@onomic.test`
  const authUser = await createTestUser(email, PASSWORD)
  const client = await signInAsTestUser(email, PASSWORD)
  return { id: authUser!.id, email, client }
}

beforeAll(async () => {
  userA = await setUpUser('challenges-a')
  userB = await setUpUser('challenges-b')

  const { data: newWorkspaceId } = await userA.client.rpc('create_family_workspace', {
    p_name: 'Challenges Test Family',
  })
  workspaceId = newWorkspaceId as string

  // The brief's test code assumed userB was already a member of userA's family
  // workspace, but create_family_workspace only adds the creator. Membership
  // requires the same invite -> accept flow used in family-workspaces.rls.test.ts.
  const inviteId = crypto.randomUUID()
  const { error: inviteError } = await userA.client.from('workspace_invites').insert({
    id: inviteId,
    workspace_id: workspaceId,
    invited_email: userB.email,
    created_by: userA.id,
    token: `placeholder-token-${inviteId}`,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  })
  if (inviteError) throw inviteError
  const { error: acceptError } = await userB.client.rpc('accept_workspace_invite', { p_invite_id: inviteId })
  if (acceptError) throw acceptError

  const { data: category } = await adminClient()
    .from('expense_categories')
    .select('id')
    .eq('slug', 'alimentacao')
    .single()
  categoryId = category!.id
})

afterAll(async () => {
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
})

describe('challenge_templates', () => {
  it('lets any authenticated user read the seeded templates', async () => {
    const { data, error } = await userA.client.from('challenge_templates').select('key')
    expect(error).toBeNull()
    expect(data!.length).toBe(4)
  })
})

describe('financial_challenges RLS', () => {
  let challengeId: string

  it('lets a workspace member create a challenge', async () => {
    const { data, error } = await userA.client
      .from('financial_challenges')
      .insert({
        workspace_id: workspaceId,
        created_by: userA.id,
        owner_user_id: null,
        name: 'Reduzir Alimentação',
        metric_type: 'spending_limit',
        target_value: 100,
        category_id: categoryId,
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
      .select('id')
      .single()

    expect(error).toBeNull()
    challengeId = data!.id
  })

  it('lets any workspace member read the challenge', async () => {
    const { data, error } = await userB.client
      .from('financial_challenges')
      .select('name')
      .eq('id', challengeId)
      .single()
    expect(error).toBeNull()
    expect(data!.name).toBe('Reduzir Alimentação')
  })

  it('hides the challenge from a non-member', async () => {
    const outsider = await setUpUser('challenges-outsider')
    const { data, error } = await outsider.client.from('financial_challenges').select('id').eq('id', challengeId)
    expect(error).toBeNull()
    expect(data).toEqual([])
    await deleteTestUser(outsider.id)
  })

  it('blocks a non-creator member from updating the challenge', async () => {
    const { error } = await userB.client
      .from('financial_challenges')
      .update({ name: 'Hacked' })
      .eq('id', challengeId)
    // RLS silently filters rows the caller isn't allowed to update rather than erroring.
    expect(error).toBeNull()

    const { data } = await adminClient().from('financial_challenges').select('name').eq('id', challengeId).single()
    expect(data!.name).toBe('Reduzir Alimentação')
  })

  it('lets the creator update their own challenge', async () => {
    const { error } = await userA.client
      .from('financial_challenges')
      .update({ name: 'Reduzir Alimentação (revisto)' })
      .eq('id', challengeId)
    expect(error).toBeNull()

    const { data } = await userA.client.from('financial_challenges').select('name').eq('id', challengeId).single()
    expect(data!.name).toBe('Reduzir Alimentação (revisto)')
  })

  it('blocks a creator from moving their challenge into a workspace they are not a member of', async () => {
    const { data: otherWorkspaceId } = await userB.client.rpc('create_family_workspace', {
      p_name: 'Other Family',
    })
    const { error } = await userA.client
      .from('financial_challenges')
      .update({ workspace_id: otherWorkspaceId })
      .eq('id', challengeId)
    // Unlike the non-creator update-block test above (where USING excludes the
    // row entirely, so the update silently matches 0 rows), the creator here
    // does own the row: USING passes, so the row is selected for update, but
    // WITH CHECK then rejects the new workspace_id — Postgres raises an
    // explicit RLS violation (42501) in this case rather than silently
    // filtering.
    expect(error).not.toBeNull()
    expect(error!.code).toBe('42501')

    const { data } = await adminClient().from('financial_challenges').select('workspace_id').eq('id', challengeId).single()
    expect(data!.workspace_id).toBe(workspaceId)
  })

  it('blocks a member from creating a challenge attributed to a different user', async () => {
    const { error } = await userB.client.from('financial_challenges').insert({
      workspace_id: workspaceId,
      created_by: userA.id,
      name: 'Spoofed creator',
      metric_type: 'spending_limit',
      target_value: 50,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
    expect(error).not.toBeNull()
  })

  it('lets the creator delete their own challenge', async () => {
    const { data, error: insertError } = await userA.client
      .from('financial_challenges')
      .insert({
        workspace_id: workspaceId,
        created_by: userA.id,
        name: 'To delete',
        metric_type: 'spending_limit',
        target_value: 50,
        start_date: '2026-01-01',
        end_date: '2026-01-31',
      })
      .select('id')
      .single()
    expect(insertError).toBeNull()

    const { error: deleteError } = await userA.client.from('financial_challenges').delete().eq('id', data!.id)
    expect(deleteError).toBeNull()

    const { data: row } = await adminClient().from('financial_challenges').select('id').eq('id', data!.id).maybeSingle()
    expect(row).toBeNull()
  })

  it('rejects a category_reduction challenge with no baseline_value', async () => {
    const { error } = await userA.client.from('financial_challenges').insert({
      workspace_id: workspaceId,
      created_by: userA.id,
      name: 'Sem baseline',
      metric_type: 'category_reduction',
      target_value: 50,
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    })
    expect(error).not.toBeNull()
  })

  describe('challenge_entries', () => {
    it('lets any workspace member add an entry inside the challenge window', async () => {
      const { error } = await userB.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 20,
        occurred_on: '2026-01-10',
        created_by: userB.id,
      })
      expect(error).toBeNull()
    })

    it('rejects an entry with occurred_on outside the challenge window', async () => {
      const { error } = await userA.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 10,
        occurred_on: '2026-02-15',
        created_by: userA.id,
      })
      expect(error).not.toBeNull()
    })

    it('lets any workspace member read entries', async () => {
      const { data, error } = await userA.client
        .from('challenge_entries')
        .select('amount')
        .eq('challenge_id', challengeId)
      expect(error).toBeNull()
      expect(data!.length).toBe(1)
    })

    it('blocks a non-member from inserting an entry', async () => {
      const outsider = await setUpUser('challenges-entry-outsider')
      const { error } = await outsider.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 5,
        occurred_on: '2026-01-15',
        created_by: outsider.id,
      })
      expect(error).not.toBeNull()
      await deleteTestUser(outsider.id)
    })

    it('blocks a member from attributing an entry to a different user', async () => {
      const { error } = await userA.client.from('challenge_entries').insert({
        challenge_id: challengeId,
        amount: 5,
        occurred_on: '2026-01-12',
        created_by: userB.id,
      })
      expect(error).not.toBeNull()
    })

    it('rejects updating an existing entry (entries are immutable)', async () => {
      const { data: entry } = await adminClient()
        .from('challenge_entries')
        .select('id')
        .eq('challenge_id', challengeId)
        .limit(1)
        .single()
      const { error } = await userA.client.from('challenge_entries').update({ amount: 999 }).eq('id', entry!.id)
      expect(error).not.toBeNull()
    })

    it('rejects deleting an existing entry (entries are immutable)', async () => {
      const { data: entry } = await adminClient()
        .from('challenge_entries')
        .select('id')
        .eq('challenge_id', challengeId)
        .limit(1)
        .single()
      const { error } = await userA.client.from('challenge_entries').delete().eq('id', entry!.id)
      expect(error).not.toBeNull()
    })
  })
})
