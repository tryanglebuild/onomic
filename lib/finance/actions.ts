'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CADENCE_VALUES, type Cadence } from './cadence'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

function assertValidItem(name: string, amount: number, cadence: Cadence) {
  if (!name.trim()) throw new Error('name_required')
  if (!(amount > 0)) throw new Error('amount_invalid')
  if (!CADENCE_VALUES.includes(cadence)) throw new Error('cadence_invalid')
}

export async function createIncomeSource(input: {
  workspaceId: string
  sourceTypeId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase.from('income_sources').insert({
    workspace_id: input.workspaceId,
    source_type_id: input.sourceTypeId,
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    notes: input.notes,
  })
  if (error) throw error

  refresh()
}

export async function updateIncomeSource(input: {
  id: string
  sourceTypeId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase
    .from('income_sources')
    .update({
      source_type_id: input.sourceTypeId,
      name: input.name.trim(),
      amount: input.amount,
      cadence: input.cadence,
      notes: input.notes,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function setIncomeSourceActive(id: string, active: boolean) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('income_sources').update({ active }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function deleteIncomeSource(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('income_sources').delete().eq('id', id)
  if (error) throw error

  refresh()
}

export async function createRecurringExpense(input: {
  workspaceId: string
  categoryId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase.from('recurring_expenses').insert({
    workspace_id: input.workspaceId,
    category_id: input.categoryId,
    name: input.name.trim(),
    amount: input.amount,
    cadence: input.cadence,
    notes: input.notes,
  })
  if (error) throw error

  refresh()
}

export async function updateRecurringExpense(input: {
  id: string
  categoryId: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
}) {
  const { supabase } = await requireUser()
  assertValidItem(input.name, input.amount, input.cadence)

  const { error } = await supabase
    .from('recurring_expenses')
    .update({
      category_id: input.categoryId,
      name: input.name.trim(),
      amount: input.amount,
      cadence: input.cadence,
      notes: input.notes,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function setRecurringExpenseActive(id: string, active: boolean) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('recurring_expenses').update({ active }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function deleteRecurringExpense(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error

  refresh()
}
