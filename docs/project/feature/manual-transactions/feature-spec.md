# Feature Spec — Manual Transactions

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Esta feature permite que um utilizador registe gastos e receitas dentro de um workspace (pessoal ou família), organizados por categoria. É o dado mais básico e frequente do produto — todo o resto (progresso de cofres, desafios financeiros, futuras recomendações de IA) deriva das transações registadas aqui.

Constrói sobre [Family Workspaces](../family-workspaces/feature-spec.md): toda transação pertence a um `workspace_id` e só é visível a membros desse workspace.

## 2. Core Objective

Allow a user to record an expense or income in seconds, categorized, without any setup friction.

## 3. Context: How This Area Currently Works

Depende de `workspaces` e `workspace_members` (feature Family Workspaces) já existirem, com RLS ativo. Não existe ainda nenhuma tabela de domínio financeiro.

## 4. User Flow

```
1. Utilizador está num workspace ativo (selecionado no header)
2. Abre "Adicionar transação"
3. Escolhe tipo: Gasto ou Receita
4. Preenche: valor, categoria (lista já populada com defaults do sistema
   + categorias próprias do workspace), data, descrição opcional
5. Confirma → transação gravada com source='manual', created_by=utilizador atual
6. Dashboard do workspace atualiza: saldo do mês, breakdown por categoria
7. Qualquer membro do mesmo workspace (numa família) vê a transação imediatamente
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| As transações têm dono ou são só do workspace? | Guardam `created_by`, mas pertencem ao workspace — qualquer membro vê e pode editar/apagar, exceto se decidido o contrário no futuro |
| Categorias são fixas ou personalizáveis? | Ambas: categorias globais do sistema (`workspace_id IS NULL`) + categorias próprias por workspace |
| Suporta subcategorias? | Sim, via `parent_id` auto-referente em `categories` |
| Multi-moeda? | Campo `currency` em cada transação desde o MVP, mesmo assumindo EUR como único valor usado inicialmente — evita retrofit doloroso |

## 6. Key Entities

```text
categories
  id              uuid PK
  workspace_id    uuid FK -> workspaces, nullable (null = categoria global do sistema)
  name            text
  type            enum('expense','income')
  icon            text
  color           text
  parent_id       uuid FK -> categories, nullable (subcategoria)
  is_system       boolean

transactions
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  created_by      uuid FK -> auth.users
  category_id     uuid FK -> categories
  type            enum('expense','income')
  amount          numeric(12,2)
  currency        text (ISO 4217, default 'EUR')
  description     text, nullable
  occurred_at     date
  source          enum('manual','recurring','csv_import','ai_suggested','revolut_sync')
  recurring_rule_id  uuid FK -> recurring_rules, nullable
  metadata        jsonb, nullable
  created_at      timestamptz
```

## 7. Out of Scope (v1)

- Edição de transações em lote.
- Anexos (recibos/faturas em imagem) — possível extensão futura via Supabase Storage.
- Split de uma transação entre múltiplas categorias.
- `source='recurring'`, `'csv_import'`, `'ai_suggested'`, `'revolut_sync'` são preparados no schema mas implementados pelas suas próprias features ([Recurring Transactions](../recurring-transactions/feature-spec.md), [CSV Import](../csv-import/feature-spec.md), [AI Transaction Categorization](../ai-transaction-categorization/feature-spec.md)).

## 8. Security Considerations

- RLS em `categories` e `transactions`: só membros de `workspace_id` (via `workspace_members`) podem ler/escrever; categorias globais (`workspace_id IS NULL`) são legíveis por todos mas não editáveis por ninguém fora de uma migração administrativa.
- `amount` validado server-side como positivo (o sinal vem de `type`, não de valores negativos livres).
- Nenhuma chave de API está envolvida nesta feature — puramente CRUD sobre Postgres via Supabase client autenticado.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Dashboard do workspace | Botão "Adicionar transação" (sempre visível) |
| Lista de transações | Tabela filtrável por categoria/tipo/período |
| Página de categoria | Lista de transações dessa categoria, total do período |

## 10. Relationship to Existing Features

Depende de [Family Workspaces](../family-workspaces/feature-spec.md). É a base de dados consumida por [Recurring Transactions](../recurring-transactions/feature-spec.md), [CSV Import](../csv-import/feature-spec.md), [AI Transaction Categorization](../ai-transaction-categorization/feature-spec.md), [Savings Vaults](../savings-vaults/feature-spec.md) (via `vault_contributions.transaction_id`) e [Financial Challenges](../financial-challenges/feature-spec.md) (progresso derivado destas linhas).
