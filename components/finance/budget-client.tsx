'use client'

import { useMemo, useState } from 'react'
import { BudgetSummary } from './budget-summary'
import { ItemList, type FinanceItem } from './item-list'
import { toMonthlyAmount } from '@/lib/finance/cadence'
import type { IncomeSourceRow, RecurringExpenseRow, LookupOption } from '@/lib/finance/queries'
import {
  createIncomeSource,
  updateIncomeSource,
  setIncomeSourceActive,
  deleteIncomeSource,
  createRecurringExpense,
  updateRecurringExpense,
  setRecurringExpenseActive,
  deleteRecurringExpense,
} from '@/lib/finance/actions'

function labelFor(id: string, options: LookupOption[]): string {
  return options.find((o) => o.id === id)?.label ?? 'Outro'
}

export function BudgetClient({
  workspaceId,
  incomeSources,
  recurringExpenses,
  incomeSourceTypes,
  expenseCategories,
}: {
  workspaceId: string
  incomeSources: IncomeSourceRow[]
  recurringExpenses: RecurringExpenseRow[]
  incomeSourceTypes: LookupOption[]
  expenseCategories: LookupOption[]
}) {
  const [tab, setTab] = useState<'income' | 'expenses'>('income')

  const monthlyIncome = useMemo(
    () =>
      incomeSources
        .filter((s) => s.active)
        .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.cadence), 0),
    [incomeSources]
  )
  const monthlyExpenses = useMemo(
    () =>
      recurringExpenses
        .filter((e) => e.active)
        .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.cadence), 0),
    [recurringExpenses]
  )

  const incomeItems: FinanceItem[] = incomeSources.map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.amount,
    cadence: s.cadence,
    notes: s.notes,
    active: s.active,
    lookupId: s.source_type_id,
    lookupLabel: labelFor(s.source_type_id, incomeSourceTypes),
  }))

  const expenseItems: FinanceItem[] = recurringExpenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    cadence: e.cadence,
    notes: e.notes,
    active: e.active,
    lookupId: e.category_id,
    lookupLabel: labelFor(e.category_id, expenseCategories),
  }))

  return (
    <div className="flex flex-col gap-8">
      <BudgetSummary monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab('income')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'income' ? 'border-b-2 border-primary text-ink' : 'text-muted'}`}
        >
          Rendimento
        </button>
        <button
          type="button"
          onClick={() => setTab('expenses')}
          className={`px-4 py-2 text-sm font-medium ${tab === 'expenses' ? 'border-b-2 border-primary text-ink' : 'text-muted'}`}
        >
          Gastos Fixos
        </button>
      </div>

      {tab === 'income' ? (
        <ItemList
          items={incomeItems}
          lookupLabel="Tipo"
          lookupOptions={incomeSourceTypes}
          emptyTitle="Ainda não configurou nenhum rendimento"
          emptyDescription="Adicione o seu salário ou outra fonte de rendimento para ver o seu saldo disponível estimado."
          addLabel="Adicionar rendimento"
          onCreate={(values) =>
            createIncomeSource({
              workspaceId,
              sourceTypeId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onUpdate={(id, values) =>
            updateIncomeSource({
              id,
              sourceTypeId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onDelete={deleteIncomeSource}
          onToggleActive={setIncomeSourceActive}
        />
      ) : (
        <ItemList
          items={expenseItems}
          lookupLabel="Categoria"
          lookupOptions={expenseCategories}
          emptyTitle="Ainda não configurou nenhum gasto fixo"
          emptyDescription="Adicione os seus gastos recorrentes (renda, subscrições, etc.) para ver o seu saldo disponível estimado."
          addLabel="Adicionar gasto fixo"
          onCreate={(values) =>
            createRecurringExpense({
              workspaceId,
              categoryId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onUpdate={(id, values) =>
            updateRecurringExpense({
              id,
              categoryId: values.lookupId,
              name: values.name,
              amount: values.amount,
              cadence: values.cadence,
              notes: values.notes,
            })
          }
          onDelete={deleteRecurringExpense}
          onToggleActive={setRecurringExpenseActive}
        />
      )}
    </div>
  )
}
