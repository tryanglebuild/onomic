import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/queries'
import { notFound } from 'next/navigation'

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const workspaces = await getUserWorkspaces(supabase)
  const workspace = workspaces.find((w) => w.id === id)

  if (!workspace) {
    notFound()
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{workspace.type === 'personal' ? 'Pessoal' : workspace.name}</h1>
      <p className="text-gray-500">
        Transações, cofres e desafios aparecem aqui nas próximas features.
      </p>
    </div>
  )
}
