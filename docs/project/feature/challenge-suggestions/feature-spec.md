# Feature Spec — Challenge Suggestions (AI-Assisted)

**Status:** Draft
**Created:** 2026-09-12
**Last updated:** 2026-09-12
**Author:** Leandro Oliveira

---

## 1. Overview

Financial Challenges (shipped) already lets a user or family activate a time-boxed goal, but today every challenge starts from a blank form or a static template — the user has to notice, on their own, that they're overspending somewhere or could commit to a savings target. This sub-feature adds a second, complementary origin for a challenge: a **suggestion** proposed automatically from the workspace's existing financial data, shown as a distinct card the user can accept (which creates a real challenge) or dismiss.

This builds directly on Financial Challenges' data model and its explicit design goal of being legible to a future AI agent (`getChallengeSummary()`/`listChallengeSummaries()` as a stable read contract, self-describing schema via `comment on table`/`comment on column`). It is the first feature to actually exercise that promise: a process — rule-based today, LLM-backed later — reads a workspace's financial context and writes structured suggestions, never freeform text, never an already-committed challenge.

## 2. Core Objective

Enable a workspace to receive challenge suggestions generated from its own financial data (recurring expenses, income, existing challenge history), each shown as a card the user must explicitly accept before it becomes a real challenge.

## 3. Context: How This Area Currently Works

- **Financial Challenges** (shipped, `docs/project/feature/00-FEATURE-DONE/financial-challenges/`) — `challenge_templates`, `financial_challenges`, `challenge_entries`; `createChallenge()`/`getChallengeSummary()`/`listChallengeSummaries()` in `lib/challenges/`. This sub-feature adds a suggestion stage that, on acceptance, calls the existing `createChallenge()` — it does not duplicate challenge-creation logic.
- **Manual Income & Recurring Expenses** (shipped) — `income_sources`, `recurring_expenses`, `expense_categories`, all `workspace_id`-scoped, cadence-based (`diaria`/`semanal`/`mensal`/`trimestral`/`semestral`/`anual`). `lib/dashboard/overview.ts`'s `groupMonthlyTotals()`/`sumActiveMonthly()` already normalize these to monthly-equivalent totals per category — this sub-feature reuses that normalization instead of re-deriving it.
- **What does NOT exist yet, and bounds this feature's v1:** `transactions` (Manual Transactions is still Draft, no implementation plan). There is no ledger of what a user actually spent, day by day — only the recurring rules above and each challenge's own `challenge_entries` (which only exist once a challenge is already active, so they cannot be used to *originate* a suggestion). v1's "pattern detection" is therefore necessarily rule-based over recurring-expense configuration, not behavioral analysis of real transaction history. See §7 and §10.
- **No existing AI infrastructure.** There is no `lib/ai/`, no `/api/ai/*` route, no LLM client anywhere in the codebase — "AI Transaction Categorization" (backlog, Draft) is the only other feature that mentions one, and it hasn't been built either. This sub-feature's generator is deliberately a plain, deterministic TypeScript function in v1 (see §5), not a call to an external model — the same "structured data in, structured suggestion out, human confirms" discipline that AI Transaction Categorization's spec already commits to.

## 4. User Flow

```
1. Utilizador abre "Desafios" (ou a dashboard, ver secção 9)
2. Se existirem sugestões pendentes para o workspace, aparecem no topo da
   lista, visualmente distintas de um desafio real (secção 9) — cada uma
   mostra o nome sugerido, o tipo de métrica, o valor alvo, e uma frase de
   justificação (ex: "Gastas em média 180€/mês em Restaurantes — queres
   tentar reduzir 20%?")
3. Se não houver sugestões (ou as existentes já foram todas aceites/
   dispensadas), o utilizador pode pedir novas sugestões através de uma
   ação explícita (botão "Sugerir desafios") — v1 não gera sugestões em
   background/agendado, só a pedido (ver secção 7)
4. Ao pedir, o sistema lê o contexto financeiro do workspace
   (getSuggestionContext) e gera 0-N sugestões (generateChallengeSuggestions)
5. Por cada sugestão nova, o utilizador escolhe:
   - Aceitar: a sugestão vira um desafio real (mesma chamada createChallenge()
     já usada pelo fluxo manual), com status='active' a partir de hoje
   - Dispensar: a sugestão fica marcada como recusada e não volta a aparecer
     (não impede uma sugestão diferente, com parâmetros diferentes, de
     aparecer numa geração futura)
6. Uma sugestão aceite ou dispensada desaparece da lista de pendentes;
   o desafio criado (se aceite) segue o fluxo normal de Financial Challenges
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Quem gera as sugestões? | Uma função pura, determinística, do lado do servidor (`generateChallengeSuggestions`) — não uma chamada a um LLM. Mantém a mesma disciplina de `lib/challenges/summary.ts` (lógica em código de aplicação, não escondida numa API externa nem em SQL). Pensada para ser substituível por uma geração via LLM no futuro, sem mudar o contrato de entrada/saída. |
| Qual é o contrato de entrada do gerador? | `getSuggestionContext(workspaceId)` — devolve um objeto tipado e estável (rendimentos e despesas recorrentes normalizados para total mensal por categoria, desafios já ativos/concluídos do workspace) — o equivalente, para sugestões, ao que `getChallengeSummary()` já é para um desafio existente. |
| Uma sugestão é um desafio "rascunho" ou uma entidade própria? | Entidade própria (`challenge_suggestions`), nunca escrita diretamente em `financial_challenges`. Só passa a ser um desafio real quando o utilizador aceita, através da mesma `createChallenge()` já validada. Isto evita que uma sugestão ainda não confirmada apareça misturada com desafios reais em qualquer leitura existente. |
| Quem pode gerar sugestões, e com que privilégio escreve? | Qualquer membro do workspace pode pedir a geração (ação normal, RLS de leitura igual ao resto da app), mas a escrita de novas sugestões corre com `service_role` (como um processo interno, não como o utilizador autenticado) — não há uma política RLS de `insert` para `authenticated` nesta tabela. Nenhum membro escreve uma sugestão diretamente; só o processo gerador o faz. |
| Uma sugestão pode ser criada silenciosamente como desafio, sem confirmação? | Não, nunca. Aceitar é sempre uma ação explícita do utilizador — mesmo princípio já usado (e ainda por implementar) em "AI Transaction Categorization": sugestão estruturada, nunca aplicada sem confirmação humana. |
| Sugestões repetem-se indefinidamente? | Não — dedup por uma chave estável (`metric_type` + `category_id` + `source`, ver secção 6): se já existe uma sugestão pendente ou recusada com a mesma chave, uma nova geração não a repete. Uma sugestão dispensada só volta a poder ser sugerida com parâmetros distintos (ex: percentagem de redução diferente). |
| Como é que isto evolui quando Manual Transactions existir? | `getSuggestionContext` ganha uma fonte de dados adicional (spend real, não só regras recorrentes) sem mudar a assinatura pública; `generateChallengeSuggestions` ganha heurísticas novas. Nenhuma mudança é necessária no lado da UI ou da tabela `challenge_suggestions`. |

## 6. Key Entities

```text
challenge_suggestions (workspace-scoped)
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  owner_user_id   uuid FK -> auth.users, nullable (mesma semântica de financial_challenges: null = sugestão de família)
  name            text not null
  metric_type     text CHECK in ('spending_limit','savings_target','category_reduction','no_spend_streak')
  target_value    numeric(12,2) not null, CHECK: > 0 exceto no_spend_streak (>= 0, mesma regra de financial_challenges)
  category_id     uuid FK -> expense_categories, nullable
  baseline_value  numeric(12,2), nullable, obrigatório quando metric_type='category_reduction'
  start_date      date not null       -- sempre "hoje" no momento em que a sugestão é gerada, nunca no passado
  end_date        date not null, CHECK end_date > start_date
  rationale       text not null       -- frase curta, gerada pelo gerador, mostrada no card (ex: "Baseado na tua despesa recorrente em Restaurantes")
  source          text not null CHECK in ('recurring_expense_reduction','no_active_streak','savings_gap')  -- identifica qual heurística gerou isto; extensível
  dedup_key       text not null       -- `${metric_type}:${category_id ?? 'none'}:${source}`, unique por workspace enquanto status='pending' (ver secção 8)
  status          text CHECK in ('pending','accepted','dismissed'), default 'pending'
  resolved_at     timestamptz, nullable
  created_at      timestamptz not null default now()
```

**A peça pensada para o gerador (hoje determinístico, no futuro possivelmente um LLM):**

```ts
type SuggestionContext = {
  workspaceId: string
  monthlyIncomeTotal: number
  monthlyExpensesByCategory: { categoryId: string; categoryLabel: string; monthlyTotal: number }[]
  activeChallenges: ChallengeSummary[]        // reaproveita o tipo já existente
  members: { userId: string; label: string }[]
}

type ChallengeSuggestionDraft = {
  name: string
  metricType: MetricType
  targetValue: number
  categoryId: string | null
  baselineValue: number | null
  durationDays: number
  rationale: string
  source: 'recurring_expense_reduction' | 'no_active_streak' | 'savings_gap'
}

function generateChallengeSuggestions(context: SuggestionContext): ChallengeSuggestionDraft[]
```

`generateChallengeSuggestions` é uma função pura (entra `SuggestionContext`, sai `ChallengeSuggestionDraft[]`, sem I/O) — a mesma disciplina de `lib/challenges/summary.ts`. O servidor (`refreshChallengeSuggestions` — ver secção 9) é responsável por chamar `getSuggestionContext`, correr o gerador, aplicar dedup, e persistir.

## 7. Out of Scope (v1)

- **Deteção de padrões sobre histórico de transações reais** — bloqueado por Manual Transactions não existir. v1 deriva sugestões só de `recurring_expenses`/`income_sources` (regras configuradas, não comportamento observado) e do estado atual dos desafios do workspace.
- **Geração via LLM** — v1 é 100% determinístico (regras simples, código TypeScript). A troca por um gerador com IA é um passo futuro que não deve exigir mudar o contrato `SuggestionContext -> ChallengeSuggestionDraft[]`.
- **Geração agendada/em background** (cron, job periódico) — v1 só gera a pedido explícito do utilizador (botão). Gerar proativamente sem o utilizador pedir é uma decisão de produto (frequência, fadiga de notificação) fora do âmbito desta spec.
- **Notificações proativas** de uma nova sugestão disponível — depende da futura feature de Alertas, mencionada no `INDEX.md` do produto.
- **Pontuação de confiança/prioridade entre sugestões** — v1 não ordena por relevância; mostra todas as sugestões pendentes.
- **Edição de uma sugestão antes de aceitar** — aceitar cria o desafio exatamente com os parâmetros sugeridos; para ajustar, o utilizador dispensa a sugestão e cria/edita um desafio manualmente. Editar-antes-de-aceitar pode ser adicionado depois sem mudar o modelo de dados.

## 8. Security Considerations

- RLS em `challenge_suggestions`: leitura (`select`) para qualquer `is_workspace_member(workspace_id)`, igual ao resto da app — todos os membros veem as mesmas sugestões pendentes do workspace. `update` (para aceitar/dispensar, i.e. mudar `status`) restrito a membros do workspace também — qualquer membro pode agir sobre uma sugestão de família, mesma transparência já usada em `financial_challenges`.
- **Nenhuma política de `insert` para `authenticated`** — só `service_role` escreve novas sugestões. Isto é deliberado: um membro do workspace nunca deve conseguir forjar uma sugestão diretamente (ex: para se auto-atribuir um desafio com parâmetros arbitrários disfarçado de "sugestão do sistema"). A Server Action que gera sugestões (`refreshChallengeSuggestions`) corre como o utilizador autenticado para *ler* o contexto (respeitando RLS de leitura normal), mas usa o cliente `service_role` só para o `insert` final em `challenge_suggestions`.
- Aceitar uma sugestão chama a mesma `createChallenge()` já auditada (RLS de `financial_challenges` inalterada) — não há um caminho de escrita novo para a tabela de desafios reais.
- `dedup_key` só é único **enquanto `status='pending'`** (constraint parcial) — depois de aceite ou dispensada, a mesma chave pode voltar a ser sugerida com uma geração futura (ex: se o utilizador dispensou e a despesa recorrente relevante mudou de valor).

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Página "Desafios" | Cards de sugestão pendentes no topo da lista, com tratamento visual distinto (proposto: acento violeta — já reservado no design system para "destaque/challenge features" — em vez do jade usado nos desafios reais, para nunca serem confundidos com um desafio já ativo), botão "Sugerir desafios" para pedir uma nova geração |
| Card de sugestão | Nome, tipo, valor alvo, `rationale`, dois botões: "Aceitar" / "Dispensar" |
| Dashboard do workspace | (futuro, fora desta spec) um resumo tipo "2 sugestões novas" apontando para "Desafios", seguindo o padrão dos outros widgets |

## 10. Relationship to Existing Features

Depende de **Financial Challenges** (shipped) para o modelo de desafio real e a ação `createChallenge()`, e de **Manual Income & Recurring Expenses** (shipped) para os dados de entrada do gerador v1 via `lib/dashboard/overview.ts`. Torna-se substancialmente mais capaz quando **Manual Transactions** existir (histórico real de gastos em vez de regras recorrentes). É o segundo exemplo concreto, nesta plataforma, do padrão "estrutura de dados desenhada para consumo por um agente de IA" — depois de `getChallengeSummary()`, `getSuggestionContext()`/`generateChallengeSuggestions()` é o mesmo padrão (objeto tipado e estável, função pura, sem lógica escondida em SQL) aplicado a geração em vez de leitura. Prepara o terreno arquitetural para **AI Transaction Categorization** (backlog) e para a futura **AI Financial Advisor Layer** (backlog) — ambas vão precisar do mesmo tipo de contrato "contexto estruturado in, sugestão estruturada out, confirmação humana obrigatória".
