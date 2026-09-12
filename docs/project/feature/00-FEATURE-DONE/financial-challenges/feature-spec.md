# Feature Spec — Financial Challenges

**Status:** Shipped (v2 — entries-based progress, no Manual Transactions/Savings Vaults dependency). Implemented, tested, code-reviewed; migrations not yet applied to the hosted project — see [RUNBOOK.md](./RUNBOOK.md).
**Created:** 2026-09-06
**Last updated:** 2026-09-12
**Author:** Leandro Oliveira

---

## Revision note (v2)

v1 (approved 2026-09-06) depended on `transactions`/`categories` (Manual Transactions feature) and, optionally, `vaults` (Savings Vaults feature) — neither exists in the codebase, and neither has an implementation plan. This revision removes both dependencies: progress is now derived from a `challenge_entries` table scoped to each challenge (a lightweight, per-challenge log the user or family logs against), not a platform-wide transaction ledger. `category_id` now references `expense_categories` (the global lookup table already shipped with the Manual Income & Recurring Expenses feature) instead of a `categories` table that never existed. `vault_id` is dropped entirely for v1 — it can be added back as a nullable column whenever Savings Vaults ships. All 4 challenge types from v1 are kept; none required a real transaction ledger once entries are the source instead.

This revision also adds an explicit requirement not present in v1: the data model and its query layer must be legible to a future AI agent — able to identify every challenge belonging to a given user or family member and cross-reference it with the rest of that workspace's financial data, to eventually power proactive support/recommendations.

## 1. Overview

Desafios financeiros são objetivos com prazo e métrica definida (ex: "Sem gastos supérfluos por 30 dias", "Poupar 1000€ em 3 meses", "Reduzir Restaurantes em 20%") que motivam o utilizador ou família a mudar comportamento de curto prazo. Esta feature oferece templates prontos para ativação rápida, e permite também criar desafios 100% customizados. O progresso é sempre calculado a partir de registos (`challenge_entries`) que o utilizador lança contra o desafio — nunca um número final introduzido diretamente.

## 2. Core Objective

Allow a user or family to activate a time-boxed financial goal (spending limit, savings target, category reduction, no-spend streak) and see its progress calculated automatically from logged entries, with the underlying data structured so a future AI agent can read, identify, and cross-reference every challenge across a user's and their family's workspace.

## 3. Context: How This Area Currently Works

Não depende de nenhuma feature de transações (não existe nenhuma). Depende de:
- **Family Workspaces** (shipped) — `workspaces`, `workspace_members`, `is_workspace_member` para o padrão de tenancy.
- **Manual Income & Recurring Expenses** (shipped) — reaproveita a tabela global `expense_categories` para a categoria opcional de um desafio, mantendo o mesmo vocabulário de categorias já usado em `/budget` e nos widgets do dashboard.

Esta feature é autossuficiente: cria a sua própria fonte de eventos (`challenge_entries`) em vez de esperar por Manual Transactions ou Savings Vaults.

## 4. User Flow

```
1. Utilizador abre "Desafios" no workspace
2. Escolhe: ativar um template (ex: "Poupar X€ em N meses" — preenche valor
   e prazo) OU criar um desafio custom (nome, métrica, valor alvo, categoria
   se aplicável, datas, e se é pessoal ou de família)
3. Desafio fica status='active'
4. Ao longo do desafio, o utilizador (ou qualquer membro da família, se o
   desafio for partilhado) regista entradas em `challenge_entries` — um
   valor + uma data + uma nota opcional. O que a entrada representa depende
   do metric_type do desafio-pai:
   - spending_limit: cada entrada é um gasto no período
   - savings_target: cada entrada é uma contribuição de poupança
   - category_reduction: cada entrada é um gasto na categoria alvo
   - no_spend_streak: cada entrada é um gasto na categoria alvo (quebra a
     sequência) — a ausência de entradas é o que mantém a sequência viva
5. O progresso é sempre recalculado a partir das entradas existentes,
   nunca escrito diretamente:
   - spending_limit: soma de entradas no período vs. target_value (quanto
     falta para atingir o limite)
   - savings_target: soma de entradas vs. target_value
   - category_reduction: soma de entradas no período do desafio vs.
     `baseline_value` — um valor de referência que o utilizador introduz
     UMA VEZ ao criar o desafio (ex: "gastei 400€ em Restaurantes no mês
     passado"), não uma "sondagem" automática ao período anterior — como
     `challenge_entries` só existe a partir do início do desafio, não há
     histórico anterior para comparar automaticamente
   - no_spend_streak: dias consecutivos desde start_date (ou desde a
     última entrada) sem uma nova entrada
6. Dashboard/página do desafio mostra progresso em tempo real (ex: "62% do
   caminho, 12 dias restantes")
7. Ao expirar o prazo (end_date passado): status muda para 'completed' ou
   'failed' consoante o alvo foi ou não atingido — calculado on-read, não
   por um job agendado (ver secção 8, Out of Scope)
8. Utilizador pode abandonar um desafio a qualquer momento (status='abandoned')
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Existem templates prontos? | Sim, catálogo de `challenge_templates` + opção de criar 100% custom |
| O progresso é guardado ou calculado? | Sempre calculado a partir de `challenge_entries`, nunca um número final editado diretamente |
| De onde vêm os eventos de progresso, já que não há `transactions`? | `challenge_entries` — uma tabela própria desta feature, scoped ao `challenge_id`, não uma tabela global de transações |
| Um desafio pode alimentar um cofre? | Não na v1 — `vault_id` removido (Savings Vaults não existe); pode voltar como coluna nullable quando essa feature nascer |
| Um desafio pertence a um membro ou à família toda? | Ambos — `owner_user_id` nullable: `null` = desafio de família (qualquer membro contribui e vê o progresso agregado), preenchido = desafio pessoal desse membro dentro do workspace partilhado |
| Quem pode ativar um desafio num workspace de família? | Qualquer membro (mesmo padrão de permissão usado no resto da app) |
| Quem pode editar/abandonar um desafio? | Só quem o criou (`created_by`) — qualquer membro pode ler e lançar entradas num desafio de família, mas não editar os seus parâmetros |
| Como fica isto legível para um agent de IA? | Ver secções 6 e 7 — `getChallengeSummary()`/`listChallengeSummaries()` são o contrato único e estável que resolve um desafio + progresso + dono num objeto tipado, para não obrigar um agent a reimplementar a lógica de cálculo |

## 6. Non-Functional Requirements (escalabilidade, segurança, gestão, legibilidade para agent)

- **Escalabilidade:** índices em `financial_challenges(workspace_id, status)` e `challenge_entries(challenge_id, occurred_on)` — as duas formas como estes dados são sempre lidos (lista de desafios ativos de um workspace; entradas de um desafio por ordem cronológica). `challenge_entries` cresce sem limite ao longo do tempo por desafio; a lista de entradas na UI é sempre paginada (nunca "buscar todas"), e o cálculo de progresso soma via `SUM()` no próprio pedido em vez de carregar todas as linhas para JS — o mesmo princípio já usado nas queries de `lib/finance/queries.ts`. Novos `metric_type` no futuro (ex. para desafios de investimento) só acrescentam um valor ao `CHECK`, nunca uma migração estrutural.
- **Segurança:** para além do RLS por `workspace_id` (secção 8), `challenge_entries.occurred_on` tem `CHECK` para cair dentro de `[start_date, end_date]` do desafio-pai — impede lançar uma entrada fora do período, o que corromperia o cálculo de progresso. A política RLS de `challenge_entries` nunca confia num `workspace_id` próprio (a tabela não tem essa coluna) — verifica sempre via `exists (select 1 from financial_challenges c where c.id = challenge_entries.challenge_id and is_workspace_member(c.workspace_id))`, o mesmo padrão de "verificar através do pai" já usado noutras tabelas filhas da plataforma.
- **Fácil gestão:** o criador (`created_by`) pode editar os parâmetros de um desafio ainda `active` (nome, `target_value`, datas) através da mesma Server Action que o cria — não há uma via de edição separada. Qualquer membro do workspace pode lançar entradas num desafio partilhado; só o criador edita/abandona.
- **Fácil análise por um agent:** além de `getChallengeSummary()` (um desafio), existe `listChallengeSummaries(workspaceId)` — devolve o array de `ChallengeSummary` de todos os desafios do workspace num único pedido, para um agent (ou a própria página "Desafios") conseguir uma vista completa sem N chamadas. O schema é autodescritivo: cada tabela e cada coluna não óbvia leva um `comment on table`/`comment on column` na migração (ex. `comment on column financial_challenges.owner_user_id is 'null = desafio de família, preenchido = desafio pessoal deste membro';`), para que um agent a inspecionar o schema diretamente (não só o código da app) já perceba o significado sem contexto adicional.

## 7. Key Entities

```text
challenge_templates (global, leitura pública, sem workspace_id)
  id              uuid PK
  key             text unique (ex: 'savings_target_default')
  name            text
  description     text
  metric_type     text CHECK in ('spending_limit','savings_target','category_reduction','no_spend_streak')
  default_params  jsonb   -- só valores de pré-preenchimento (ex: {"suggested_target": 1000}), nunca dados core

financial_challenges (workspace-scoped)
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  owner_user_id   uuid FK -> auth.users, nullable (null = desafio de família)
  created_by      uuid FK -> auth.users, not null
  template_id     uuid FK -> challenge_templates, nullable
  name            text not null
  metric_type     text CHECK in ('spending_limit','savings_target','category_reduction','no_spend_streak')
  target_value    numeric(12,2) not null, CHECK > 0
  category_id     uuid FK -> expense_categories, nullable
  baseline_value  numeric(12,2), nullable, CHECK not null when metric_type='category_reduction'
  start_date      date not null
  end_date        date not null, CHECK end_date > start_date
  status          text CHECK in ('active','completed','failed','abandoned'), default 'active'
  created_at, updated_at timestamptz

challenge_entries
  id              uuid PK
  challenge_id    uuid FK -> financial_challenges, cascade delete
  amount          numeric(12,2) not null, CHECK > 0
  occurred_on     date not null
  note            text nullable
  created_by      uuid FK -> auth.users, not null
  created_at      timestamptz
```

**A peça pensada para o agent de IA:** `lib/challenges/summary.ts` exporta `getChallengeSummary(challenge, entries, workspaceMembers)`, uma função pura que devolve um objeto completamente resolvido:

```ts
type ChallengeSummary = {
  id: string
  workspaceId: string
  ownerUserId: string | null        // null = desafio de família
  ownerLabel: string                // "Família" ou o nome do membro dono
  name: string
  metricType: MetricType
  categoryLabel: string | null
  targetValue: number
  baselineValue: number | null      // só usado por category_reduction
  currentValue: number              // sempre derivado das entries, nunca lido de uma coluna
  percentComplete: number
  daysRemaining: number
  status: 'active' | 'completed' | 'failed' | 'abandoned'
  recentEntries: { amount: number; occurredOn: string; note: string | null }[]
}
```

Este é o único ponto de leitura que um consumidor (UI ou, no futuro, um agent) precisa de chamar — nunca reimplementa a lógica de "quanto falta" ou "está a cumprir o prazo". A mesma disciplina já usada em `lib/dashboard/overview.ts` (cálculo sempre em código de aplicação, nunca em SQL derivado). `listChallengeSummaries(workspaceId)` (ver secção 6) faz o mesmo para todos os desafios de um workspace de uma vez.

## 8. Out of Scope (v2)

- Ligação a um cofre de poupança (`vault_id`) — adicionar quando Savings Vaults existir.
- Job periódico/agendado a recalcular status em background — o status é resolvido on-read (a próxima vez que a página/summary é pedida), suficiente para o volume esperado.
- Desafios recorrentes automáticos (relançar "poupar X€" todos os meses).
- Gamificação (badges, pontos, ranking entre membros da família).
- Notificações proativas de desvio de ritmo — depende de uma futura feature de Alertas; `getChallengeSummary()` já expõe `daysRemaining`/`percentComplete`, que essa feature futura pode consumir diretamente.
- Edição/remoção de `challenge_entries` individuais após lançadas (só apagar o desafio inteiro, cascade) — evita reabrir a questão de quem pode corrigir o registo de outro membro num desafio de família.

## 9. Security Considerations

- RLS em `financial_challenges` e `challenge_entries` — via `is_workspace_member(workspace_id)` para leitura (todos os membros veem todos os desafios do workspace, pessoais ou partilhados — mesma transparência já usada no resto da app); update/delete de `financial_challenges` restrito a `created_by = auth.uid()`; insert de `challenge_entries` permitido a qualquer membro do workspace do desafio-pai.
- `challenge_templates` é uma tabela global de leitura pública (sem `workspace_id`), sem dados sensíveis.
- Nenhum privilégio elevado necessário — ao contrário do v1 (que previa uma Edge Function com privilégio elevado para o job de recálculo), o v2 calcula tudo em código de aplicação normal, sob o utilizador autenticado, sem bypass de RLS.

## 10. UI Entry Points

| Location | What appears |
|---|---|
| Dashboard do workspace | (futuro, fora desta spec) um widget "Desafios ativos" seguindo o mesmo padrão dos widgets já existentes |
| Página "Desafios" | Catálogo de templates + lista de desafios ativos/concluídos/falhados, cada um com `owner_user_id` visível (badge "Família" ou o nome do membro) |
| Página individual do desafio | Progresso detalhado (via `getChallengeSummary()`), formulário para lançar uma nova entrada, lista de entradas recentes, opção abandonar |

## 11. Relationship to Existing Features

Depende de **Family Workspaces** (tenancy) e reutiliza `expense_categories` de **Manual Income & Recurring Expenses**. Não depende de Manual Transactions nem de Savings Vaults — ambas ficam como integrações futuras opcionais (`vault_id` a adicionar depois). É o precedente conceptual para os futuros **desafios de investimento** (frente de Investment Tracking, fora desta spec), que reutilizarão o mesmo padrão de templates + `*_entries` + `getSummary()`, aplicado a métricas de investimento em vez de gastos. `getChallengeSummary()` é também o primeiro exemplo concreto, nesta plataforma, de uma estrutura de dados desenhada deliberadamente para consumo futuro por um agent de IA — o mesmo padrão (função pura, objeto tipado e estável, sem lógica escondida em SQL) deve ser repetido sempre que uma feature futura precisar de expor o seu estado a um agent.
