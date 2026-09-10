# Feature Spec — Recurring Transactions

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Muitos gastos e receitas de uma pessoa/família são fixos e repetem-se todos os meses (renda, salário, subscrições, seguros). Esta feature permite configurar uma regra uma única vez e deixar o sistema gerar automaticamente a transação correspondente em cada período, sem o utilizador ter de a reintroduzir manualmente.

Constrói sobre [Manual Transactions](../manual-transactions/feature-spec.md) — as transações geradas são linhas normais em `transactions`, apenas com `source='recurring'`.

## 2. Core Objective

Enable a user to define a fixed monthly/weekly/yearly expense or income once and have it appear automatically every period, without manual re-entry.

## 3. Context: How This Area Currently Works

Depende de `transactions` e `categories` já existirem (feature Manual Transactions). Depende também de existir alguma infraestrutura de job agendado (Supabase Edge Function com cron, ou equivalente) — a definir na fase de implementação.

## 4. User Flow

```
1. Utilizador cria uma regra recorrente:
   valor, categoria, descrição, frequência (mensal/semanal/anual), dia de referência
2. Regra fica 'active' com start_date = hoje (ou data escolhida)
3. Job agendado corre periodicamente (ex: diariamente):
   - para cada recurring_rule ativa cujo próximo vencimento caiu hoje,
     gera uma transaction com source='recurring', recurring_rule_id=regra.id
   - job é idempotente: nunca gera 2 transações para o mesmo período/regra
4. Utilizador vê a transação aparecer no dashboard como qualquer outra,
   mas identificável como recorrente (ícone/etiqueta)
5. Utilizador pode pausar (active=false) ou terminar (end_date) uma regra a qualquer momento
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| A transação gerada é editável depois? | Sim, como qualquer transação manual — editar não altera a regra original |
| Como se evita duplicação se o job correr 2x no mesmo dia? | Constraint de unicidade `(recurring_rule_id, period_key)` — o job faz upsert idempotente |
| Regras podem ter fim definido? | Sim, `end_date` opcional; sem fim, a regra repete indefinidamente |

## 6. Key Entities

```text
recurring_rules
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  category_id     uuid FK -> categories
  amount          numeric(12,2)
  currency        text
  description     text
  frequency       enum('monthly','weekly','yearly')
  anchor_date     date  (dia de referência: ex. dia 5 de cada mês)
  start_date      date
  end_date        date, nullable
  active          boolean
  created_by      uuid FK -> auth.users
```

Adicionalmente, `transactions.recurring_rule_id` (já previsto na feature Manual Transactions) liga cada transação gerada à regra que a originou.

## 7. Out of Scope (v1)

- Ajuste automático de valor (ex: renda que sobe com inflação) — regra assume valor fixo até ser editada manualmente.
- Notificação prévia antes do lançamento automático — considerar em fase de Alertas.
- Frequências customizadas (ex: "a cada 2 meses") — apenas mensal/semanal/anual no MVP.

## 8. Security Considerations

- RLS em `recurring_rules` — mesmo padrão de `transactions` (só membros do workspace).
- O job agendado corre com privilégio elevado (Edge Function/service role), mas escreve sempre respeitando `workspace_id` das regras que processa — nunca expõe esse privilégio a um endpoint acessível pelo cliente.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Definições > Gastos fixos | Lista de regras recorrentes, ativa/pausar, editar |
| Ao criar uma transação manual | Opção "Tornar recorrente" que pré-preenche uma nova regra |
| Transação na lista | Ícone indicando origem `recurring` |

## 10. Relationship to Existing Features

Depende de [Manual Transactions](../manual-transactions/feature-spec.md). Alimenta os mesmos consumidores de `transactions` — [Savings Vaults](../savings-vaults/feature-spec.md) e [Financial Challenges](../financial-challenges/feature-spec.md) não distinguem `source`, apenas somam valores.
