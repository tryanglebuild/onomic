import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { CreateFamilyForm } from './create-family-form'
import { InviteForm } from './invite-form'

export default async function FamilySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite_link?: string }>
}) {
  const { error, invite_link } = await searchParams
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const familyWorkspaces = workspaces.filter((w) => w.type === 'family')

  const invitesByWorkspace = await Promise.all(
    familyWorkspaces.map(async (w) => {
      const { data } = await supabase
        .from('workspace_invites')
        .select('id, invited_email, status')
        .eq('workspace_id', w.id)
        .eq('status', 'pending')
      return { workspace: w, invites: data ?? [] }
    })
  )

  return (
    <div className="flex flex-col gap-8">
      {invite_link && (
        <p className="rounded bg-green-100 p-3">
          Link de convite gerado: <code>{invite_link}</code>
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold">As tuas famílias</h2>
        {invitesByWorkspace.length === 0 ? (
          <p className="text-gray-500">Ainda não pertences a nenhuma família.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {invitesByWorkspace.map(({ workspace, invites }) => (
              <div key={workspace.id} className="rounded border p-4">
                <h3 className="font-medium">{workspace.name}</h3>
                {workspace.role === 'owner' && <InviteForm workspaceId={workspace.id} />}
                {invites.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-gray-600">
                    {invites.map((i) => (
                      <li key={i.id}>{i.invited_email} — pendente</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Criar nova família</h2>
        {error && <p className="text-red-600">{error}</p>}
        <CreateFamilyForm />
      </section>
    </div>
  )
}
