import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'

export type LookupOption = { id: string; slug: string; label: string }
export type IncomeSourceRow = Database['public']['Tables']['income_sources']['Row']
export type RecurringExpenseRow = Database['public']['Tables']['recurring_expenses']['Row']

export const getIncomeSourceTypes = cache(async function getIncomeSourceTypes(
  supabase: SupabaseClient<Database>
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('income_source_types')
    .select('id, slug, label')
    .order('sort_order')
  if (error) throw error
  return data
})

export const getExpenseCategories = cache(async function getExpenseCategories(
  supabase: SupabaseClient<Database>
): Promise<LookupOption[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('id, slug, label')
    .order('sort_order')
  if (error) throw error
  return data
})

export const getIncomeSources = cache(async function getIncomeSources(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<IncomeSourceRow[]> {
  const { data, error } = await supabase
    .from('income_sources')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) throw error
  return data
})

export const getRecurringExpenses = cache(async function getRecurringExpenses(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<RecurringExpenseRow[]> {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) throw error
  return data
})
