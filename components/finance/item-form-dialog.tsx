'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CADENCE_OPTIONS, type Cadence } from '@/lib/finance/cadence'

export type FinanceItemValues = {
  name: string
  amount: number
  cadence: Cadence
  lookupId: string
  notes: string | null
}

export function ItemFormDialog({
  trigger,
  title,
  lookupLabel,
  lookupOptions,
  initialValues,
  onSubmit,
}: {
  trigger: React.ReactNode
  title: string
  lookupLabel: string
  lookupOptions: { id: string; label: string }[]
  initialValues?: FinanceItemValues
  onSubmit: (values: FinanceItemValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialValues?.name ?? '')
  const [amount, setAmount] = useState(initialValues?.amount.toString() ?? '')
  const [cadence, setCadence] = useState<Cadence>(initialValues?.cadence ?? 'mensal')
  const [lookupId, setLookupId] = useState(initialValues?.lookupId ?? lookupOptions[0]?.id ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setName(initialValues?.name ?? '')
      setAmount(initialValues?.amount.toString() ?? '')
      setCadence(initialValues?.cadence ?? 'mensal')
      setLookupId(initialValues?.lookupId ?? lookupOptions[0]?.id ?? '')
      setNotes(initialValues?.notes ?? '')
      setError(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (!name.trim()) {
      setError('Indique um nome.')
      return
    }
    if (!(parsedAmount > 0)) {
      setError('Indique um valor superior a zero.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await onSubmit({
          name: name.trim(),
          amount: parsedAmount,
          cadence,
          lookupId,
          notes: notes.trim() || null,
        })
        setOpen(false)
      } catch {
        setError('Não foi possível guardar. Tente novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-name">Nome</Label>
              <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-amount">Valor (€)</Label>
              <Input
                id="item-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-cadence">Cadência</Label>
              <select
                id="item-cadence"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              >
                {CADENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-lookup">{lookupLabel}</Label>
              <select
                id="item-lookup"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
              >
                {lookupOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="item-notes">Notas (opcional)</Label>
              <Input id="item-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={isPending} className="mt-2">
              Guardar
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
