'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateChallenge } from '@/lib/challenges/actions'
import type { ChallengeSummary } from '@/lib/challenges/summary'

export function EditChallengeDialog({ summary }: { summary: ChallengeSummary }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(summary.name)
  const [targetValue, setTargetValue] = useState(String(summary.targetValue))
  const [baselineValue, setBaselineValue] = useState(summary.baselineValue !== null ? String(summary.baselineValue) : '')
  const [startDate, setStartDate] = useState(summary.startDate)
  const [endDate, setEndDate] = useState(summary.endDate)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = Number.parseFloat(targetValue)
    if (!name.trim()) {
      setError('Indique um nome.')
      return
    }
    if (!(parsedTarget > 0)) {
      setError('Indique um valor alvo superior a zero.')
      return
    }
    if (!(endDate > startDate)) {
      setError('A data de fim tem de ser depois da data de início.')
      return
    }
    const parsedBaseline = baselineValue.trim() === '' ? null : Number.parseFloat(baselineValue)
    if (summary.metricType === 'category_reduction' && (parsedBaseline === null || !(parsedBaseline >= 0))) {
      setError('Indique o valor de referência do período anterior.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await updateChallenge({
          id: summary.id,
          name: name.trim(),
          metricType: summary.metricType,
          targetValue: parsedTarget,
          startDate,
          endDate,
          baselineValue: parsedBaseline,
        })
        setOpen(false)
      } catch {
        setError('Não foi possível guardar. Tente novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Editar desafio</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-target">
                {summary.metricType === 'no_spend_streak' ? 'Objetivo (dias sem gastar)' : 'Valor alvo (€)'}
              </Label>
              <Input
                id="edit-target"
                type="number"
                min="0.01"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            {summary.metricType === 'category_reduction' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-baseline">Gasto no período anterior (€)</Label>
                <Input
                  id="edit-baseline"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-start">Início</Label>
                <Input id="edit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-end">Fim</Label>
                <Input id="edit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
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
