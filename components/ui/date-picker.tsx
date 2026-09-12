'use client'

import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toISODate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function parseISODate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    return { date, inMonth: date.getMonth() === month }
  })
}

/**
 * Onomic's themed date picker — replaces the native browser calendar (which
 * renders with OS chrome, e.g. blue selection on macOS/Chrome) with one that
 * matches the app's jade/navy design language, for consistency across every
 * date field in the product.
 */
export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = 'Selecionar data',
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => parseISODate(value), [value])
  const minDate = useMemo(() => (min ? parseISODate(min) : null), [min])
  const maxDate = useMemo(() => (max ? parseISODate(max) : null), [max])
  const today = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(() => (selected ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (selected ?? today).getMonth())

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])
  const monthLabel = useMemo(() => {
    const raw = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1))
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [viewYear, viewMonth])
  const displayValue = useMemo(
    () => (selected ? new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }).format(selected) : ''),
    [selected]
  )

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  function isDisabled(date: Date) {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  function selectDate(date: Date) {
    if (isDisabled(date)) return
    onChange(toISODate(date.getFullYear(), date.getMonth(), date.getDate()))
    setOpen(false)
  }

  function goToToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    selectDate(today)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-md border border-border-strong bg-surface px-3.5 text-left text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected ? 'text-ink' : 'text-muted'
          )}
        >
          <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate capitalize">{displayValue || placeholder}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-72 rounded-2xl border border-border bg-surface p-4 shadow-lifted focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <p className="font-display text-sm font-medium text-ink">{monthLabel}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="flex size-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-sunken"
                aria-label="Mês seguinte"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-muted">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
            {grid.map(({ date, inMonth }, i) => {
              const disabledDay = isDisabled(date)
              const isSelected = selected ? isSameDay(date, selected) : false
              const isToday = isSameDay(date, today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => selectDate(date)}
                  className={cn(
                    'mx-auto flex size-9 items-center justify-center rounded-full transition-colors',
                    !inMonth && 'text-muted/50',
                    inMonth && !isSelected && 'text-ink',
                    !disabledDay && !isSelected && 'hover:bg-primary-soft hover:text-primary-ink',
                    disabledDay && 'cursor-not-allowed opacity-30',
                    isSelected && 'bg-primary font-medium text-white',
                    !isSelected && isToday && 'font-semibold text-primary-strong ring-1 ring-inset ring-primary'
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <button
              type="button"
              onClick={() => {
                onChange('')
                setOpen(false)
              }}
              className="font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Limpar
            </button>
            <button type="button" onClick={goToToday} className="font-medium text-primary-strong transition-colors hover:underline">
              Hoje
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
