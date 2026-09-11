# Rendimento e Gastos Recorrentes (configuração manual) — Design Spec

Date: 2026-09-11
Status: Approved (design), pending implementation plan

## Problem

A plataforma foi construída assumindo, implicitamente, que a maioria das
features (Orçamento, Vaults, Objetivos, Desafios) vai depender de dados
vindos de uma ligação a conta bancária — que ainda não existe e pode nunca
vir a existir (`/accounts/connect` é um stub). Isto bloqueia o
desenvolvimento de qualquer feature que precise de saber "quanto o user
ganha" ou "quanto o user gasta fixo".

Confirmado por levantamento do código: não existe nenhuma tabela
financeira (`accounts`, `transactions`, `income`, `expenses`, `goals`,
`vaults`, `challenges`) e zero referências a bank connection no schema —
é uma tela em branco, sem lógica pré-existente para contornar.

## Goals

- Permitir ao user configurar manualmente as suas fontes de rendimento
  (nome, valor, cadência, tipo).
- Permitir ao user configurar manualmente os seus gastos fixos/recorrentes
  (nome, valor, cadência, categoria), com cadências de diária a anual.
- Calcular e apresentar um resumo (rendimento mensal estimado, gastos
  mensais estimados, saldo disponível estimado) normalizando qualquer
  cadência para equivalente mensal.
- Preparar o terreno para uma futura feature de IA que filtre/agrupe
  gastos e rendimento por categoria/tipo (via `category_id`/
  `source_type_id`, não por comparação de strings) — pode olhar tanto
  para os dados de um user individual como agregados ao nível da família
  (workspace).
- Substituir o stub `/budget` pela primeira versão real da página.

## Non-goals

- Ligação a bank connection / importação de extratos — este subsistema
  é deliberadamente independente disso.
- Lançamento automático de transações reais a partir das regras de
  rendimento/gastos (ex.: criar uma transação todo dia 1). As regras
  aqui são puramente de planeamento; uma tabela de `transactions` real
  (lançamentos manuais ou importados) é um sub-projeto futuro separado.
- Vaults, Objetivos financeiros e Desafios — sub-projetos futuros
  separados que vão consumir os dados aqui criados (ex.: "saldo
  disponível estimado" como input para quanto pode ir para um Vault).
- Gestão de categorias pela UI (criar/editar/remover categorias) — as
  tabelas de lookup são seedadas por migração; gestão via UI fica para
  quando houver necessidade real.
- Limites de orçamento por categoria ("não gastar mais de X em
  Alimentação") — fica para uma spec futura de "Orçamento" propriamente
  dito, que consome estas tabelas.

## Data model

Duas tabelas de domínio (`income_sources`, `recurring_expenses`) e duas
tabelas de lookup globais (`income_source_types`, `expense_categories`).
Lookup tables ficam fora do tenancy de workspace (são globais, partilhadas
por toda a plataforma) e existem para dar um `id` estável a cada tipo/
categoria, de forma a que filtragem futura (incluindo por uma IA) use
`category_id`/`source_type_id` em vez de comparar texto livre.

```sql
create table income_source_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null
);

create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order int not null
);

create table income_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_type_id uuid not null references income_source_types(id),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cadence text not null check (cadence in ('diaria','semanal','mensal','trimestral','semestral','anual')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  category_id uuid not null references expense_categories(id),
  name text not null,
  amount numeric(12,2) not null check (amount > 0),
  cadence text not null check (cadence in ('diaria','semanal','mensal','trimestral','semestral','anual')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Seed inicial (inserido na própria migração):

- `income_source_types`: salario, freelance, arrendamento, investimento,
  pensao, outro.
- `expense_categories`: habitacao, alimentacao, transporte, subscricoes,
  saude, educacao, lazer, seguros, dividas, outros.

Ambas as tabelas de lookup são geridas só por migração nesta fase — sem
insert/update/delete pela app.

## Tenancy & RLS

`income_sources` e `recurring_expenses` seguem o único padrão de tenancy
já usado no código: `workspace_id` + as funções SECURITY DEFINER
`is_workspace_member(workspace_id)` / `is_workspace_owner(workspace_id)`
já existentes em `supabase/migrations/20260906120000_001_family_workspaces.sql`.

```sql
create policy income_sources_select on income_sources
  for select using (is_workspace_member(workspace_id));
create policy income_sources_write on income_sources
  for insert with check (is_workspace_member(workspace_id));
create policy income_sources_update on income_sources
  for update using (is_workspace_member(workspace_id));
create policy income_sources_delete on income_sources
  for delete using (is_workspace_member(workspace_id));
-- mesmas 4 policies para recurring_expenses
```

Qualquer membro do workspace (pessoal ou família) pode gerir os dados —
tratado como orçamento partilhado, igual ao resto do padrão de família já
implementado. Não há distinção "por membro" dentro do workspace nesta
fase (decisão explícita do design, ver secção de alternativas
consideradas).

`income_source_types` e `expense_categories`: RLS de leitura aberta a
qualquer utilizador autenticado (`for select using (true)`), sem policy de
escrita pela app.

## Business logic

`lib/finance/cadence.ts` — função pura `toMonthlyAmount(amount, cadence)`:

```
diaria      → amount * 30.44
semanal     → amount * 4.348
mensal      → amount
trimestral  → amount / 3
semestral   → amount / 6
anual       → amount / 12
```

O valor mensal equivalente nunca é guardado em coluna — é sempre
calculado on-the-fly a partir de `amount` + `cadence`, para nunca ficar
desatualizado.

`lib/finance/queries.ts` — `getIncomeSources(workspaceId)`,
`getRecurringExpenses(workspaceId)`, cada uma fazendo join com a
respetiva tabela de lookup (`income_source_types`/`expense_categories`)
para devolver já o `label` junto com o `id`.

## UI

Substitui o stub em `app/(dashboard)/budget/page.tsx`. Duas secções
(tabs, `@radix-ui/react-tabs` — mesma família de dependências já usada
para `Dialog`/`Collapsible`): **Rendimento** e **Gastos Fixos**.

- Topo da página: resumo com 3 números — Rendimento mensal estimado,
  Gastos mensais estimados, Saldo disponível estimado (verde/vermelho
  conforme sinal) — calculados client-side a partir das listas já
  carregadas, usando `toMonthlyAmount`.
- Cada tab: lista de cards (nome, valor, cadência, tipo/categoria,
  toggle ativo/inativo, editar, remover) + botão "Adicionar" que abre um
  formulário (`Dialog`, mesmo padrão visual do onboarding modal) com
  campos: nome, valor, cadência (select), tipo/categoria (select
  populado a partir da tabela de lookup), notas (opcional).
- Server actions em `lib/finance/actions.ts`:
  `createIncomeSource`, `updateIncomeSource`, `deleteIncomeSource`,
  `createRecurringExpense`, `updateRecurringExpense`,
  `deleteRecurringExpense` — seguindo o padrão de
  `app/onboarding/actions.ts` (validação inline, `refresh()` do
  `next/cache` no fim de cada mutação para re-renderizar a rota
  corrente, conforme `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`).

## Error handling / edge cases

- `amount <= 0` rejeitado tanto pelo CHECK constraint na BD como
  validado no cliente antes do submit (mensagem de erro inline no
  formulário, sem alert nativo).
- Apagar uma fonte de rendimento/gasto é uma remoção direta (não há
  ainda nenhuma outra tabela a referenciar estas linhas) — sem soft
  delete nesta fase.
- Toggle "ativo/inativo": permite ao user desativar temporariamente uma
  entrada (ex. um freelance sazonal) sem a apagar; o resumo do topo só
  soma entradas com `active = true`.
- Lista vazia (nenhuma fonte/gasto configurado ainda): empty state com
  CTA "Adicionar rendimento" / "Adicionar gasto fixo", não um card
  genérico "em breve" (a feature já existe, só não tem dados).

## Alternativas consideradas

- **Uma tabela única com discriminador `kind` ('income'|'expense')** —
  rejeitado: obrigaria `category_id` a ser nullable (só se aplica a
  gastos) e misturaria dois domínios com CHECK constraints diferentes,
  contrariando a convenção já estabelecida no código (tabelas tipadas
  por domínio, ver `onboarding_profiles`).
- **Rendimento/gastos por membro individual, não por workspace** —
  rejeitado por agora: adicionaria uma coluna `user_id` e RLS mais fina,
  sem um requisito atual que justifique a complexidade (agregação "total
  da família a partir das partes" pode ser adicionada depois sem
  alterar o schema, bastando adicionar a coluna).
- **Gerar transações reais automaticamente a partir das regras
  recorrentes** — rejeitado por agora: exigiria um job/cron ou cálculo
  projetado, e a tabela `transactions` em si ainda não existe. Fica para
  quando o sub-projeto de lançamento manual/importação de transações for
  desenhado.
- **Categorias como texto + CHECK constraint** — rejeitado a pedido
  explícito: a filtragem futura por IA precisa de um `id` estável por
  categoria/tipo, não de comparação de strings (que quebra com traduções
  ou pequenas variações de texto).

## Verification

- `npx tsc --noEmit` e `npm run lint` limpos.
- Testes de integração RLS (padrão de
  `tests/integration/family-workspaces.rls.test.ts`): membro do
  workspace vê/edita as linhas do seu workspace; user fora do workspace
  não vê nada; leitura das tabelas de lookup funciona para qualquer
  autenticado.
- Testes unitários para `toMonthlyAmount` (cada cadência, incluindo
  arredondamento).
- Playwright: signup → `/budget` → adicionar uma fonte de rendimento e
  um gasto fixo → confirmar que o resumo do topo reflete o cálculo
  correto → editar e remover uma entrada → confirmar toggle
  ativo/inativo remove do cálculo do resumo sem apagar a linha.
