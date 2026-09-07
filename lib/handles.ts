// Kept in sync by hand with the `profiles_handle_format` CHECK constraint
// in supabase/migrations/20260907190000_004_user_identity_handle_avatar.sql.
export const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,19}$/

export function isValidHandleFormat(handle: string): boolean {
  return HANDLE_REGEX.test(handle)
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase()
}
