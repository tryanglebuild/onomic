'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from '@/components/ui/toast'

/**
 * Shows a server-redirect error (`?error=...`) as a themed toast, then
 * strips the param from the URL — server actions still communicate errors
 * via redirect + query string, but the query string no longer stays stuck
 * in the address bar.
 */
export function QueryErrorToast({ error, prefix }: { error?: string; prefix?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const shown = useRef(false)

  useEffect(() => {
    if (!error || shown.current) return
    shown.current = true
    toast.error(prefix ? `${prefix}${error}` : error)
    router.replace(pathname, { scroll: false })
  }, [error, prefix, pathname, router])

  return null
}
