'use client'

import { useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createChallenge } from '@/lib/challenges/actions'
import type { MetricType } from '@/lib/challenges/summary'
import type { ChallengeTemplateRow } from '@/lib/challenges/queries'
import type { LookupOption } from '@/lib/finance/queries'

const METRIC_LABELS: Record<MetricType, string> = {
  spending_limit: 'Limite de gastos',
  savings_target: 'Meta de poupança',
  category_reduction: 'Reduzir uma categoria',
  no_spend_streak: 'Sequência sem gastos',
}

export function CreateChallengeDialog({
  workspaceId,
  templates,
  categories,
  members,
}: {
  workspaceId: string
  templates: ChallengeTemplateRow[]
  categories: LookupOption[]
  members: { userId: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [metricType, setMetricType] = useState<MetricType>('spending_limit')
  const [targetValue, setTargetValue] = useState('')
  const [baselineValue, setBaselineValue] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [ownerUserId, setOwnerUserId] = useState<string>('family')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function applyTemplate(selectedId: string) {
    const template = templates.find((t) => t.id === selectedId)
    setTemplateId(selectedId || null)
    if (template) setMetricType(template.metric_type)
  }

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
    if (!startDate || !endDate || endDate <= startDate) {
      setError('Indique um período válido (data de fim depois da data de início).')
      return
    }
    const parsedBaseline = baselineValue.trim() === '' ? null : Number.parseFloat(baselineValue)
    if (metricType === 'category_reduction' && (parsedBaseline === null || !(parsedBaseline >= 0))) {
      setError('Indique o valor de referência do período anterior.')
      return
    }

    startTransition(async () => {
      try {
        setError(null)
        await createChallenge({
          workspaceId,
          ownerUserId: ownerUserId === 'family' ? null : ownerUserId,
          templateId,
          name: name.trim(),
          metricType,
          targetValue: parsedTarget,
          categoryId: categoryId || null,
          baselineValue: parsedBaseline,
          startDate,
          endDate,
        })
        setOpen(false)
        setName('')
        setTargetValue('')
        setBaselineValue('')
        setStartDate('')
        setEndDate('')
        setMetricType('spending_limit')
        setCategoryId('')
        setOwnerUserId('family')
        setTemplateId(null)
        setFormKey((k) => k + 1)
      } catch {
        setError('Não foi possível criar o desafio. Tente novamente.')
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm">Criar desafio</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lifted focus:outline-none">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-xl font-medium">Novo desafio</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                <X className="size-5" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            {templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-template">Modelo (opcional)</Label>
                <select
                  key={formKey}
                  id="challenge-template"
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Personalizado</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-name">Nome</Label>
              <Input id="challenge-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-metric">Tipo</Label>
              <select
                id="challenge-metric"
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as MetricType)}
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {Object.entries(METRIC_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="challenge-target">
                {metricType === 'no_spend_streak' ? 'Objetivo (dias sem gastar)' : 'Valor alvo (€)'}
              </Label>
              <Input
                id="challenge-target"
                type="number"
                min="0.01"
                step="0.01"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            {metricType === 'category_reduction' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-baseline">Gasto no período anterior (€)</Label>
                <Input
                  id="challenge-baseline"
                  type="number"
                  min="0"
                  step="0.01"
                  value={baselineValue}
                  onChange={(e) => setBaselineValue(e.target.value)}
                />
              </div>
            )}

            {categories.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-category">Categoria (opcional)</Label>
                <select
                  id="challenge-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {members.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-owner">Quem participa</Label>
                <select
                  id="challenge-owner"
                  value={ownerUserId}
                  onChange={(e) => setOwnerUserId(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="family">Toda a família</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      Só {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-start">Início</Label>
                <Input id="challenge-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-end">Fim</Label>
                <Input id="challenge-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" disabled={isPending} className="mt-2">
              Criar desafio
            </Button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
