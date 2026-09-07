import { revalidatePath } from 'next/cache'

/**
 * Call after a mutation that only affects the invites/members shown on the
 * family settings page (e.g. creating an invite) — the caller's own set of
 * workspaces didn't change, so the dashboard layout doesn't need a refresh.
 */
export function revalidateFamilySettings() {
  revalidatePath('/settings/family')
}

/**
 * Call after a mutation that changes which workspaces the current user is a
 * member of (accepting an invite, creating a family workspace, being
 * removed from one) — busts both the dashboard layout (the workspace
 * selector reads the membership list) and the family settings page. Without
 * this, the client Router Cache (see next.config.ts `staleTimes.dynamic`)
 * can keep showing the pre-mutation workspace list for up to 30s.
 */
export function revalidateWorkspaceMembership() {
  revalidatePath('/', 'layout')
  revalidatePath('/settings/family')
}
