'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { signUp, suggestHandle, checkHandleAvailability } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { isValidHandleFormat, normalizeHandle } from '@/lib/handles'
import { RefreshCw, Check, X } from 'lucide-react'

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'
type AsyncCheckStatus = 'checking' | 'available' | 'taken' | 'error' | null

export function SignupForm() {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleTouched, setHandleTouched] = useState(false)
  const [asyncStatus, setAsyncStatus] = useState<AsyncCheckStatus>(null)
  const [isPending, startTransition] = useTransition()

  // Auto-suggest once the user has typed a name, as long as they haven't
  // edited the handle themselves yet.
  useEffect(() => {
    if (handleTouched || name.trim().length === 0) return
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const suggestion = await suggestHandle(name)
          setHandle(suggestion)
        } catch {
          // Silent no-op — the handle field just doesn't get auto-filled;
          // the user can still type one manually and it's re-validated
          // server-side in signUp.
        }
      })
    }, 400)
    return () => clearTimeout(timeout)
  }, [name, handleTouched])

  // Format validity is derived synchronously from the handle on every render —
  // no effect needed for it.
  const normalizedHandle = normalizeHandle(handle)
  const formatStatus: 'idle' | 'invalid' | 'valid' = !normalizedHandle
    ? 'idle'
    : !isValidHandleFormat(normalizedHandle)
      ? 'invalid'
      : 'valid'

  // Live availability check, debounced, whenever the handle becomes a
  // well-formed value. Both state updates happen inside timer callbacks
  // rather than synchronously in the effect body.
  useEffect(() => {
    if (formatStatus !== 'valid') {
      const reset = setTimeout(() => setAsyncStatus(null), 0)
      return () => clearTimeout(reset)
    }
    let cancelled = false
    const checkingTimeout = setTimeout(() => setAsyncStatus('checking'), 0)
    const resultTimeout = setTimeout(async () => {
      try {
        const available = await checkHandleAvailability(normalizedHandle)
        if (!cancelled) setAsyncStatus(available ? 'available' : 'taken')
      } catch {
        // Distinct from 'checking' so a failed request doesn't spin
        // forever — real validation still happens server-side in signUp.
        if (!cancelled) setAsyncStatus('error')
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(checkingTimeout)
      clearTimeout(resultTimeout)
    }
  }, [normalizedHandle, formatStatus])

  const status: HandleStatus = formatStatus !== 'valid' ? formatStatus : (asyncStatus ?? 'checking')

  async function handleSuggestAgain() {
    startTransition(async () => {
      try {
        const suggestion = await suggestHandle(name || 'user')
        // Deliberately do NOT reset handleTouched to false here: doing so
        // would re-arm the auto-suggest effect above (deps: [name,
        // handleTouched]), whose debounced timer would then fire ~400ms
        // later and overwrite the suggestion this button just set. Marking
        // the handle as touched keeps this button as the sole source of
        // truth until the user edits the name or handle again.
        setHandleTouched(true)
        setHandle(suggestion)
      } catch {
        // Silent no-op — button just doesn't update the handle this time.
      }
    })
  }

  return (
    <form action={signUp} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="O seu nome"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              @
            </span>
            <Input
              id="handle"
              name="handle"
              type="text"
              required
              className="pl-7"
              value={handle}
              onChange={(e) => {
                setHandleTouched(true)
                setHandle(normalizeHandle(e.target.value))
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {status === 'checking' && <RefreshCw className="size-4 animate-spin text-muted" />}
              {status === 'available' && <Check className="size-4 text-primary-strong" />}
              {(status === 'taken' || status === 'invalid' || status === 'error') && (
                <X className="size-4 text-danger" />
              )}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleSuggestAgain}
            disabled={isPending}
          >
            Sugerir outro
          </Button>
        </div>
        {status === 'taken' && <p className="text-xs text-danger">Este handle já está a ser usado.</p>}
        {status === 'invalid' && (
          <p className="text-xs text-danger">3–20 caracteres, letras minúsculas, números e &quot;_&quot;.</p>
        )}
        {status === 'error' && (
          <p className="text-xs text-danger">Não foi possível verificar o handle. Tente novamente.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="voce@email.com" required autoComplete="email" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password_confirmation">Confirmar</Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            placeholder="Repita a palavra-passe"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birth_date">Data de nascimento (opcional)</Label>
        <Input id="birth_date" name="birth_date" type="date" autoComplete="bday" />
      </div>

      <Checkbox
        id="terms_accepted"
        name="terms_accepted"
        required
        label={
          <>
            Li e aceito os{' '}
            <Link href="/terms" target="_blank" className="font-medium text-primary-strong hover:underline">
              Termos e Condições
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-primary-strong hover:underline">
              Política de Privacidade
            </Link>
            .
          </>
        }
      />

      <Button type="submit" className="mt-2 w-full" disabled={status === 'taken' || status === 'invalid'}>
        Criar conta
      </Button>
    </form>
  )
}
