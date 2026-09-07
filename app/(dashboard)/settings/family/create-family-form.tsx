import { createFamilyWorkspace } from './actions'

export function CreateFamilyForm() {
  return (
    <form action={createFamilyWorkspace} className="flex gap-2">
      <input name="name" placeholder="Nome da família" required className="rounded border p-2" />
      <button type="submit" className="rounded bg-black p-2 text-white">
        Criar família
      </button>
    </form>
  )
}
