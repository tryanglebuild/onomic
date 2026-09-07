'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/lib/navigation'

export async function signUp(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const passwordConfirmation = String(formData.get('password_confirmation'))
  const birthDate = String(formData.get('birth_date') || '').trim()
  const termsAccepted = formData.get('terms_accepted') === 'on'

  if (!name) {
    redirect(`/signup?error=${encodeURIComponent('Indique o seu nome.')}`)
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
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        birth_date: birthDate || null,
      },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  // Sanitize again here, not just on the page that renders the hidden
  // field — this action is reachable by a direct POST that skips the page.
  const returnTo = safeRedirectPath(String(formData.get('return_to') || ''))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect(returnTo)
}
