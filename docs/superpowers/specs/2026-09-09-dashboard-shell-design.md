# Dashboard Shell — Design Spec

Date: 2026-09-09
Status: Approved (design), pending implementation plan

## Problem

After signup/login, users are not landing anywhere that reads as a
product dashboard. Root cause: `signUp`/`signIn` redirect to `/`, and
`app/page.tsx` further redirects authenticated users to
`/workspace/${activeWorkspaceId}`, which renders an almost-empty
placeholder (`"Transações, cofres e desafios aparecem aqui nas
próximas features."`) inside a bare header. There is no real dashboard
shell (sidebar, navbar, navigation) yet.

## Goals

- Give authenticated users a real destination: a single, stable
  `/dashboard` URL.
- Build a reusable dashboard shell: collapsible sidebar with nested
  dropdown sections, top navbar with workspace switcher + user menu.
- Establish the product's full navigation IA now (most sections point
  to elegant "em breve" placeholders — the underlying data models for
  accounts/transactions/budget/vaults/challenges/investments don't
  exist yet).
- Visual quality bar: premium, fast, matches the existing design
  tokens (`app/globals.css`) and editorial-but-serious tone already
  established in the marketing/auth shell.

## Non-goals

- Building the actual accounts/transactions/budget/vaults/challenges/
  investments data models or features. Those are separate, future
  specs — this spec only creates stable routes + placeholder UI for
  them.
- Any backend/schema changes beyond what's already in
  `supabase/migrations/`.

## Architecture & routing

Current broken chain: `signUp`/`signIn` → `/` → (root page checks
auth) → `/workspace/${activeWorkspaceId}` → near-empty placeholder.

New chain: `signUp`/`signIn` → `/dashboard` directly. Workspace
switching stays cookie-based (`active_workspace_id`, already
implemented in `lib/workspaces/active-workspace.ts` and
`WorkspaceSelector`/`switchWorkspace`) — no per-workspace URL.

Files to change:

- **New:** `app/(dashboard)/dashboard/page.tsx` — the dashboard
  overview page (URL: `/dashboard`, since the `(dashboard)` segment
  is a route group and doesn't appear in the URL).
- **Remove:** `app/(dashboard)/workspace/[id]/page.tsx` and the now-
  empty `workspace/` directory.
- **`app/page.tsx`** — line 25, `redirect(\`/workspace/${activeWorkspaceId}\`)` → `redirect('/dashboard')`. The `!activeWorkspaceId` branch (redirect to `/login`) is unchanged.
- **`app/(auth)/actions.ts`**:
  - `signUp` success path (currently `redirect('/')`) → `redirect('/dashboard')`.
  - `signIn`: the `returnTo` still comes from `safeRedirectPath(formData.get('return_to'), ...)` — change the fallback passed at both call sites (see below) to `/dashboard`.
- **`app/(auth)/login/page.tsx`** — `safeRedirectPath(return_to)` → `safeRedirectPath(return_to, '/dashboard')`.
- **`app/(auth)/actions.ts` `signIn`** — `safeRedirectPath(String(formData.get('return_to') || ''))` → add `'/dashboard'` as the explicit fallback arg (same reasoning: this action is reachable by direct POST, must independently default correctly).
- **`app/(dashboard)/settings/family/actions.ts`** — `createFamilyWorkspace`'s `redirect(\`/workspace/${workspaceId}\`)` → set `active_workspace_id` cookie to the new workspace, then `redirect('/dashboard')`.
- **`app/(dashboard)/switch-workspace/actions.ts`** — same change: after writing the cookie, `redirect('/dashboard')` instead of `redirect(\`/workspace/${workspaceId}\`)`.
- **`app/(dashboard)/layout.tsx`** — keep the existing auth+workspace guard (redirect to `/login` if no user or no active workspace). Replace its JSX (the plain `<header>` block) with the new `<DashboardShell>` (sidebar + navbar), rendering `children` inside it. `WorkspaceSelector` moves into the navbar (restyled, see below) instead of the old header.

No `lib/navigation.ts` changes — `safeRedirectPath`'s own default
param can stay `'/'`; callers now pass `'/dashboard'` explicitly where
that's the right fallback.

## Components

New directory `components/dashboard/`:

- **`dashboard-shell.tsx`** (server component) — reads the
  `sidebar_collapsed` cookie server-side (avoids a collapse/expand
  flash on load), renders `<Sidebar>` + `<Navbar>` + `<main>{children}</main>` in a flex/grid layout. Receives `workspaces`,
  `activeWorkspaceId`, and the current user's profile (name, handle,
  avatar URL) as props from the layout, which already fetches this
  data for the auth guard.
- **`sidebar.tsx`** (client component) — renders the nav sections
  below. Owns the collapsed/expanded visual state; toggling writes
  `document.cookie` directly (no server round-trip needed for an
  instant toggle) and updates local state for the current render.
- **`sidebar-nav-item.tsx`** — a nav entry: either a plain `<Link>`
  (leaf item) or, when it has children, a `@radix-ui/react-collapsible`
  trigger that expands a nested list of sub-links. Highlights the
  active route via `usePathname()`.
- **`navbar.tsx`** (client component) — top bar: sidebar
  toggle/mobile-menu trigger (left), restyled `WorkspaceSelector`
  (as a dropdown, not a native `<select>`) + a static/decorative
  notification bell + `<UserMenu>` (right).
- **`user-menu.tsx`** — `@radix-ui/react-dropdown-menu` trigger on
  the user's avatar/initials; menu items: Perfil / Definições (both
  point to `/settings/profile`, the only settings page that exists
  today — a single entry), Família (`/settings/family`), Sair (calls
  the existing sign-out action).
- **`coming-soon.tsx`** — shared empty-state block (icon, title, short
  description, optional CTA back to `/dashboard`) reused by every
  placeholder route below.

New dependencies: `@radix-ui/react-dropdown-menu`,
`@radix-ui/react-collapsible` (same family as the already-installed
`@radix-ui/react-slot`, unstyled/accessible, styled entirely with the
existing Tailwind tokens). No animation library — collapse/expand and
dropdown transitions use Tailwind transitions plus CSS keyframes in
`globals.css`, consistent with the existing `onomic-mark-loading`
pattern.

## Navigation IA

```
Visão geral                                  → /dashboard
Contas        ▾ Todas as contas               → /accounts            (em breve)
               ▾ Ligar conta                  → /accounts/connect    (em breve)
Transações                                    → /transactions        (em breve)
Orçamento                                     → /budget              (em breve)
Vaults (poupança)                             → /vaults              (em breve)
Desafios                                      → /challenges          (em breve)
Investimentos ▾ Carteira                      → /investments         (em breve)
               ▾ Conselheiro IA               → /investments/advisor (em breve)
── divider ──
Família        ▾ Membros / Convites           → /settings/family     (existing)
Definições                                    → /settings/profile    (existing)
```

Each "em breve" route is a real page under `app/(dashboard)/...` using
`<ComingSoon />`, not a dead link — stable URLs for when the feature
ships.

## Data & empty states

`/dashboard` overview, in order:

1. A real workspace summary card: active workspace name, type
   (pessoal/família), member count, pending invites — sourced from
   data already fetched via `getUserWorkspaces`/
   `get_workspace_members_with_email` (same RPC the family settings
   page already uses).
2. An empty-state hero ("Ligue a sua primeira conta" or similar, with
   a CTA) styled in the same register as the marketing
   `BalanceCardMock`, but explicitly a call-to-action, not fabricated
   numbers — this is a financial app, so no placeholder balances or
   invented transactions.

## Error handling / edge cases

- Auth guard behavior is unchanged — still enforced in
  `app/(dashboard)/layout.tsx` before the shell renders.
- `createFamilyWorkspace` and `switchWorkspace` must set the
  `active_workspace_id` cookie *before* redirecting to `/dashboard`,
  or the user lands on the wrong workspace.
- Confirmed via grep: only three call sites reference
  `/workspace/${id}` today (`app/page.tsx`,
  `settings/family/actions.ts`, `switch-workspace/actions.ts`) — all
  covered above. No other dead links after the route is removed.
- Mobile (`< lg`): sidebar becomes an overlay drawer (same `lg:`
  breakpoint convention as `AuthShell`), closes on navigation.

## Verification

- `npx tsc --noEmit` clean.
- Playwright pass (same approach used for the toast work): screenshot
  `/dashboard`, toggle sidebar collapse, open the user menu dropdown,
  confirm signup → dashboard and login → dashboard both land
  correctly, confirm no remaining reference to `/workspace/[id]`.
- Visual polish (spacing, color use, micro-interactions) is executed
  during implementation using the `frontend-design-pro` skill, against
  the tokens in `app/globals.css` — this spec fixes architecture and
  structure, not final pixel-level styling.
