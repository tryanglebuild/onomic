'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_ALLOWED_TYPES, avatarPathFor } from '@/lib/storage/avatar'

function redirectWithError(message: string): never {
  redirect(`/settings/profile?error=${encodeURIComponent(message)}`)
}

export async function updateAvatar(formData: FormData) {
  const file = formData.get('avatar')

  if (!(file instanceof File) || file.size === 0) {
    redirectWithError('Escolha uma imagem.')
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    redirectWithError('Formato não suportado — use PNG, JPEG ou WebP.')
  }

  if (file.size > AVATAR_MAX_BYTES) {
    redirectWithError('Imagem demasiado grande — o limite é 2MB.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const path = avatarPathFor(user.id)

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    redirectWithError(uploadError.message)
  }

  const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)

  if (updateError) {
    redirectWithError(updateError.message)
  }

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout') // avatar may appear in the nav in a future iteration
}
