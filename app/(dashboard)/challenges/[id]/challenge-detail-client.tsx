'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { abandonChallenge, deleteChallenge } from '@/lib/challenges/actions'

export function AbandonButton({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await abandonChallenge(challengeId)
          router.refresh()
        })
      }
    >
      Abandonar desafio
    </Button>
  )
}

export function DeleteButton({ challengeId }: { challengeId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm('Apagar este desafio e todas as suas entradas? Esta ação não pode ser desfeita.')) return
        startTransition(async () => {
          await deleteChallenge(challengeId)
          router.push('/challenges')
        })
      }}
    >
      Apagar desafio
    </Button>
  )
}
