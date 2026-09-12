'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { addChallengeEntry } from '@/lib/challenges/actions'
import type { MetricType } from '@/lib/challenges/summary'

const AMOUNT_LABEL: Record<MetricType, string> = {
  spending_limit: 'Valor gasto (€)',
  savings_target: 'Valor poupado (€)',
  category_reduction: 'Valor gasto (€)',
  no_spend_streak: 'Valor gasto (€)',
}

export function AddEntryDialog({
  challengeId,
  startDate,
  endDate,
  metricType,
}: {
  challengeId: string
  startDate: string
  endDate: string
  metricType: MetricType
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = Number.parseFloat(amount)
    if (!(parsedAmount > 0)) {
      setError('Indique um valor superior a zero.')
      return
    }
    if (!occurredOn) {
      setError('Indique uma data.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await addChallengeEntry({
          challengeId,
          amount: parsedAmount,
          occurredOn,
          note: note.trim() || null,
        })
        setOpen(false)
        setAmount('')
        setOccurredOn('')
        setNote('')
      } catch {
        setError('Não foi possível registar. Confirme que a data está dentro do período do desafio.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">Registar entrada</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Nova entrada</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-amount">{AMOUNT_LABEL[metricType]}</Label>
              <Input
                id="entry-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-date">Data</Label>
              <Input
                id="entry-date"
                type="date"
                min={startDate}
                max={endDate}
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entry-note">Nota (opcional)</Label>
              <Input id="entry-note" value={note} onChange={(e) => setNote(e.target.value)} />
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
