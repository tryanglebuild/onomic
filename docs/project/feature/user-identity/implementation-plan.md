# User Identity: Handle & Avatar — Implementation Plan

**Feature spec:** [`feature-spec.md`](./feature-spec.md)
**Status:** Complete — implemented and code-reviewed via subagent-driven-development (7 tasks + final whole-branch review + 1 fix wave); migration never applied to a live database (deliberately deferred, see Global Constraints)
**Created:** 2026-09-07
**Last updated:** 2026-09-07 (Task 0 SQL synced to the post-final-review state: `lower()`/`unaccent` ordering fix, `unaccent` installed in the `extensions` schema, `is_handle_available(null)` explicit check, `grant execute` on both RPC functions)
**Author:** Leandro Oliveira (com plano técnico assistido)

---

## Overview

Seis tarefas, backend primeiro: uma única migração (schema + RLS + Storage + funções), depois os tipos gerados à mão, depois a lógica partilhada, depois o formulário de signup, depois o upload de avatar + página de perfil, depois o ponto de entrada na navegação. As tarefas devem ser feitas por ordem — cada uma depende da anterior.

**MVP boundary:** Todas as 6 tarefas são necessárias para a feature funcionar de ponta a ponta (não há um corte intermédio razoável — um handle sem forma de o definir no signup, ou um avatar sem página para o carregar, não são utilizáveis sozinhos).

## Global Constraints

- **Não aplicar a migração a nenhuma base de dados real durante esta implementação** — mesma regra já seguida em Family Workspaces. Escrever o SQL, nunca correr `supabase db reset`/`db push`/`migration up`. Ver [`RUNBOOK.md`](../family-workspaces/RUNBOOK.md) da feature anterior para o processo de aplicar tudo de uma vez, no futuro.
- **`profiles.role` nunca pode tornar-se editável pelo cliente** — este é o ponto de maior risco de todo o plano (ver Tarefa 0, Passo sobre `REVOKE`/`GRANT`). Qualquer revisão desta tarefa deve verificar explicitamente que `role` não está na lista de colunas do `GRANT UPDATE`.
- Handles e palavras reservadas têm de ser bloqueados em **todas** as vias de escrita (trigger de signup, e qualquer futura via de auto-edição), não só nas funções auxiliares `is_handle_available`/`suggest_handle` — daí o trigger `prevent_reserved_handle` na Tarefa 0, que corre em qualquer INSERT/UPDATE de `handle`, independentemente de quem chamou.
- Seguir a convenção de nomes de migração já estabelecida: `YYYYMMDDHHMMSS_NNN_nome.sql`, número sequencial a continuar do último (`003`), nunca reiniciado por feature.
- Nenhum passo desta implementação deve introduzir uma exceção às regras de segurança já estabelecidas (RLS em todas as tabelas de domínio, sem `service_role` no cliente).
- Nunca incluir passos de commit — o developer decide quando e o que commitar.

---

## Technical Context

- **Stack:** Next.js App Router, Server Components por defeito, Client Components só onde há interatividade real (aqui: campo de handle com sugestão/verificação ao vivo, e o formulário de upload de avatar).
- **Auth/RLS:** todas as queries passam pela sessão do utilizador autenticado (`lib/supabase/server.ts`, já memoizado por pedido via `cache()`); nunca `service_role` a partir de código de app.
- **Ficheiros a ler antes de começar:**
  - `supabase/migrations/20260906120000_001_family_workspaces.sql` (tabela `profiles`, padrão de função `SECURITY DEFINER`)
  - `supabase/migrations/20260907180000_003_profile_signup_fields.sql` (o último estado do trigger de signup)
  - `app/(auth)/actions.ts`, `app/(auth)/signup/page.tsx` (o formulário de signup atual)
  - `lib/supabase/database.types.ts` (tipos manuais a estender)
  - `lib/workspaces/revalidate.ts` (padrão de invalidação de cache a seguir para a página de perfil)
  - `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `card.tsx` (primitivas a reutilizar — nunca recriar)
- **Variáveis de ambiente:** nenhuma nova — usa as mesmas `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` já configuradas.
- **Migração seguinte:** `20260907190000_004_user_identity_handle_avatar.sql` (próximo número disponível: `004`).

---

## Task 0: Database Migration — Schema, RLS, Storage, Functions

**Goal:** Todas as alterações de base de dados desta feature, numa única migração.

**File:** `supabase/migrations/20260907190000_004_user_identity_handle_avatar.sql` (new)

```sql
create extension if not exists unaccent with schema extensions;

-- ============================================================================
-- 1. Reserved handles — lookup table, not a hardcoded list, para ser editável
--    no futuro backoffice sem nova migração.
-- ============================================================================
create table reserved_handles (
  handle text primary key
);

alter table reserved_handles enable row level security;

create policy reserved_handles_select_all on reserved_handles
for select using (true);

insert into reserved_handles (handle) values
  ('admin'), ('support'), ('onomic'), ('api'), ('www'), ('help'),
  ('settings'), ('security'), ('privacy'), ('terms'), ('billing'),
  ('root'), ('system'), ('null'), ('undefined'), ('me'), ('you'),
  ('invite'), ('login'), ('signup');

-- ============================================================================
-- 2. profiles: handle + avatar_path
-- ============================================================================
alter table profiles
  add column handle text,
  add column avatar_path text;

-- Format: 3-20 chars, lowercase letters/digits/underscore, must start with a
-- letter. Kept in sync by hand with HANDLE_REGEX in lib/handles.ts.
alter table profiles
  add constraint profiles_handle_format check (handle ~ '^[a-z][a-z0-9_]{2,19}$');

alter table profiles
  add constraint profiles_handle_unique unique (handle);

-- handle is required in practice (the signup form always sends one — see
-- Task 3), but is intentionally NOT declared `not null` at the DB level: the
-- signup trigger below still needs to succeed for any future auth.users
-- insert that doesn't go through this app's signup form (e.g. a
-- backoffice-created account), same tradeoff already accepted for
-- full_name/birth_date.

-- Reserved handles must be blocked on every write path, not just inside
-- is_handle_available/suggest_handle — a client could otherwise call
-- auth.signUp() directly with metadata.handle = 'admin' and bypass those
-- helper functions entirely.
create or replace function prevent_reserved_handle()
returns trigger as $$
begin
  if new.handle is not null and exists (
    select 1 from reserved_handles where handle = new.handle
  ) then
    raise exception 'handle_reserved';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_prevent_reserved_handle
before insert or update of handle on profiles
for each row execute function prevent_reserved_handle();

-- ============================================================================
-- 3. Self-service profile updates — first-ever UPDATE policy on `profiles`.
--    Row scope (RLS) says "your own row"; column scope (GRANT) says "only
--    these columns". `role` is deliberately never granted, so no UPDATE from
--    any client-facing role can change it, no matter what the request body
--    contains.
--
--    IMPORTANT: Supabase grants ALL table privileges to `anon`/`authenticated`
--    by default on every new table (RLS is normally the only gate). That
--    means `profiles` already has a blanket UPDATE grant sitting unused since
--    there was no UPDATE policy. Adding a policy WITHOUT first revoking that
--    blanket grant would make every column (including `role`) updatable.
--    The REVOKE below is not optional.
-- ============================================================================
revoke update on profiles from authenticated, anon;
grant update (full_name, handle, birth_date, avatar_path) on profiles to authenticated;

create policy profiles_update_own on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================================
-- 4. Signup trigger — now also sets `handle` from auth metadata.
-- ============================================================================
create or replace function handle_new_user_profile()
returns trigger as $$
begin
  insert into profiles (id, role, full_name, birth_date, handle)
  values (
    new.id,
    'user',
    new.raw_user_meta_data ->> 'full_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date,
    new.raw_user_meta_data ->> 'handle'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ============================================================================
-- 5. Handle availability + suggestion — SECURITY DEFINER because checking
--    uniqueness needs to see every user's handle, which profiles_select_own
--    would otherwise hide. Same pattern as get_workspace_members_with_email
--    in Family Workspaces: the function returns only a boolean/string, never
--    another user's row.
-- ============================================================================
create or replace function is_handle_available(p_handle text)
returns boolean as $$
begin
  if p_handle is null or p_handle !~ '^[a-z][a-z0-9_]{2,19}$' then
    return false;
  end if;

  if exists (select 1 from reserved_handles where handle = p_handle) then
    return false;
  end if;

  return not exists (select 1 from profiles where handle = p_handle);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function is_handle_available(text) to anon, authenticated;

create or replace function suggest_handle(p_full_name text)
returns text as $$
declare
  v_base text;
  v_candidate text;
  v_attempt int := 0;
begin
  -- lower() must wrap unaccent() BEFORE the regex strip — stripping
  -- [^a-z0-9] from still-mixed-case text deletes every uppercase letter
  -- (caught in final review: an earlier draft applied lower() only at the
  -- very end, which silently dropped the first letter of every capitalized
  -- name part).
  v_base := regexp_replace(lower(unaccent(coalesce(p_full_name, ''))), '[^a-z0-9]', '', 'g');
  v_base := left(v_base, 14);

  if v_base = '' or v_base !~ '^[a-z]' then
    v_base := 'user';
  end if;

  loop
    -- "até 5 números": floor(random()*100000) yields 0-99999, i.e. 1 to 5 digits.
    v_candidate := left(v_base || floor(random() * 100000)::int::text, 20);

    if is_handle_available(v_candidate) then
      return v_candidate;
    end if;

    v_attempt := v_attempt + 1;
    if v_attempt >= 20 then
      -- Never loop forever. Extremely unlikely to be reached in practice.
      return left(v_base || extract(epoch from clock_timestamp())::bigint::text, 20);
    end if;
  end loop;
end;
$$ language plpgsql security definer set search_path = public, extensions;

grant execute on function suggest_handle(text) to anon, authenticated;

-- ============================================================================
-- 6. Avatars bucket — public (read), write restricted to the user's own
--    folder. Size/type enforced at the bucket level, not just client-side.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
for select using (bucket_id = 'avatars');

create policy avatars_own_write on storage.objects
for insert with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_own_update on storage.objects
for update using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy avatars_own_delete on storage.objects
for delete using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

**Verification (when this is eventually applied to a real project — see Global Constraints):**
- `insert into profiles (...) values (...)` com um `handle` que já exista deve falhar com violação de `unique`.
- `insert`/`update` de `handle = 'admin'` deve falhar com `handle_reserved`, não só via `is_handle_available`.
- Como `authenticated`, `update profiles set role = 'admin' where id = auth.uid()` deve falhar (coluna não concedida) mesmo que `update profiles set full_name = 'x' where id = auth.uid()` tenha sucesso.
- `select is_handle_available('ab')` → `false` (demasiado curto); `select is_handle_available('leandro')` → depende de já existir ou não.
- Upload de um ficheiro > 2MB ou de tipo não permitido para o bucket `avatars` deve ser rejeitado pelo próprio Storage, antes de qualquer RLS.

---

## Task 1: Extend Generated Types

**Goal:** `database.types.ts` (hand-authored placeholder, tal como o resto do projeto até `supabase gen types` correr pela primeira vez) reflete as novas colunas e funções.

**File:** `lib/supabase/database.types.ts` (existing)

Adicionar a `profiles.Row`/`Insert`:

```typescript
profiles: {
  Row: {
    id: string
    role: 'user' | 'admin' | 'support'
    full_name: string | null
    birth_date: string | null
    handle: string | null
    avatar_path: string | null
    created_at: string
  }
  Insert: {
    id: string
    role?: 'user' | 'admin' | 'support'
    full_name?: string | null
    birth_date?: string | null
    handle: string
    avatar_path?: string | null
    created_at?: string
  }
  Update: Partial<Database['public']['Tables']['profiles']['Insert']>
  Relationships: []
}
reserved_handles: {
  Row: { handle: string }
  Insert: { handle: string }
  Update: Partial<Database['public']['Tables']['reserved_handles']['Insert']>
  Relationships: []
}
```

Adicionar a `Functions`:

```typescript
is_handle_available: {
  Args: { p_handle: string }
  Returns: boolean
}
suggest_handle: {
  Args: { p_full_name: string }
  Returns: string
}
```

**Verification:** `npm run build` continua a passar (TypeScript deteta qualquer sítio que já assuma a forma antiga de `profiles`).

---

## Task 2: Shared Handle Validation

**Goal:** Uma única fonte de verdade para o formato de handle no lado da aplicação (usada pelo Client Component e pela server action), mantida manualmente sincronizada com o `CHECK` da Tarefa 0.

**File:** `lib/handles.ts` (new)

```typescript
// Kept in sync by hand with the `profiles_handle_format` CHECK constraint
// in supabase/migrations/20260907190000_004_user_identity_handle_avatar.sql.
export const HANDLE_REGEX = /^[a-z][a-z0-9_]{2,19}$/

export function isValidHandleFormat(handle: string): boolean {
  return HANDLE_REGEX.test(handle)
}

export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase()
}
```

**Verification:** nenhuma — é usado pelos passos seguintes.

---

## Task 3: Handle Actions (Suggest / Check / Signup)

**Goal:** O formulário de signup consegue sugerir e verificar um handle antes de submeter, e o próprio submit valida no servidor antes de chamar `auth.signUp()`.

**File:** `app/(auth)/actions.ts` (existing)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/lib/navigation'
import { isValidHandleFormat, normalizeHandle } from '@/lib/handles'

export async function suggestHandle(fullName: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('suggest_handle', { p_full_name: fullName })
  if (error) throw error
  return data
}

export async function checkHandleAvailability(handle: string): Promise<boolean> {
  const normalized = normalizeHandle(handle)
  if (!isValidHandleFormat(normalized)) return false

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('is_handle_available', { p_handle: normalized })
  if (error) throw error
  return data
}

export async function signUp(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const passwordConfirmation = String(formData.get('password_confirmation'))
  const birthDate = String(formData.get('birth_date') || '').trim()
  const termsAccepted = formData.get('terms_accepted') === 'on'
  const handle = normalizeHandle(String(formData.get('handle') || ''))

  if (!name) {
    redirect(`/signup?error=${encodeURIComponent('Indique o seu nome.')}`)
  }

  if (!isValidHandleFormat(handle)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        'O handle deve ter 3 a 20 caracteres, apenas letras minúsculas, números e "_", começando por uma letra.'
      )}`
    )
  }

  if (password !== passwordConfirmation) {
    redirect(`/signup?error=${encodeURIComponent('As palavras-passe não coincidem.')}`)
  }

  if (!termsAccepted) {
    redirect(
      `/signup?error=${encodeURIComponent('É necessário aceitar os Termos e Condições e a Política de Privacidade.')}`
    )
  }

  const supabase = await createClient()

  // Defense in depth: the client already checked availability before
  // submitting, but re-check here — the DB constraint is the real gate
  // (see Task 0), this just gives a clean error message instead of a raw
  // "duplicate key" from a failed auth.signUp().
  const { data: available, error: availabilityError } = await supabase.rpc('is_handle_available', {
    p_handle: handle,
  })
  if (availabilityError) {
    redirect(`/signup?error=${encodeURIComponent(availabilityError.message)}`)
  }
  if (!available) {
    redirect(`/signup?error=${encodeURIComponent('Esse handle já está a ser usado. Escolha outro.')}`)
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        birth_date: birthDate || null,
        handle,
      },
    },
  })

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/')
}

export async function signIn(formData: FormData) {
  const email = String(formData.get('email'))
  const password = String(formData.get('password'))
  const returnTo = safeRedirectPath(String(formData.get('return_to') || ''))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect(returnTo)
}
```

**Verification:** chamar `suggestHandle('Leandro Oliveira')` num teste ad-hoc devolve algo como `"leandro48213"`; `checkHandleAvailability('ab')` devolve `false` sem sequer chamar a base de dados (falha no regex primeiro).

---

## Task 4: Signup Form — Handle Field

**Goal:** O formulário de signup ganha um campo de handle com sugestão automática, botão "Sugerir outro", e indicador de disponibilidade em tempo real.

**File:** `components/auth/signup-form.tsx` (new, Client Component)

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { signUp, suggestHandle, checkHandleAvailability } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { isValidHandleFormat, normalizeHandle } from '@/lib/handles'
import { RefreshCw, Check, X } from 'lucide-react'

type HandleStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export function SignupForm() {
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleTouched, setHandleTouched] = useState(false)
  const [status, setStatus] = useState<HandleStatus>('idle')
  const [isPending, startTransition] = useTransition()

  // Auto-suggest once the user has typed a name, as long as they haven't
  // edited the handle themselves yet.
  useEffect(() => {
    if (handleTouched || name.trim().length === 0) return
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const suggestion = await suggestHandle(name)
        setHandle(suggestion)
      })
    }, 400)
    return () => clearTimeout(timeout)
  }, [name, handleTouched])

  // Live availability check, debounced, whenever the handle value changes.
  useEffect(() => {
    const normalized = normalizeHandle(handle)
    if (!normalized) {
      setStatus('idle')
      return
    }
    if (!isValidHandleFormat(normalized)) {
      setStatus('invalid')
      return
    }
    setStatus('checking')
    const timeout = setTimeout(async () => {
      const available = await checkHandleAvailability(normalized)
      setStatus(available ? 'available' : 'taken')
    }, 350)
    return () => clearTimeout(timeout)
  }, [handle])

  async function handleSuggestAgain() {
    startTransition(async () => {
      const suggestion = await suggestHandle(name || 'user')
      // NOT setHandleTouched(false) — caught in final review: resetting
      // "touched" here re-arms the auto-suggest effect above, which then
      // fires again ~400ms later and silently overwrites this suggestion
      // with a different one. Stay "touched" after a manual re-suggest.
      setHandleTouched(true)
      setHandle(suggestion)
    })
  }

  return (
    <form action={signUp} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="O seu nome"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="handle">Handle</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted">
              @
            </span>
            <Input
              id="handle"
              name="handle"
              type="text"
              required
              className="pl-7"
              value={handle}
              onChange={(e) => {
                setHandleTouched(true)
                setHandle(normalizeHandle(e.target.value))
              }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {status === 'checking' && <RefreshCw className="size-4 animate-spin text-muted" />}
              {status === 'available' && <Check className="size-4 text-primary-strong" />}
              {(status === 'taken' || status === 'invalid') && <X className="size-4 text-danger" />}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleSuggestAgain}
            disabled={isPending}
          >
            Sugerir outro
          </Button>
        </div>
        {status === 'taken' && <p className="text-xs text-danger">Este handle já está a ser usado.</p>}
        {status === 'invalid' && (
          <p className="text-xs text-danger">3–20 caracteres, letras minúsculas, números e &quot;_&quot;.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="voce@email.com" required autoComplete="email" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password_confirmation">Confirmar</Label>
          <Input
            id="password_confirmation"
            name="password_confirmation"
            type="password"
            placeholder="Repita a palavra-passe"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birth_date">Data de nascimento (opcional)</Label>
        <Input id="birth_date" name="birth_date" type="date" autoComplete="bday" />
      </div>

      <Checkbox
        id="terms_accepted"
        name="terms_accepted"
        required
        label={
          <>
            Li e aceito os{' '}
            <Link href="/terms" target="_blank" className="font-medium text-primary-strong hover:underline">
              Termos e Condições
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-primary-strong hover:underline">
              Política de Privacidade
            </Link>
            .
          </>
        }
      />

      <Button type="submit" className="mt-2 w-full" disabled={status === 'taken' || status === 'invalid'}>
        Criar conta
      </Button>
    </form>
  )
}
```

**File:** `app/(auth)/signup/page.tsx` (existing — simplified to delegate the form)

```tsx
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { SignupForm } from '@/components/auth/signup-form'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <AuthShell eyebrow="Comece agora" title="Criar a sua conta">
      {error && (
        <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <SignupForm />
      <p className="mt-6 text-sm text-muted">
        Já tens conta?{' '}
        <Link href="/login" className="font-medium text-primary-strong hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  )
}
```

**Verification:** no browser, escrever um nome deve pré-preencher `@handle` ao fim de ~400ms; editar manualmente mostra o spinner e depois ✓/✗; o botão "Criar conta" fica desabilitado enquanto o handle está inválido/ocupado (mas o servidor continua a validar de qualquer forma — este `disabled` é só UX, não é a defesa real).

Nota de implementação (correções feitas durante a implementação real, além do `setHandleTouched` acima): (1) o ESLint deste projeto tem a regra `react-hooks/set-state-in-effect`, que rejeita chamar `setState` diretamente no corpo de um `useEffect` — o `formatStatus` acabou por ser derivado de forma síncrona no corpo do componente (não via effect), e as chamadas a `setStatus`/`setAsyncStatus` dentro dos efeitos passaram a correr sempre dentro de callbacks de `setTimeout`; (2) `suggestHandle`/`checkHandleAvailability` podem rejeitar (erro de rede/RPC) — os três pontos de chamada (auto-sugestão, "Sugerir outro", verificação de disponibilidade) precisam de `try/catch`, sem propagar o erro para o utilizador (falha silenciosa, o utilizador pode tentar de novo). Ver o ficheiro real `components/auth/signup-form.tsx` para a forma final exata — este bloco de código mantém-se como referência de comportamento, não como texto para copiar literalmente.

---

## Task 5: Avatar Upload + Profile Page

**Goal:** Uma página `/settings/profile` onde o utilizador vê e substitui o seu avatar.

**File:** `lib/storage/avatar.ts` (new)

```typescript
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
```

**File:** `app/(dashboard)/settings/profile/actions.ts` (new)

```typescript
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_ALLOWED_TYPES, avatarPathFor } from '@/lib/storage/avatar'

function redirectWithError(message: string): never {
  redirect(`/settings/profile?error=${encodeURIComponent(message)}`)
}

export async function updateAvatar(formData: FormData) {
  const file = formData.get('avatar')

  if (!(file instanceof File) || file.size === 0) {
    redirectWithError('Escolha uma imagem.')
  }

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    redirectWithError('Formato não suportado — use PNG, JPEG ou WebP.')
  }

  if (file.size > AVATAR_MAX_BYTES) {
    redirectWithError('Imagem demasiado grande — o limite é 2MB.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Server Actions are independently reachable — the dashboard layout's
  // redirect for unauthenticated users doesn't run for a direct POST here.
  // Without this check, `user!.id` below throws (500) instead of redirecting.
  if (!user) {
    redirect('/login')
  }

  const path = avatarPathFor(user.id)

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    redirectWithError(uploadError.message)
  }

  const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', user.id)

  if (updateError) {
    redirectWithError(updateError.message)
  }

  revalidatePath('/settings/profile')
  revalidatePath('/', 'layout') // avatar may appear in the nav in a future iteration
}
```

**File:** `components/settings/avatar-upload-form.tsx` (new, Client Component)

```tsx
'use client'

import { useState } from 'react'
import { updateAvatar } from '@/app/(dashboard)/settings/profile/actions'
import { Button } from '@/components/ui/button'
import { AVATAR_MAX_BYTES } from '@/lib/storage/avatar'

export function AvatarUploadForm({ currentUrl }: { currentUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl)

  return (
    <form action={updateAvatar} className="flex items-center gap-4">
      <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-surface-sunken">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar is user-uploaded, not a static asset next/image can optimize at build time
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted">Sem foto</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > AVATAR_MAX_BYTES) return
            setPreview(URL.createObjectURL(file))
          }}
          className="text-sm text-ink-soft"
        />
        <Button type="submit" size="sm" className="w-fit">
          Guardar foto
        </Button>
      </div>
    </form>
  )
}
```

**File:** `app/(dashboard)/settings/profile/page.tsx` (new)

```tsx
import { createClient } from '@/lib/supabase/server'
import { AVATAR_BUCKET } from '@/lib/storage/avatar'
import { AvatarUploadForm } from '@/components/settings/avatar-upload-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle, full_name, avatar_path')
    .eq('id', user!.id)
    .single()

  // Cache-busting query param: fixed by hand, in review — avatar_path never
  // changes value (same key per user, see avatarPathFor), so getPublicUrl()
  // returns the byte-identical URL before and after a re-upload, and the
  // browser/CDN would keep serving the old image. Appending a value that
  // changes on every render defeats that cache; Date.now() at request time
  // is fine in a Server Component (not subject to the client purity rule
  // this trips — silence it locally, don't disable it file-wide).
  const avatarUrl = profile?.avatar_path
    ? // eslint-disable-next-line react-hooks/purity -- Server Component, request-time value is intended
      `${supabase.storage.from(AVATAR_BUCKET).getPublicUrl(profile.avatar_path).data.publicUrl}?v=${Date.now()}`
    : null

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>O seu perfil</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <p className="rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <AvatarUploadForm currentUrl={avatarUrl} />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">Nome</dt>
          <dd>{profile?.full_name ?? '—'}</dd>
          <dt className="text-muted">Handle</dt>
          <dd>{profile?.handle ? `@${profile.handle}` : '—'}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
```

**Verification:** carregar uma imagem válida atualiza o avatar imediatamente após reload (o `?v=` muda a cada render, por isso o browser nunca reutiliza a versão anterior em cache); carregar um ficheiro > 2MB ou de tipo errado mostra o erro devolvido pelo próprio Storage (não só uma validação client-side); o URL devolvido por `getPublicUrl` funciona sem sessão (bucket público); com `profile.handle` nulo (conta criada fora do formulário de signup), a página mostra "—" em vez de `@null`.

---

## Task 6: Navigation Entry Point

**Goal:** A página de perfil é alcançável a partir do dashboard.

**File:** `app/(dashboard)/layout.tsx` (existing)

Adicionar um link "Perfil" ao lado do `WorkspaceSelector` no header já existente (mesmo header simples, sem redesenho do resto do dashboard — fora de escopo aqui):

```tsx
import Link from 'next/link'
// ...
<header className="flex items-center justify-between border-b p-4">
  <span className="font-semibold">Onomic</span>
  <div className="flex items-center gap-4">
    <Link href="/settings/profile" className="text-sm text-gray-600 hover:text-gray-900">
      Perfil
    </Link>
    <WorkspaceSelector workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
  </div>
</header>
```

**Verification:** o link aparece no dashboard e navega para `/settings/profile`.

---

## Phase Summary

| Task | Builds | Status |
|---|---|---|
| 0 | Migração: schema, RLS, trigger de reservados, funções, bucket | ⬜ Not started |
| 1 | Tipos gerados à mão | ⬜ Not started |
| 2 | Validação de handle partilhada | ⬜ Not started |
| 3 | Actions de handle + signup atualizado | ⬜ Not started |
| 4 | Formulário de signup com campo de handle | ⬜ Not started |
| 5 | Upload de avatar + página de perfil | ⬜ Not started |
| 6 | Ponto de entrada na navegação | ⬜ Not started |

**MVP boundary:** todas as 6 têm de ser feitas juntas.

---

## Environment Variables Required

Nenhuma nova — reutiliza `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` já existentes.

---

## Open Questions

1. **Rate limiting em `suggest_handle`/`is_handle_available`:** ambas as funções são chamáveis por `anon` (têm de o ser — o signup ainda não tem sessão). Nada nesta fase impede um script de bater repetidamente nestas funções para enumerar handles existentes ou sobrecarregar a base de dados. Aceitável para o MVP; a decidir se/quando adicionar rate limiting (ex.: via Supabase Edge Functions ou um middleware dedicado).
2. **`handle` sem `NOT NULL` na base de dados:** decisão deliberada (ver Tarefa 0), mas significa que uma conta criada fora do formulário de signup (ex.: futuro backoffice) pode ficar sem handle. Se/quando essa via existir, terá de gerar um handle ela própria (reutilizando `suggest_handle`) antes do INSERT.
3. **Editar o handle depois do signup:** fora de escopo nesta v1 (ver feature-spec §7), mas a estrutura (`unique`, `CHECK`, `is_handle_available`) já suporta isso sem alterações — só falta expor a UI e decidir se há um limite de trocas.
