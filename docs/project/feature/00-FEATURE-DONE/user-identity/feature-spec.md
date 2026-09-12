# Feature Spec — Identidade de Utilizador: Handle & Avatar

**Status:** Draft — a aguardar revisão
**Created:** 2026-09-07
**Last updated:** 2026-09-07
**Author:** Leandro Oliveira (com proposta técnica assistida)

---

## 1. Overview

Hoje, um utilizador do Onomic só é identificável pelo seu email e pelo seu `id` (UUID). Esta feature estende a tabela `profiles` — já criada em [Family Workspaces](../family-workspaces/feature-spec.md) como fundação de RBAC de plataforma — com uma identidade real: um **handle** único (`@leandro`) escolhido no próprio signup, e um **avatar** que o utilizador pode carregar e substituir numa página de perfil própria.

Não substitui nada do que já existe — `profiles.role`, `full_name` e `birth_date` mantêm-se exatamente como estão. Isto é um acrescento à mesma tabela e ao mesmo trigger de signup, não um sistema paralelo.

## 2. Core Objective

Dar a cada utilizador um identificador estável, único e legível (`@handle`) e uma identidade visual (avatar), ambos geríveis pelo próprio utilizador, sem abrir nenhuma via para o cliente alterar `profiles.role` ou ver dados de outro utilizador além do estritamente necessário para garantir que um handle é único.

## 3. Context: How This Area Currently Works

- `profiles` existe desde a migração `001` (+ `003`, que acrescentou `full_name`/`birth_date`): `id`, `role`, `full_name`, `birth_date`, `created_at`.
- Única policy de RLS: `profiles_select_own` — cada utilizador só lê a sua própria linha. **Não existe nenhuma policy de INSERT/UPDATE/DELETE** — a linha é criada apenas pelo trigger `handle_new_user_profile()`, que lê `full_name`/`birth_date` de `raw_user_meta_data` (preenchido pelo cliente em `supabase.auth.signUp({ options: { data: {...} } })`).
- Não existe nenhum conceito de handle/username, avatar, bucket de Storage, ou página de perfil em nenhum documento do projeto — é território novo.
- Family Workspaces já resolveu um problema semelhante ao que esta feature precisa (um utilizador autenticado precisar de ver dados de *outro* utilizador que a RLS normal esconderia) através de uma função `SECURITY DEFINER` dedicada (`get_workspace_members_with_email`). Reutilizamos exatamente o mesmo padrão aqui para verificar disponibilidade de handles.

## 4. User Flow

```
1. Utilizador preenche o formulário de signup (nome, email, password, confirmação,
   data de nascimento opcional, aceitação dos termos) — já existe hoje
2. Assim que o campo "Nome" tem valor, o formulário sugere um handle automaticamente
   (chama a função suggest_handle) — ex.: "Leandro Oliveira" -> "@leandro482"
3. Utilizador pode:
   - aceitar a sugestão
   - editar manualmente (com verificação de disponibilidade em tempo real via
     is_handle_available)
   - clicar "Sugerir outro" para gerar um novo candidato aleatório
4. Submissão do formulário é rejeitada no servidor (defesa em profundidade) se o
   handle for inválido ou já estiver ocupado, antes de se chamar auth.signUp()
5. auth.signUp() é chamado com handle (+ full_name, birth_date) em options.data —
   o trigger de signup insere o profile já com o handle definido
6. Utilizador acede à nova página "/settings/profile":
   - vê o seu avatar atual (ou um placeholder)
   - carrega uma imagem (validação client-side de tipo/tamanho + validação
     real no bucket)
   - a imagem é gravada em storage no caminho {user_id}/avatar.<ext>
   - profiles.avatar_path é atualizado (self-service, mas só essa coluna)
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Mantemos os 3 valores de `profiles.role` (`user`/`admin`/`support`)? | Sim — confirmado nesta conversa. `support` fica reservado para acesso de apoio ao cliente no futuro backoffice; nenhuma lógica nova associada a isto nesta feature. |
| Quando é escolhido o handle? | No próprio signup — passa a ser um campo do formulário de criação de conta, nunca uma etapa "depois". |
| Formato do handle | 3–20 carateres, `[a-z0-9_]`, começa sempre por uma letra. Reforçado por `CHECK` na própria tabela, não só na aplicação. |
| Unicidade do handle | Guardado sempre em minúsculas (normalizado no servidor, nunca confiar no cliente) + `unique` na coluna. |
| Palavras reservadas (`@admin`, `@onomic`, ...) | Tabela `reserved_handles`, não uma lista fixa no código — editável no futuro backoffice sem nova migração. |
| Algoritmo de sugestão | Slug do nome + sufixo numérico aleatório de 1 a 5 dígitos, gerado e validado inteiramente no servidor (`suggest_handle`), nunca calculado nem validado só no cliente. |
| Bucket do avatar: público ou privado? | Público — confirmado nesta conversa. Fotos de perfil não são dados sensíveis; URL estável evita gerir signed URLs para um dado deste tipo. Escrita continua restrita ao próprio utilizador via RLS em `storage.objects`. |
| Limite de tamanho do avatar | Aplicado ao nível do bucket (`file_size_limit`), não só no cliente — proposta: 2 MB, `image/png`, `image/jpeg`, `image/webp`. |
| Como é guardada a referência ao avatar? | `profiles.avatar_path` guarda o **caminho** dentro do bucket (`{user_id}/avatar.png`), nunca a URL completa — a URL pública constrói-se em runtime. |
| Como é que o utilizador passa a poder atualizar a sua própria linha (algo que hoje não existe)? | Nova policy `UPDATE using (id = auth.uid())`, combinada com `GRANT UPDATE` **ao nível de coluna** só em `full_name, handle, birth_date, avatar_path` — `role` nunca entra nessa lista, por isso continua impossível de alterar pelo cliente mesmo com a nova policy a existir. |

Nota: a policy de UPDATE em `profiles` é a primeira desta tabela — até aqui só existia SELECT. A restrição por coluna via `GRANT` (em vez de confiar numa trigger a "defender" `role`) é a forma nativa do Postgres de compor "que linhas" (RLS) com "que colunas" (GRANT), e é mais difícil de contornar por acidente do que uma trigger que alguém podia esquecer de manter.

## 6. Key Entities

```text
profiles (alterações à tabela existente)
  id            uuid PK, FK -> auth.users, cascade delete       [já existe]
  role          enum('user','admin','support'), default 'user'  [já existe, sem alterações]
  full_name     text                                             [já existe]
  birth_date    date                                             [já existe]
  handle        text unique not null                             [novo]
  avatar_path   text                                             [novo, nullable]
  created_at    timestamptz                                      [já existe]

reserved_handles (nova tabela)
  handle        text PK   -- seed: 'admin','support','onomic','api','www','help','settings','root','null'

storage.buckets (linha gerida por migração)
  id = 'avatars', public = true,
  file_size_limit = 2097152 (2MB),
  allowed_mime_types = ['image/png','image/jpeg','image/webp']

storage.objects (bucket 'avatars', policies novas)
  -- caminho esperado: {auth.uid()}/avatar.<ext>
```

Nota: `avatar_path` guarda o caminho, não a URL — se o domínio do projeto Supabase mudar (ex.: migração entre projetos), não é preciso migrar dados, só reconstruir a URL pública (`supabase.storage.from('avatars').getPublicUrl(path)`).

Constraint: `handle` tem `CHECK (handle ~ '^[a-z][a-z0-9_]{2,19}$')` — reforça em Postgres a mesma regra que a aplicação já aplica, para o caso de qualquer escrita que não passe pela UI normal.

## 7. Out of Scope (v1)

- Alterar o handle depois do signup — trocar um identificador único tem implicações (links antigos, menções futuras) que merecem uma decisão própria; nesta v1 o handle escolhido no signup é definitivo.
- Múltiplas fotos, histórico de avatares, recorte/crop de imagem no browser, moderação de conteúdo.
- Mostrar avatar/handle de outros membros nas listas existentes (`member-list.tsx` de Family Workspaces continua a mostrar só email) — a estrutura de dados já permite isto no futuro, mas não faz parte desta feature.
- Perfis públicos visíveis fora do próprio workspace.
- Menções `@handle` dentro de transações ou comentários — não existe ainda um sistema de comentários no produto.

## 8. Security Considerations

- `is_handle_available` e `suggest_handle` são `SECURITY DEFINER` (têm de ver todos os handles, de todos os utilizadores, para garantir unicidade) mas **só devolvem um booleano ou uma string** — nunca uma linha de `profiles` de outro utilizador. A policy `profiles_select_own` mantém-se intocada para leitura normal.
- A nova policy `UPDATE` em `profiles` está limitada a `id = auth.uid()` **e** à lista de colunas concedida via `GRANT` — mesmo um pedido HTTP direto ao PostgREST (contornando a UI) não consegue incluir `role` no `SET` de um `UPDATE`, porque essa coluna nunca tem `GRANT UPDATE` para o role `authenticated`.
- Upload de avatar: RLS em `storage.objects` restringe escrita ao próprio utilizador (`(storage.foldername(name))[1] = auth.uid()::text`); limite de tamanho e tipos de ficheiro aplicados ao nível do bucket — nunca confiar apenas em validação no browser.
- `reserved_handles` impede reivindicar um handle que pareça oficial (`@onomic`, `@admin`, `@support`) — verificado tanto em `is_handle_available` (para não sugerir/aceitar) como por constraint na própria tabela `profiles` antes do INSERT.
- Nenhuma alteração desta feature abre um caminho novo para o cliente alterar `profiles.role` — a garantia estabelecida em Family Workspaces mantém-se.
- Corrida (race condition) na escolha de handle: `is_handle_available` é verificado antes de submeter, mas entre essa verificação e o `INSERT` real (dentro do trigger de signup) outra pessoa pode, em teoria, reivindicar o mesmo handle primeiro. Nesse caso o `INSERT` falha por violação do `unique`, o `auth.signUp()` inteiro falha (mesma transação), e o utilizador vê um erro pedindo para escolher outro handle. Aceite como aceitável — janela de corrida extremamente pequena, e falhar de forma segura é preferível a permitir duplicados.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Formulário de signup | Campo "Handle" pré-preenchido pela sugestão, botão "Sugerir outro", indicador de disponibilidade em tempo real |
| Nova página `/settings/profile` | Avatar atual + botão de upload/substituir, nome, handle (leitura, não editável nesta v1), data de nascimento |
| Nav/member-list/convites (futuro, fora desta v1) | A estrutura de dados já suporta mostrar avatar+handle em vez de só email, mas essa mudança de UI fica para uma iteração futura |

## 10. Relationship to Existing Features

Estende diretamente a fundação de RBAC de plataforma criada em [Family Workspaces](../family-workspaces/feature-spec.md) (mesma tabela `profiles`, mesmo trigger `handle_new_user_profile()`) — não cria nenhuma tabela ou conceito paralelo. O `member-list.tsx` dessa feature (hoje só mostra email via `get_workspace_members_with_email`) é o candidato natural a passar a mostrar avatar+handle no futuro, mas essa mudança fica fora desta v1 para não misturar escopos.
