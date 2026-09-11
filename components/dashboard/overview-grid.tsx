import { FinancialSummaryWidget } from './widgets/financial-summary-widget'
import { ExpensesByCategoryWidget } from './widgets/expenses-by-category-widget'
import { IncomeVsExpensesWidget } from './widgets/income-vs-expenses-widget'
import { ProjectedBalanceWidget } from './widgets/projected-balance-widget'
import { RiskProfileWidget } from './widgets/risk-profile-widget'
import { PendingActionsWidget } from './widgets/pending-actions-widget'
import {
  groupMonthlyTotals,
  sumActiveMonthly,
  buildProjectedBalanceSeries,
  buildRiskRadarData,
  buildPendingActions,
} from '@/lib/dashboard/overview'
import type { IncomeSourceRow, RecurringExpenseRow, LookupOption } from '@/lib/finance/queries'
import type { InvestmentHorizon, InvestmentExperience, LossReaction } from '@/lib/onboarding/steps'

export function OverviewGrid({
  incomeSources,
  recurringExpenses,
  expenseCategories,
  onboardingCompleted,
  investmentHorizon,
  investmentExperience,
  lossReaction,
  pendingInviteCount,
  isFamilyWorkspace,
}: {
  incomeSources: IncomeSourceRow[]
  recurringExpenses: RecurringExpenseRow[]
  expenseCategories: LookupOption[]
  onboardingCompleted: boolean
  investmentHorizon: InvestmentHorizon | null
  investmentExperience: InvestmentExperience | null
  lossReaction: LossReaction | null
  pendingInviteCount: number
  isFamilyWorkspace: boolean
}) {
  const monthlyIncome = sumActiveMonthly(incomeSources)
  const monthlyExpenses = sumActiveMonthly(recurringExpenses)
  const hasProjectionData = monthlyIncome > 0 || monthlyExpenses > 0

  const expensesByCategory = groupMonthlyTotals(recurringExpenses, (e) => e.category_id, expenseCategories)
  const projectedBalance = buildProjectedBalanceSeries(monthlyIncome - monthlyExpenses)
  const riskRadarData = buildRiskRadarData(investmentHorizon, investmentExperience, lossReaction)
  const pendingActions = buildPendingActions({
    onboardingCompleted,
    hasIncome: incomeSources.some((s) => s.active),
    hasExpenses: recurringExpenses.some((e) => e.active),
    pendingInviteCount,
    isFamilyWorkspace,
  })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <FinancialSummaryWidget monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      <ExpensesByCategoryWidget data={expensesByCategory} />
      <IncomeVsExpensesWidget monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
      <div className="xl:col-span-2">
        <ProjectedBalanceWidget data={projectedBalance} hasData={hasProjectionData} />
      </div>
      <RiskProfileWidget data={riskRadarData} />
      <div className="xl:col-span-3 lg:col-span-2">
        <PendingActionsWidget actions={pendingActions} />
      </div>
    </div>
  )
}
