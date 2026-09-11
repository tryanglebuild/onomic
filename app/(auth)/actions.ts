'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/lib/navigation'
import { isValidHandleFormat, normalizeHandle } from '@/lib/handles'

export async function suggestHandle(fullName: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('suggest_handle', { p_full_name: fullName })
  if (error) throw error
  return data
}

export async function checkHandleAvailability(handle: string): Promise<boolean> {
  const normalized = normalizeHandle(handle)
  if (!isValidHandleFormat(normalized)) return false

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('is_handle_available', { p_handle: normalized })
  if (error) throw error
  return data
}

export async function signUp(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const passwordConfirmation = String(formData.get('password_confirmation'))
  const birthDate = String(formData.get('birth_date') || '').trim()
  const termsAccepted = formData.get('terms_accepted') === 'on'
  const handle = normalizeHandle(String(formData.get('handle') || ''))

  if (!name) {
    redirect(`/signup?error=${encodeURIComponent('Indique o seu nome.')}`)
  }

  if (!isValidHandleFormat(handle)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        'O handle deve ter 3 a 20 caracteres, apenas letras minúsculas, números e "_", começando por uma letra.'
      )}`
    )
  }

  if (password !== passwordConfirmation) {
    redirect(`/signup?error=${encodeURIComponent('As palavras-passe não coincidem.')}`)
  }

  if (!termsAccepted) {
    redirect(
      `/signup?error=${encodeURIComponent('É necessário aceitar os Termos e Condições e a Política de Privacidade.')}`
    )
  }

  const supabase = await createClient()

  // Defense in depth: the client already checked availability before
  // submitting, but re-check here — the DB constraint is the real gate
  // (see Task 0), this just gives a clean error message instead of a raw
  // "duplicate key" from a failed auth.signUp().
  const { data: available, error: availabilityError } = await supabase.rpc('is_handle_available', {
    p_handle: handle,
  })
  if (availabilityError) {
    redirect(`/signup?error=${encodeURIComponent(availabilityError.message)}`)
  }
  if (!available) {
    redirect(`/signup?error=${encodeURIComponent('Esse handle já está a ser usado. Escolha outro.')}`)
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        birth_date: birthDate || null,
        handle,
      },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard?onboarding=1')
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  // Sanitize again here, not just on the page that renders the hidden
  // field — this action is reachable by a direct POST that skips the page.
  const returnTo = safeRedirectPath(String(formData.get('return_to') || ''), '/dashboard')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect(returnTo)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
