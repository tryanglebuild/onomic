import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { cache } from 'react'
import { getChallengeSummary, type ChallengeSummary, type ChallengeEntryInput } from './summary'

export type ChallengeTemplateRow = Database['public']['Tables']['challenge_templates']['Row']
export type FinancialChallengeRow = Database['public']['Tables']['financial_challenges']['Row']
export type ChallengeEntryRow = Database['public']['Tables']['challenge_entries']['Row']

export const getChallengeTemplates = cache(async function getChallengeTemplates(
  supabase: SupabaseClient<Database>
): Promise<ChallengeTemplateRow[]> {
  const { data, error } = await supabase.from('challenge_templates').select('*').order('name')
  if (error) throw error
  return data
})

export const getFinancialChallenges = cache(async function getFinancialChallenges(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<FinancialChallengeRow[]> {
  const { data, error } = await supabase
    .from('financial_challenges')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
})

export async function getChallengeEntries(
  supabase: SupabaseClient<Database>,
  challengeId: string
): Promise<ChallengeEntryRow[]> {
  const { data, error } = await supabase
    .from('challenge_entries')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('occurred_on', { ascending: false })
  if (error) throw error
  return data
}

export async function getWorkspaceMemberOptions(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<{ userId: string; label: string }[]> {
  const { data, error } = await supabase.rpc('get_workspace_members_with_email', {
    p_workspace_id: workspaceId,
  })
  if (error) throw error
  return (data ?? []).map((member) => ({
    userId: member.user_id,
    label: member.full_name ?? member.handle ?? member.email.split('@')[0],
  }))
}

function toEntryInput(row: ChallengeEntryRow): ChallengeEntryInput {
  return { amount: row.amount, occurredOn: row.occurred_on, note: row.note }
}

async function resolveOwnerLabel(
  ownerUserId: string | null,
  members: { userId: string; label: string }[]
): Promise<string> {
  if (ownerUserId === null) return 'Família'
  return members.find((m) => m.userId === ownerUserId)?.label ?? 'Membro'
}

async function resolveCategoryLabel(
  supabase: SupabaseClient<Database>,
  categoryId: string | null
): Promise<string | null> {
  if (categoryId === null) return null
  const { data } = await supabase.from('expense_categories').select('label').eq('id', categoryId).single()
  return data?.label ?? null
}

// Best-effort: RLS only allows the challenge's own creator to write this
// (financial_challenges_update policy is `created_by = auth.uid()`). A
// non-creator viewer's computed summary above is correct regardless of
// whether this write succeeds — this is purely an opportunistic cache
// update for other queries that filter on `status`, never something a
// caller should treat as a hard requirement.
async function persistResolvedStatus(
  supabase: SupabaseClient<Database>,
  challenge: FinancialChallengeRow,
  resolvedStatus: ChallengeSummary['status']
) {
  if (challenge.status === resolvedStatus) return
  if (resolvedStatus !== 'completed' && resolvedStatus !== 'failed') return
  await supabase.from('financial_challenges').update({ status: resolvedStatus }).eq('id', challenge.id)
}

async function buildSummary(
  supabase: SupabaseClient<Database>,
  challenge: FinancialChallengeRow,
  members: { userId: string; label: string }[]
): Promise<ChallengeSummary> {
  const [entries, categoryLabel] = await Promise.all([
    getChallengeEntries(supabase, challenge.id),
    resolveCategoryLabel(supabase, challenge.category_id),
  ])

  const summary = getChallengeSummary(
    {
      id: challenge.id,
      workspaceId: challenge.workspace_id,
      ownerUserId: challenge.owner_user_id,
      createdBy: challenge.created_by,
      name: challenge.name,
      metricType: challenge.metric_type,
      targetValue: challenge.target_value,
      baselineValue: challenge.baseline_value,
      categoryLabel,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      status: challenge.status,
    },
    entries.map(toEntryInput),
    await resolveOwnerLabel(challenge.owner_user_id, members)
  )

  await persistResolvedStatus(supabase, challenge, summary.status)
  return summary
}

export async function listChallengeSummaries(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<ChallengeSummary[]> {
  const challenges = await getFinancialChallenges(supabase, workspaceId)
  if (challenges.length === 0) return []

  const members = await getWorkspaceMemberOptions(supabase, workspaceId)
  return Promise.all(challenges.map((challenge) => buildSummary(supabase, challenge, members)))
}

export async function getChallengeSummaryById(
  supabase: SupabaseClient<Database>,
  challengeId: string
): Promise<ChallengeSummary | null> {
  const { data: challenge, error } = await supabase
    .from('financial_challenges')
    .select('*')
    .eq('id', challengeId)
    .single()
  if (error || !challenge) return null

  const members = await getWorkspaceMemberOptions(supabase, challenge.workspace_id)
  return buildSummary(supabase, challenge, members)
}
