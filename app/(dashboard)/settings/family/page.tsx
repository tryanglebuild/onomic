import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { CreateFamilyForm } from './create-family-form'

export default async function FamilySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const familyWorkspaces = workspaces.filter((w) => w.type === 'family')

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-lg font-semibold">As tuas famílias</h2>
        {familyWorkspaces.length === 0 ? (
          <p className="text-gray-500">Ainda não pertences a nenhuma família.</p>
        ) : (
          <ul className="list-disc pl-5">
            {familyWorkspaces.map((w) => (
              <li key={w.id}>{w.name}</li>
            ))}
          </ul>
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
