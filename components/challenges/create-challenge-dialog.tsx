'use client'

import { useMemo, useState, useTransition } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Wallet, PiggyBank, TrendingDown, Flame, Sparkles, AlertCircle, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logomark } from '@/components/ui/logomark'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DatePicker } from '@/components/ui/date-picker'
import { createChallenge } from '@/lib/challenges/actions'
import { formatCurrency } from '@/lib/finance/cadence'
import type { MetricType } from '@/lib/challenges/summary'
import type { ChallengeTemplateRow } from '@/lib/challenges/queries'
import type { LookupOption } from '@/lib/finance/queries'
import { cn } from '@/lib/utils'

const METRIC_CONFIG: Record<MetricType, { label: string; icon: LucideIcon; blurb: string }> = {
  spending_limit: {
    label: 'Limite de gastos',
    icon: Wallet,
    blurb: 'Define um teto e mantém-te dentro dele.',
  },
  savings_target: {
    label: 'Meta de poupança',
    icon: PiggyBank,
    blurb: 'Cada euro poupado aproxima-te da meta.',
  },
  category_reduction: {
    label: 'Reduzir uma categoria',
    icon: TrendingDown,
    blurb: 'Reduz o que gastas numa categoria específica.',
  },
  no_spend_streak: {
    label: 'Sequência sem gastos',
    icon: Flame,
    blurb: 'Constrói uma sequência de dias sem gastar.',
  },
}

const NO_CATEGORY = '__none__'

function daysBetween(start: string, end: string): number | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!(ms > 0)) return null
  return Math.round(ms / 86_400_000)
}

function formatISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const QUICK_RANGES: { label: string; computeEnd: (today: Date) => Date }[] = [
  { label: 'Esta semana', computeEnd: (today) => addDays(today, 6 - today.getDay()) },
  { label: 'Próximos 15 dias', computeEnd: (today) => addDays(today, 15) },
  { label: 'Este mês', computeEnd: (today) => new Date(today.getFullYear(), today.getMonth() + 1, 0) },
]

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
  const todayISO = useMemo(() => formatISODate(new Date()), [])
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
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const config = METRIC_CONFIG[metricType]
  const Icon = config.icon
  const duration = daysBetween(startDate, endDate)
  const isDirty = Boolean(
    name.trim() ||
      targetValue ||
      baselineValue ||
      categoryId ||
      startDate ||
      endDate ||
      ownerUserId !== 'family' ||
      metricType !== 'spending_limit' ||
      templateId
  )

  function applyTemplate(selectedId: string | null) {
    const template = selectedId ? templates.find((t) => t.id === selectedId) : undefined
    setTemplateId(selectedId)
    if (template) setMetricType(template.metric_type)
  }

  function applyQuickRange(computeEnd: (today: Date) => Date) {
    const today = new Date()
    setStartDate(formatISODate(today))
    setEndDate(formatISODate(computeEnd(today)))
  }

  function resetForm() {
    setName('')
    setTargetValue('')
    setBaselineValue('')
    setStartDate('')
    setEndDate('')
    setMetricType('spending_limit')
    setCategoryId('')
    setOwnerUserId('family')
    setTemplateId(null)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTarget = Number.parseFloat(targetValue)
    if (!name.trim()) {
      setError('Indique um nome.')
      return
    }
    const targetIsValid = metricType === 'no_spend_streak' ? parsedTarget >= 0 : parsedTarget > 0
    if (!targetIsValid) {
      setError(
        metricType === 'no_spend_streak'
          ? 'Indique um número de dias válido (0 ou mais).'
          : 'Indique um valor alvo superior a zero.'
      )
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
        resetForm()
      } catch {
        setError('Não foi possível criar o desafio. Tente novamente.')
      }
    })
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setOpen(true)
      return
    }
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    setOpen(false)
    resetForm()
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button size="sm">Criar desafio</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-3rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 grid-cols-1 overflow-hidden rounded-2xl bg-surface shadow-lifted focus:outline-none sm:grid-cols-[340px_minmax(0,1fr)]">
          {/* Left: living preview panel */}
          <div className="grain-overlay hidden flex-col justify-between gap-10 bg-navy px-8 py-9 text-white sm:flex">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <Logomark className="size-6 text-white" />
                <span className="font-display text-base font-medium tracking-tight">Onomic</span>
              </div>

              <div className="flex flex-col items-start gap-3">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary transition-colors">
                  <Icon className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-ink">Novo desafio</p>
                  <h2 className="font-display text-2xl font-medium">{config.label}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-ink">{config.blurb}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white/10 p-5">
              <p className={cn('truncate font-display text-lg font-medium', name.trim() ? 'text-white' : 'text-white/40')}>
                {name.trim() || 'O teu desafio'}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-primary">
                {targetValue && Number.parseFloat(targetValue) > 0
                  ? metricType === 'no_spend_streak'
                    ? `${Math.round(Number.parseFloat(targetValue))} dias`
                    : formatCurrency(Number.parseFloat(targetValue))
                  : '—'}
              </p>
              {duration !== null && (
                <span className="mt-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-navy-ink">
                  {duration} dias de desafio
                </span>
              )}
            </div>
          </div>

          {/* Right: form */}
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between px-8 pt-8">
              <Dialog.Title className="font-display text-xl font-medium sm:hidden">Novo desafio</Dialog.Title>
              <Dialog.Title className="hidden font-display text-2xl font-medium sm:block">Detalhes</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="text-muted hover:text-ink" aria-label="Fechar">
                  <X className="size-5" aria-hidden />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto px-8 pb-8">
              {templates.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Modelo (opcional)</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate(null)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                        templateId === null
                          ? 'border-primary bg-primary-soft text-primary-ink'
                          : 'border-border-strong bg-surface text-ink-soft hover:bg-surface-sunken'
                      )}
                    >
                      Personalizado
                    </button>
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                          templateId === t.id
                            ? 'border-primary bg-primary-soft text-primary-ink'
                            : 'border-border-strong bg-surface text-ink-soft hover:bg-surface-sunken'
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-name">Nome</Label>
                <Input id="challenge-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sem café fora em setembro" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(METRIC_CONFIG) as [MetricType, typeof METRIC_CONFIG[MetricType]][]).map(([value, cfg]) => {
                    const ChipIcon = cfg.icon
                    const active = metricType === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMetricType(value)}
                        className={cn(
                          'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary-soft text-primary-ink'
                            : 'border-border-strong bg-surface text-ink-soft hover:bg-surface-sunken'
                        )}
                      >
                        <ChipIcon className={cn('size-4 shrink-0', active ? 'text-primary-strong' : 'text-muted')} aria-hidden />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="challenge-target">
                  {metricType === 'no_spend_streak' ? 'Objetivo (dias sem gastar)' : 'Valor alvo (€)'}
                </Label>
                <Input
                  id="challenge-target"
                  type="number"
                  min={metricType === 'no_spend_streak' ? '0' : '0.01'}
                  step={metricType === 'no_spend_streak' ? '1' : '0.01'}
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
                  <Select
                    value={categoryId || NO_CATEGORY}
                    onValueChange={(v) => setCategoryId(v === NO_CATEGORY ? '' : v)}
                  >
                    <SelectTrigger id="challenge-category">
                      <SelectValue placeholder="Sem categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {members.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <Label>Quem participa</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setOwnerUserId('family')}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                        ownerUserId === 'family'
                          ? 'border-primary bg-primary-soft text-primary-ink'
                          : 'border-border-strong bg-surface text-ink-soft hover:bg-surface-sunken'
                      )}
                    >
                      Toda a família
                    </button>
                    {members.map((m) => (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => setOwnerUserId(m.userId)}
                        className={cn(
                          'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                          ownerUserId === m.userId
                            ? 'border-primary bg-primary-soft text-primary-ink'
                            : 'border-border-strong bg-surface text-ink-soft hover:bg-surface-sunken'
                        )}
                      >
                        Só {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label>Período</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_RANGES.map((range) => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() => applyQuickRange(range.computeEnd)}
                        className="rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-ink"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="challenge-start" className="text-xs font-normal text-muted">
                      Início
                    </Label>
                    <DatePicker id="challenge-start" value={startDate} onChange={setStartDate} min={todayISO} max={endDate || undefined} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="challenge-end" className="text-xs font-normal text-muted">
                      Fim
                    </Label>
                    <DatePicker id="challenge-end" value={endDate} onChange={setEndDate} min={startDate || todayISO} />
                  </div>
                </div>
              </div>
              {duration !== null && (
                <p className="-mt-3 text-xs text-muted sm:hidden">{duration} dias de desafio</p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2.5 text-sm text-danger">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>{error}</p>
                </div>
              )}

              <Button type="submit" disabled={isPending} size="lg" className="mt-1">
                <Sparkles className="size-4" aria-hidden />
                Ativar desafio
              </Button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Descartar este desafio?"
        description="Ainda não guardaste isto. Se saíres agora, perdes o que preencheste."
        confirmLabel="Descartar"
        cancelLabel="Continuar a editar"
        onConfirm={() => {
          setDiscardOpen(false)
          setOpen(false)
          resetForm()
        }}
      />
    </Dialog.Root>
  )
}
