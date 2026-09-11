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
let personalWorkspaceIdA: string
let salarioTypeId: string
let habitacaoCategoryId: string

async function setUpUser(label: string) {
  const email = `${label}-${RUN_ID}@onomic.test`
  const authUser = await createTestUser(email, PASSWORD)
  const client = await signInAsTestUser(email, PASSWORD)
  return { id: authUser!.id, email, client }
}

beforeAll(async () => {
  userA = await setUpUser('income-a')
  userB = await setUpUser('income-b')

  // Note: reading workspace_members directly (`userA.client.from('workspace_members')...`)
  // hits a known, pre-existing, out-of-scope environment issue where `authenticated`
  // lacks table grants on tables from migrations 001-006 on this local stack (the same
  // issue that breaks tests/integration/family-workspaces.rls.test.ts). Since income_sources
  // / recurring_expenses RLS only cares about workspace membership, not workspace *type*,
  // we get a workspace userA is a member of via the create_family_workspace RPC instead —
  // it's SECURITY DEFINER and returns the new id directly, so it doesn't depend on the
  // broken SELECT grants on workspace_members/workspaces.
  const { data: workspaceId, error: workspaceError } = await userA.client.rpc('create_family_workspace', {
    p_name: 'Income Test Family',
  })
  if (workspaceError) throw workspaceError
  personalWorkspaceIdA = workspaceId!

  const { data: types } = await adminClient().from('income_source_types').select('id, slug').eq('slug', 'salario').single()
  salarioTypeId = types!.id

  const { data: categories } = await adminClient().from('expense_categories').select('id, slug').eq('slug', 'habitacao').single()
  habitacaoCategoryId = categories!.id
})

afterAll(async () => {
  await deleteTestUser(userA.id)
  await deleteTestUser(userB.id)
})

describe('lookup tables', () => {
  it('lets any authenticated user read income source types', async () => {
    const { data, error } = await userA.client.from('income_source_types').select('slug').order('sort_order')
    expect(error).toBeNull()
    expect(data!.length).toBe(6)
  })

  it('lets any authenticated user read expense categories', async () => {
    const { data, error } = await userA.client.from('expense_categories').select('slug').order('sort_order')
    expect(error).toBeNull()
    expect(data!.length).toBe(10)
  })
})

describe('income_sources RLS', () => {
  it('lets a workspace member create and read their own income source', async () => {
    const { error: insertError } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Salário principal',
      amount: 2000,
      cadence: 'mensal',
    })
    expect(insertError).toBeNull()

    const { data, error } = await userA.client
      .from('income_sources')
      .select('name, amount, cadence')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Salário principal')
  })

  it('hides another user\'s income sources', async () => {
    const { data, error } = await userB.client
      .from('income_sources')
      .select('id')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('rejects a non-positive amount at the database level', async () => {
    const { error } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Inválido',
      amount: 0,
      cadence: 'mensal',
    })
    expect(error).not.toBeNull()
  })

  it('rejects an invalid cadence at the database level', async () => {
    const { error } = await userA.client.from('income_sources').insert({
      workspace_id: personalWorkspaceIdA,
      source_type_id: salarioTypeId,
      name: 'Inválido',
      amount: 100,
      cadence: 'quinzenal',
    })
    expect(error).not.toBeNull()
  })
})

describe('recurring_expenses RLS', () => {
  it('lets a workspace member create and read their own recurring expense', async () => {
    const { error: insertError } = await userA.client.from('recurring_expenses').insert({
      workspace_id: personalWorkspaceIdA,
      category_id: habitacaoCategoryId,
      name: 'Renda',
      amount: 800,
      cadence: 'mensal',
    })
    expect(insertError).toBeNull()

    const { data, error } = await userA.client
      .from('recurring_expenses')
      .select('name, amount, cadence')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Renda')
  })

  it('hides another user\'s recurring expenses', async () => {
    const { data, error } = await userB.client
      .from('recurring_expenses')
      .select('id')
      .eq('workspace_id', personalWorkspaceIdA)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('blocks a non-member from inserting into a workspace they do not belong to', async () => {
    const { error } = await userB.client.from('recurring_expenses').insert({
      workspace_id: personalWorkspaceIdA,
      category_id: habitacaoCategoryId,
      name: 'Intruso',
      amount: 100,
      cadence: 'mensal',
    })
    expect(error).not.toBeNull()
  })
})
