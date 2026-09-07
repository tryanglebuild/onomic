import { createInvite } from './actions'

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const boundAction = createInvite.bind(null, workspaceId)

  return (
    <form action={boundAction} className="flex gap-2">
      <input name="email" type="email" placeholder="Email do convidado" required className="rounded border p-2" />
      <button type="submit" className="rounded bg-black p-2 text-white">
        Convidar
      </button>
    </form>
  )
}
