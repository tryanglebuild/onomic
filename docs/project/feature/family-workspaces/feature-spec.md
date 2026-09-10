# Feature Spec — Family Workspaces

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06 (added `profiles.role` RBAC foundation)
**Author:** Leandro Oliveira

---

## 1. Overview

O Onomic é uma plataforma multi-tenant: o mesmo utilizador pode gerir as suas finanças sozinho ou em conjunto com uma família. Esta feature introduz o conceito de **workspace** — o contentor de todos os dados financeiros (transações, cofres, desafios) — e o modelo de pertença que decide quem vê o quê. É a fundação de que todas as outras features do produto dependem: nenhuma transação, cofre ou desafio existe fora de um workspace.

Cada utilizador tem sempre um workspace pessoal, criado automaticamente no signup, e pode adicionalmente pertencer a um ou mais workspaces de família, cada um partilhado com outras pessoas via convite.

Esta feature também introduz uma tabela `profiles` (1:1 com `auth.users`) com uma coluna `role` de plataforma (`user`/`admin`/`support`) — distinta do `role` de `workspace_members` (que é por-workspace: `owner`/`member`). Não constrói nenhum backoffice agora, mas estabelece a base de dados de que um futuro sistema RBAC/backoffice vai precisar caso o produto abra ao público.

## 2. Core Objective

Allow a user to manage their finances in an isolated personal space and, independently, in one or more shared family spaces, without ever leaking data between them.

## 3. Context: How This Area Currently Works

Não existe ainda nenhuma implementação — esta é a primeira feature do projeto. Depende apenas do Supabase Auth (signup/login), que fornece `auth.uid()` para as políticas de RLS.

## 4. User Flow

```
1. Utilizador faz signup (Supabase Auth)
2. Sistema cria automaticamente:
   - workspace (type='personal', created_by=user.id)
   - workspace_members (workspace_id, user_id, role='owner')
3. Utilizador usa a app normalmente dentro do seu workspace pessoal
   (seletor de workspace mostra só "Pessoal" nesta fase)
4. Utilizador escolhe "Criar família" →
   - cria workspace (type='family')
   - torna-se 'owner' em workspace_members
5. Owner convida outra pessoa por email →
   - cria workspace_invites (token assinado, expira em N dias)
   - convidado recebe link, aceita (autenticado ou faz signup primeiro)
   - aceite → workspace_members (role='member') + invite.status='accepted'
6. Ambos os membros agora veem o seletor de workspace com "Pessoal" + "<Nome da Família>"
7. Trocar de workspace no seletor filtra todo o dashboard para esse contexto
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Um utilizador pode pertencer a mais do que uma família? | Sim — workspaces múltiplos, sem limite definido no MVP |
| O workspace pessoal pode ter outros membros? | Não — é sempre 1:1 com o dono, nunca aceita convites |
| Como é garantido o isolamento de dados? | Row Level Security (RLS) no Postgres, não apenas validação na app |
| Como funcionam os convites? | Token assinado com expiração — nunca por correspondência simples de email |
| Quem pode convidar/remover membros? | Apenas `role='owner'` do workspace |
| Existe um conceito de role de plataforma (para um futuro backoffice)? | Sim — tabela `profiles` com coluna `role` (`user`\|`admin`\|`support`), separada do `role` por-workspace de `workspace_members`. Só a base de dados é criada agora; nenhuma UI de backoffice faz parte desta feature |
| Quem pode alterar `profiles.role`? | Ninguém via cliente no MVP — sem política RLS de UPDATE nesta tabela; só seria alterável no futuro por um serviço de backoffice de confiança (ou uma função `SECURITY DEFINER` dedicada, a desenhar nessa altura) |

Nota: a decisão de RLS como mecanismo de isolamento (em vez de checks só na aplicação) foi tomada porque dados financeiros multi-pessoa exigem que uma falha de código na app nunca resulte em fuga de dados entre famílias — a base de dados recusa por defeito.

## 6. Key Entities

```text
workspaces
  id              uuid PK
  type            enum('personal','family')
  name            text
  created_by      uuid FK -> auth.users
  created_at      timestamptz

workspace_members
  workspace_id    uuid FK -> workspaces, cascade delete
  user_id         uuid FK -> auth.users, cascade delete
  role            enum('owner','member')
  joined_at       timestamptz
  PK (workspace_id, user_id)

workspace_invites
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  invited_email   text
  token           text (assinado, único, indexado)
  status          enum('pending','accepted','expired')
  created_by      uuid FK -> auth.users
  created_at      timestamptz
  expires_at      timestamptz

profiles
  id              uuid PK, FK -> auth.users, cascade delete (1:1 com o utilizador)
  role            enum('user','admin','support'), default 'user'
  created_at      timestamptz
```

Nota: `profiles.role` é um papel de **plataforma** (quem poderá um dia aceder a um backoffice interno), completamente independente do `workspace_members.role` (que é um papel **por-workspace**, `owner`/`member`). Um `admin` de plataforma não ganha automaticamente acesso aos dados financeiros de nenhum workspace — isso continua a exigir pertença em `workspace_members`; um eventual backoffice teria de implementar o seu próprio caminho de acesso, fora de escopo aqui.

Constraint: trigger/check garante que um workspace `type='personal'` nunca tem mais do que 1 linha em `workspace_members`.

## 7. Out of Scope (v1)

- Múltiplos níveis de permissão além de `owner`/`member` (ex: "viewer" só-leitura) — deferido até haver necessidade real.
- Transferência de ownership de um workspace de família — no MVP o criador é sempre owner.
- Fusão ou divisão de workspaces existentes.
- Qualquer UI de backoffice, painel de administração, ou lógica que atue com base em `profiles.role` — esta feature cria apenas a coluna e a tabela; nada no produto lê ou decide com base nela ainda.
- Atribuição/alteração de `profiles.role` por qualquer via de cliente — no MVP todos os utilizadores nascem `role='user'` e ficam assim.

## 8. Security Considerations

- RLS em `workspaces`, `workspace_members`, `workspace_invites`: só membros de um workspace podem ler as suas próprias linhas; apenas `owner` pode inserir/atualizar `workspace_invites` e remover membros.
- `token` de convite gerado com entropia suficiente (ex: `crypto.randomUUID()` + assinatura HMAC), nunca previsível, com `expires_at` obrigatório.
- Nenhum endpoint de app deve usar `service_role` do Supabase a partir do cliente — todas as operações passam pelas policies RLS com a sessão do utilizador autenticado.
- `profiles`: RLS permite a cada utilizador ler apenas a sua própria linha (`id = auth.uid()`); **sem política de INSERT/UPDATE/DELETE para clientes** — a linha é criada apenas pelo trigger de signup, e `role` só seria alterável no futuro por um caminho de confiança fora do alcance do cliente autenticado normal (nunca por um endpoint que aceite `role` vindo do próprio utilizador).

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Header do dashboard | Seletor de workspace ativo (dropdown: Pessoal + Famílias) |
| Onboarding (após signup) | Opção "Criar/Juntar a uma família" (não bloqueia uso pessoal) |
| Definições > Família | Lista de membros, convites pendentes, botão convidar/remover |
| Página de aceitação de convite | `/invite/[token]` — mostra nome da família e botão aceitar |

## 10. Relationship to Existing Features

Fundação de toda a plataforma — [Manual Transactions](../manual-transactions/feature-spec.md), [Savings Vaults](../savings-vaults/feature-spec.md) e [Financial Challenges](../financial-challenges/feature-spec.md) dependem todas de `workspace_id` existir e das policies RLS aqui definidas. As frentes futuras de Investment Tracking reutilizam o mesmo modelo de workspace sem alterações.
