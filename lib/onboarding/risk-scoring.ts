import type { InvestmentHorizon, InvestmentExperience, LossReaction, RiskProfile } from './steps'

export const HORIZON_POINTS: Record<InvestmentHorizon, number> = { short: 0, medium: 1, long: 2 }
export const EXPERIENCE_POINTS: Record<InvestmentExperience, number> = { none: 0, some: 1, experienced: 2 }
export const LOSS_REACTION_POINTS: Record<LossReaction, number> = { sell_all: 0, sell_some: 1, hold: 2, buy_more: 3 }

export const HORIZON_MAX = 2
export const EXPERIENCE_MAX = 2
export const LOSS_REACTION_MAX = 3

/**
 * Deterministic risk-profile scoring — never asked directly, always derived
 * from three behavioral answers (0-7 points total). A missing answer scores
 * 0 for that dimension rather than throwing, so an incomplete questionnaire
 * still produces a conservative-leaning result.
 */
export function computeRiskProfile(
  horizon: InvestmentHorizon | null,
  experience: InvestmentExperience | null,
  lossReaction: LossReaction | null
): RiskProfile {
  const score =
    (horizon ? HORIZON_POINTS[horizon] : 0) +
    (experience ? EXPERIENCE_POINTS[experience] : 0) +
    (lossReaction ? LOSS_REACTION_POINTS[lossReaction] : 0)

  if (score <= 2) return 'conservative'
  if (score <= 4) return 'moderate'
  return 'aggressive'
}
