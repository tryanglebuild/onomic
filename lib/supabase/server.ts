import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

// Memoized per request (React's cache() resets on every new request/render
// pass — never across users or navigations). Several places in one page
// load call createClient() independently (layout + page); without this,
// each gets its own client and duplicate Supabase round-trips can't be
// deduped even when the query itself is wrapped in cache() too.
export const createClient = cache(async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component render — safe to ignore,
            // the middleware below refreshes the session on navigation.
          }
        },
      },
    }
  )
})
