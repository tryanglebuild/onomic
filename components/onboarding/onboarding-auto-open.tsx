'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Detects `?onboarding=1` on mount, calls `onOpen()` once, then strips the
 * param via router.replace — same spirit as QueryErrorToast, but reading
 * the param via useSearchParams() instead of receiving it as a prop, since
 * this lives inside a layout (app/(dashboard)/layout.tsx), and Next.js
 * layouts don't receive a `searchParams` prop the way page.tsx files do.
 */
export function OnboardingAutoOpen({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get('onboarding') !== '1') return
    onOpen()

    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('onboarding')
    const query = nextParams.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    // onOpen is a fresh closure every render from the parent's useState
    // setter; the intent is "run when the param appears", not "run when
    // onOpen changes".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname, router])

  return null
}
