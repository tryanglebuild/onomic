import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { getActiveWorkspaceId } from '@/lib/workspaces/active-workspace'
import {
  getIncomeSources,
  getRecurringExpenses,
  getIncomeSourceTypes,
  getExpenseCategories,
} from '@/lib/finance/queries'
import { BudgetClient } from '@/components/finance/budget-client'

export default async function BudgetPage() {
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const workspaceId = await getActiveWorkspaceId(workspaces)

  if (!workspaceId) {
    redirect('/login')
  }

  const [incomeSources, recurringExpenses, incomeSourceTypes, expenseCategories] = await Promise.all([
    getIncomeSources(supabase, workspaceId),
    getRecurringExpenses(supabase, workspaceId),
    getIncomeSourceTypes(supabase),
    getExpenseCategories(supabase),
  ])

  return (
    <BudgetClient
      workspaceId={workspaceId}
      incomeSources={incomeSources}
      recurringExpenses={recurringExpenses}
      incomeSourceTypes={incomeSourceTypes}
      expenseCategories={expenseCategories}
    />
  )
}
