export const SIDEBAR_COLLAPSED_COOKIE = 'sidebar_collapsed'

/** Parses the raw cookie string into a boolean. Any value other than
 * exactly "1" is treated as expanded (the default), including no cookie
 * at all (first visit). */
export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === '1'
}
