import { formatCurrency } from '@/lib/finance/cadence'

export type MetricType = 'spending_limit' | 'savings_target' | 'category_reduction' | 'no_spend_streak'
export type ChallengeStatus = 'active' | 'completed' | 'failed' | 'abandoned'

export type ChallengeEntryInput = { amount: number; occurredOn: string; note: string | null }

export type ChallengeInput = {
  id: string
  workspaceId: string
  ownerUserId: string | null
  createdBy: string
  name: string
  metricType: MetricType
  targetValue: number
  baselineValue: number | null
  categoryLabel: string | null
  startDate: string
  endDate: string
  status: ChallengeStatus
}

export type ChallengeSummary = {
  id: string
  workspaceId: string
  ownerUserId: string | null
  ownerLabel: string
  createdBy: string
  name: string
  metricType: MetricType
  categoryLabel: string | null
  targetValue: number
  baselineValue: number | null
  startDate: string
  endDate: string
  currentValue: number
  percentComplete: number
  daysRemaining: number
  status: ChallengeStatus
  recentEntries: ChallengeEntryInput[]
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function sumInRange(entries: ChallengeEntryInput[], start: string, end: string): number {
  return entries
    .filter((e) => e.occurredOn >= start && e.occurredOn <= end)
    .reduce((sum, e) => sum + e.amount, 0)
}

function latestEntryDate(entries: ChallengeEntryInput[]): string | null {
  if (entries.length === 0) return null
  return entries.reduce((latest, e) => (e.occurredOn > latest ? e.occurredOn : latest), entries[0].occurredOn)
}

export function computeCurrentValue(challenge: ChallengeInput, entries: ChallengeEntryInput[], today: string): number {
  const inRange = sumInRange(entries, challenge.startDate, challenge.endDate)
  switch (challenge.metricType) {
    case 'spending_limit':
    case 'savings_target':
      return Math.round(inRange * 100) / 100
    case 'category_reduction': {
      const baseline = challenge.baselineValue ?? 0
      return Math.round((baseline - inRange) * 100) / 100
    }
    case 'no_spend_streak': {
      const latest = latestEntryDate(entries)
      const since = latest && latest > challenge.startDate ? latest : challenge.startDate
      const evalDate = today < challenge.endDate ? today : challenge.endDate
      return Math.max(0, daysBetween(new Date(since), new Date(evalDate)))
    }
  }
}

export function computePercentComplete(challenge: ChallengeInput, currentValue: number): number {
  if (challenge.targetValue <= 0) return 0
  const raw = (currentValue / challenge.targetValue) * 100
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export function getProgressPresentation(metricType: MetricType): { suffix: string; tone: 'success' | 'caution' } {
  switch (metricType) {
    case 'spending_limit':
      return { suffix: 'do limite gasto', tone: 'caution' }
    case 'category_reduction':
      return { suffix: 'da redução alcançada', tone: 'success' }
    case 'savings_target':
      return { suffix: 'da meta atingida', tone: 'success' }
    case 'no_spend_streak':
      return { suffix: 'do objetivo de dias', tone: 'success' }
  }
}

export function formatMetricValue(metricType: MetricType, value: number): string {
  return metricType === 'no_spend_streak' ? `${value} dias` : formatCurrency(value)
}

export function computeDaysRemaining(challenge: ChallengeInput, today: string): number {
  return Math.max(0, daysBetween(new Date(today), new Date(challenge.endDate)))
}

export function resolveEffectiveStatus(
  challenge: ChallengeInput,
  currentValue: number,
  today: string
): ChallengeStatus {
  if (challenge.status === 'abandoned') return 'abandoned'

  if (challenge.metricType === 'savings_target' && currentValue >= challenge.targetValue) {
    return 'completed'
  }

  const ended = today > challenge.endDate
  if (!ended) return 'active'

  switch (challenge.metricType) {
    case 'spending_limit':
      return currentValue <= challenge.targetValue ? 'completed' : 'failed'
    case 'savings_target':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
    case 'category_reduction':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
    case 'no_spend_streak':
      return currentValue >= challenge.targetValue ? 'completed' : 'failed'
  }
}

export function getChallengeSummary(
  challenge: ChallengeInput,
  entries: ChallengeEntryInput[],
  ownerLabel: string,
  today: string = new Date().toISOString().slice(0, 10)
): ChallengeSummary {
  const currentValue = computeCurrentValue(challenge, entries, today)
  const percentComplete = computePercentComplete(challenge, currentValue)
  const daysRemaining = computeDaysRemaining(challenge, today)
  const status = resolveEffectiveStatus(challenge, currentValue, today)
  const recentEntries = [...entries].sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1)).slice(0, 10)

  return {
    id: challenge.id,
    workspaceId: challenge.workspaceId,
    ownerUserId: challenge.ownerUserId,
    ownerLabel,
    createdBy: challenge.createdBy,
    name: challenge.name,
    metricType: challenge.metricType,
    categoryLabel: challenge.categoryLabel,
    targetValue: challenge.targetValue,
    baselineValue: challenge.baselineValue,
    startDate: challenge.startDate,
    endDate: challenge.endDate,
    currentValue,
    percentComplete,
    daysRemaining,
    status,
    recentEntries,
  }
}
