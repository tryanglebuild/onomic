import { createClient } from '@/lib/supabase/server'
import { AVATAR_BUCKET } from '@/lib/storage/avatar'
import { AvatarUploadForm } from '@/components/settings/avatar-upload-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, full_name, avatar_path')
    .eq('id', user!.id)
    .single()

  // Deliberate cache-busting: this is a Server Component render (not a
  // client render the React Compiler needs to memoize), and a changing
  // value here is exactly the point — without it the browser/CDN would
  // keep serving a stale avatar after re-upload, since avatarPathFor()
  // returns a fixed key per user.
  /* eslint-disable react-hooks/purity */
  const avatarUrl = profile?.avatar_path
    ? `${supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path).data.publicUrl}?v=${Date.now()}`
    : null
  /* eslint-enable react-hooks/purity */

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>O seu perfil</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <AvatarUploadForm currentUrl={avatarUrl} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Nome</dt>
          <dd>{profile?.full_name ?? '—'}</dd>
          <dt className="text-muted">Handle</dt>
          <dd>{profile?.handle ? `@${profile.handle}` : '—'}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
