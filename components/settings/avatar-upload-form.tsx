'use client'

import { useState } from 'react'
import { updateAvatar } from '@/app/(dashboard)/settings/profile/actions'
import { Button } from '@/components/ui/button'
import { AVATAR_MAX_BYTES } from '@/lib/storage/avatar'

export function AvatarUploadForm({ currentUrl }: { currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl)

  return (
    <form action={updateAvatar} className="flex items-center gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar is user-uploaded, not a static asset next/image can optimize at build time
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted">Sem foto</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > AVATAR_MAX_BYTES) return
            setPreview(URL.createObjectURL(file))
          }}
          className="text-sm text-ink-soft"
        />
        <Button type="submit" size="sm" className="w-fit">
          Guardar foto
        </Button>
      </div>
    </form>
  )
}
