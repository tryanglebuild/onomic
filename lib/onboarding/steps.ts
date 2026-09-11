import type { LucideIcon } from 'lucide-react'
import {
  Compass,
  Hourglass,
  GraduationCap,
  TrendingDown,
  Target,
  TrendingUp,
  Layers,
  CheckCircle2,
} from 'lucide-react'

export type PrimaryGoal = 'budgeting' | 'saving' | 'investing' | 'family'
export type InvestmentHorizon = 'short' | 'medium' | 'long'
export type InvestmentExperience = 'none' | 'some' | 'experienced'
export type LossReaction = 'sell_all' | 'sell_some' | 'hold' | 'buy_more'
export type InvestmentPurpose = 'retirement' | 'home' | 'grow_wealth' | 'passive_income' | 'other'
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive'
export type InvestmentFrequency = 'monthly' | 'quarterly'
export type AssetPreference = 'crypto' | 'stocks' | 'etfs' | 'undecided'

export const PRIMARY_GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'budgeting', label: 'Controlar gastos e orçamento' },
  { value: 'saving', label: 'Poupar para um objetivo' },
  { value: 'investing', label: 'Investir e fazer crescer o património' },
  { value: 'family', label: 'Gerir finanças em família' },
]

export const INVESTMENT_HORIZON_OPTIONS: { value: InvestmentHorizon; label: string; description: string }[] = [
  { value: 'short', label: 'Curto prazo', description: 'Menos de 2 anos.' },
  { value: 'medium', label: 'Médio prazo', description: 'Entre 2 e 5 anos.' },
  { value: 'long', label: 'Longo prazo', description: 'Mais de 5 anos.' },
]

export const INVESTMENT_EXPERIENCE_OPTIONS: { value: InvestmentExperience; label: string }[] = [
  { value: 'none', label: 'Nenhuma — nunca investi' },
  { value: 'some', label: 'Alguma — já experimentei' },
  { value: 'experienced', label: 'Tenho experiência' },
]

export const LOSS_REACTION_OPTIONS: { value: LossReaction; label: string }[] = [
  { value: 'sell_all', label: 'Vendia tudo imediatamente' },
  { value: 'sell_some', label: 'Vendia uma parte, por precaução' },
  { value: 'hold', label: 'Mantinha e esperava recuperar' },
  { value: 'buy_more', label: 'Aproveitava para comprar mais' },
]

export const INVESTMENT_PURPOSE_OPTIONS: { value: InvestmentPurpose; label: string }[] = [
  { value: 'retirement', label: 'Reforma' },
  { value: 'home', label: 'Comprar casa' },
  { value: 'grow_wealth', label: 'Crescer o património' },
  { value: 'passive_income', label: 'Gerar rendimento passivo' },
  { value: 'other', label: 'Outro' },
]

export const RISK_PROFILE_OPTIONS: { value: RiskProfile; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservador', description: 'Preferes segurança, mesmo com retornos mais baixos.' },
  { value: 'moderate', label: 'Moderado', description: 'Aceitas algum risco por um retorno melhor.' },
  { value: 'aggressive', label: 'Arrojado', description: 'Procuras o maior retorno possível, aceitas mais volatilidade.' },
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

export const ONBOARDING_STEPS: { step: number; title: string; icon: LucideIcon; blurb: string }[] = [
  {
    step: 1,
    title: 'Objetivo',
    icon: Compass,
    blurb: 'Para adaptar o dashboard e as sugestões ao que realmente procuras na plataforma.',
  },
  {
    step: 2,
    title: 'Horizonte temporal',
    icon: Hourglass,
    blurb: 'O prazo influencia diretamente o nível de risco que faz sentido para ti.',
  },
  {
    step: 3,
    title: 'Experiência',
    icon: GraduationCap,
    blurb: 'Ajuda-nos a calibrar a linguagem e as sugestões ao teu nível de confiança.',
  },
  {
    step: 4,
    title: 'Reação a uma queda',
    icon: TrendingDown,
    blurb: 'É o fator que mais pesa no cálculo do teu perfil de risco.',
  },
  {
    step: 5,
    title: 'Propósito',
    icon: Target,
    blurb: 'Saber para que investes ajuda-nos a sugerir prazos e produtos mais adequados.',
  },
  {
    step: 6,
    title: 'Meta de investimento',
    icon: TrendingUp,
    blurb: 'Usamos isto só para acompanhar o teu progresso — podes ajustar sempre que quiseres.',
  },
  {
    step: 7,
    title: 'Preferência de ativos',
    icon: Layers,
    blurb: 'Para filtrar o que te mostramos primeiro nos mercados e simulações.',
  },
  {
    step: 8,
    title: 'Resumo',
    icon: CheckCircle2,
    blurb: 'Confirma tudo antes de continuar — podes sempre editar mais tarde nas definições.',
  },
]

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length
