export type Cadence = 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

export const CADENCE_VALUES: Cadence[] = ['diaria', 'semanal', 'mensal', 'trimestral', 'semestral', 'anual']

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

const MONTHLY_FACTOR: Record<Cadence, number> = {
  diaria: 30.44,
  semanal: 4.348,
  mensal: 1,
  trimestral: 1 / 3,
  semestral: 1 / 6,
  anual: 1 / 12,
}

export function toMonthlyAmount(amount: number, cadence: Cadence): number {
  return amount * MONTHLY_FACTOR[cadence]
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' })

export function formatCurrency(amount: number): string {
  return CURRENCY_FORMATTER.format(amount)
}
