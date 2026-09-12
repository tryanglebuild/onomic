'use server'

import { redirect } from 'next/navigation'
import { refresh } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { MetricType } from './summary'

const VALID_METRIC_TYPES: MetricType[] = ['spending_limit', 'savings_target', 'category_reduction', 'no_spend_streak']

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

function assertValidChallenge(name: string, targetValue: number, metricType: MetricType, startDate: string, endDate: string, baselineValue: number | null) {
  if (!name.trim()) throw new Error('name_required')
  if (!(targetValue > 0)) throw new Error('target_invalid')
  if (!VALID_METRIC_TYPES.includes(metricType)) throw new Error('metric_type_invalid')
  if (!(endDate > startDate)) throw new Error('date_range_invalid')
  if (metricType === 'category_reduction' && (baselineValue === null || baselineValue < 0)) {
    throw new Error('baseline_required')
  }
}

export async function createChallenge(input: {
  workspaceId: string
  ownerUserId: string | null
  templateId: string | null
  name: string
  metricType: MetricType
  targetValue: number
  categoryId: string | null
  baselineValue: number | null
  startDate: string
  endDate: string
}) {
  const { supabase, user } = await requireUser()
  assertValidChallenge(input.name, input.targetValue, input.metricType, input.startDate, input.endDate, input.baselineValue)

  const { error } = await supabase.from('financial_challenges').insert({
    workspace_id: input.workspaceId,
    owner_user_id: input.ownerUserId,
    created_by: user.id,
    template_id: input.templateId,
    name: input.name.trim(),
    metric_type: input.metricType,
    target_value: input.targetValue,
    category_id: input.categoryId,
    baseline_value: input.metricType === 'category_reduction' ? input.baselineValue : null,
    start_date: input.startDate,
    end_date: input.endDate,
  })
  if (error) throw error

  refresh()
}

export async function updateChallenge(input: {
  id: string
  name: string
  metricType: MetricType
  targetValue: number
  startDate: string
  endDate: string
  baselineValue: number | null
}) {
  const { supabase } = await requireUser()
  assertValidChallenge(input.name, input.targetValue, input.metricType, input.startDate, input.endDate, input.baselineValue)

  const { error } = await supabase
    .from('financial_challenges')
    .update({
      name: input.name.trim(),
      target_value: input.targetValue,
      start_date: input.startDate,
      end_date: input.endDate,
      baseline_value: input.metricType === 'category_reduction' ? input.baselineValue : null,
    })
    .eq('id', input.id)
  if (error) throw error

  refresh()
}

export async function abandonChallenge(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('financial_challenges').update({ status: 'abandoned' }).eq('id', id)
  if (error) throw error

  refresh()
}

export async function deleteChallenge(id: string) {
  const { supabase } = await requireUser()

  const { error } = await supabase.from('financial_challenges').delete().eq('id', id)
  if (error) throw error

  refresh()
}

export async function addChallengeEntry(input: {
  challengeId: string
  amount: number
  occurredOn: string
  note: string | null
}) {
  const { supabase, user } = await requireUser()
  if (!(input.amount > 0)) throw new Error('amount_invalid')

  const { error } = await supabase.from('challenge_entries').insert({
    challenge_id: input.challengeId,
    amount: input.amount,
    occurred_on: input.occurredOn,
    note: input.note,
    created_by: user.id,
  })
  if (error) throw error

  refresh()
}
