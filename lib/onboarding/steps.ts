import type { LucideIcon } from 'lucide-react'
import { Compass, ShieldCheck, TrendingUp, Layers, CheckCircle2 } from 'lucide-react'

export type PrimaryGoal = 'budgeting' | 'saving' | 'investing' | 'family'
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type InvestmentFrequency = 'monthly' | 'quarterly'
export type AssetPreference = 'crypto' | 'stocks' | 'etfs' | 'undecided'

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'budgeting', label: 'Controlar gastos e orçamento' },
  { value: 'saving', label: 'Poupar para um objetivo' },
  { value: 'investing', label: 'Investir e fazer crescer o património' },
  { value: 'family', label: 'Gerir finanças em família' },
]

export const RISK_PROFILE_OPTIONS: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservador', description: 'Prefiro segurança, mesmo com retornos mais baixos.' },
  { value: 'moderate', label: 'Moderado', description: 'Aceito algum risco por um retorno melhor.' },
  { value: 'aggressive', label: 'Arrojado', description: 'Procuro o maior retorno possível, aceito mais volatilidade.' },
]

export const INVESTMENT_FREQUENCY_OPTIONS: { value: InvestmentFrequency; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
]

export const ASSET_PREFERENCE_OPTIONS: { value: AssetPreference; label: string }[] = [
  { value: 'crypto', label: 'Criptomoedas' },
  { value: 'stocks', label: 'Ações' },
  { value: 'etfs', label: 'ETFs' },
  { value: 'undecided', label: 'Ainda não sei' },
]

export const ONBOARDING_STEPS: { step: number; title: string; icon: LucideIcon }[] = [
  { step: 1, title: 'Objetivo', icon: Compass },
  { step: 2, title: 'Perfil de risco', icon: ShieldCheck },
  { step: 3, title: 'Meta de investimento', icon: TrendingUp },
  { step: 4, title: 'Preferência de ativos', icon: Layers },
  { step: 5, title: 'Resumo', icon: CheckCircle2 },
]

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length
