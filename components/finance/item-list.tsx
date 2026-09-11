'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CADENCE_OPTIONS, type Cadence, formatCurrency } from '@/lib/finance/cadence'
import { ItemFormDialog, type FinanceItemValues } from './item-form-dialog'

export type FinanceItem = {
  id: string
  name: string
  amount: number
  cadence: Cadence
  notes: string | null
  active: boolean
  lookupId: string
  lookupLabel: string
}

function cadenceLabel(cadence: Cadence): string {
  return CADENCE_OPTIONS.find((o) => o.value === cadence)?.label ?? cadence
}

export function ItemList({
  items,
  lookupLabel,
  lookupOptions,
  emptyTitle,
  emptyDescription,
  addLabel,
  onCreate,
  onUpdate,
  onDelete,
  onToggleActive,
}: {
  items: FinanceItem[]
  lookupLabel: string
  lookupOptions: { id: string; label: string }[]
  emptyTitle: string
  emptyDescription: string
  addLabel: string
  onCreate: (values: FinanceItemValues) => Promise<void>
  onUpdate: (id: string, values: FinanceItemValues) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onToggleActive: (id: string, active: boolean) => Promise<void>
}) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)

  async function handleToggleActive(item: FinanceItem) {
    setPendingId(item.id)
    setErrorId(null)
    try {
      await onToggleActive(item.id, !item.active)
    } catch {
      setErrorId(item.id)
    } finally {
      setPendingId(null)
    }
  }

  async function handleDelete(item: FinanceItem) {
    setPendingId(item.id)
    setErrorId(null)
    try {
      await onDelete(item.id)
    } catch {
      setErrorId(item.id)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ItemFormDialog
        trigger={<Button size="sm">{addLabel}</Button>}
        title={addLabel}
        lookupLabel={lookupLabel}
        lookupOptions={lookupOptions}
        onSubmit={onCreate}
      />

      {items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <h3 className="font-display text-lg font-medium">{emptyTitle}</h3>
          <p className="text-sm text-muted">{emptyDescription}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-0.5">
                <span className={`font-medium ${item.active ? 'text-ink' : 'text-muted line-through'}`}>
                  {item.name}
                </span>
                <span className="text-sm text-muted">
                  {formatCurrency(item.amount)} · {cadenceLabel(item.cadence)} · {item.lookupLabel}
                </span>
                {errorId === item.id && (
                  <p className="mt-1 text-xs text-danger">Não foi possível concluir a ação. Tente novamente.</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  disabled={pendingId === item.id}
                  className="text-sm text-muted hover:text-ink"
                >
                  {item.active ? 'Desativar' : 'Ativar'}
                </button>
                <ItemFormDialog
                  trigger={
                    <button type="button" aria-label="Editar" className="text-muted hover:text-ink">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                  }
                  title={`Editar ${item.name}`}
                  lookupLabel={lookupLabel}
                  lookupOptions={lookupOptions}
                  initialValues={{
                    name: item.name,
                    amount: item.amount,
                    cadence: item.cadence,
                    lookupId: item.lookupId,
                    notes: item.notes,
                  }}
                  onSubmit={(values) => onUpdate(item.id, values)}
                />
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={pendingId === item.id}
                  aria-label="Remover"
                  className="text-muted hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
