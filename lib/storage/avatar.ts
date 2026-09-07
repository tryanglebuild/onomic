export const AVATAR_BUCKET = 'avatars'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // kept in sync by hand with the bucket's file_size_limit
export const AVATAR_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export function avatarPathFor(userId: string): string {
  // Fixed key per user, no extension — Supabase Storage serves the correct
  // Content-Type from upload metadata regardless of the object key, so a
  // user switching from a .png to a .jpg avatar doesn't leave an orphan file
  // or need a different path.
  return `${userId}/avatar`
}
