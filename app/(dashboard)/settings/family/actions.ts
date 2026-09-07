'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFamilyWorkspace(formData: FormData) {
  const name = String(formData.get('name'))
  const supabase = await createClient()

  const { data: workspaceId, error } = await supabase.rpc('create_family_workspace', {
    p_name: name,
  })

  if (error) {
    redirect(`/settings/family?error=${encodeURIComponent(error.message)}`)
  }

  redirect(`/workspace/${workspaceId}`)
}
