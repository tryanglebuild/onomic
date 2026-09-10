# Feature Spec — Financial Challenges

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Desafios financeiros são objetivos com prazo e métrica definida (ex: "Sem gastos supérfluos por 30 dias", "Poupar 1000€ em 3 meses", "Reduzir Restaurantes em 20%") que motivam o utilizador ou família a mudar comportamento de curto prazo. Esta feature oferece templates prontos para ativação rápida, e permite também criar desafios 100% customizados. O progresso é sempre calculado a partir das transações reais — nunca reportado manualmente.

## 2. Core Objective

Allow a user or family to activate a time-boxed financial goal (spending limit, savings target, category reduction) and see its progress calculated automatically from real transaction data.

## 3. Context: How This Area Currently Works

Depende de `transactions`/`categories` (feature Manual Transactions) para o cálculo de progresso, e opcionalmente de `vaults` (feature Savings Vaults) quando um desafio de poupança está ligado a um cofre.

## 4. User Flow

```
1. Utilizador abre "Desafios" no workspace
2. Escolhe: ativar um template (ex: "Poupar X€ em N meses" — preenche valor
   e prazo) OU criar um desafio custom (nome, métrica, valor alvo, categoria
   se aplicável, datas)
3. Desafio fica status='active'
4. Job periódico recalcula o progresso a partir das transactions do período/
   categoria relevante ao metric_type:
   - spending_limit: soma de gastos no período vs. target_value
   - savings_target: soma de contribuições ao vault ligado (se houver) ou de
     transações de poupança marcadas, vs. target_value
   - category_reduction: gasto da categoria neste período vs. período anterior
   - no_spend_streak: dias consecutivos sem transação de gasto na categoria alvo
5. Dashboard mostra progresso em tempo real (ex: "62% do caminho, 12 dias restantes")
6. Ao expirar o prazo: status muda automaticamente para 'completed' ou 'failed'
   consoante o alvo foi ou não atingido
7. Utilizador pode abandonar um desafio a qualquer momento (status='abandoned')
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| Existem templates prontos? | Sim, catálogo de `challenge_templates` + opção de criar 100% custom |
| O progresso é guardado ou calculado? | Sempre calculado (derivado das `transactions`), nunca guardado manualmente — evita dessincronização |
| Um desafio pode alimentar um cofre? | Sim, `challenges.vault_id` opcional — ex: o desafio "poupar 1000€" contribui automaticamente para o cofre "Fundo de Emergência" |
| Quem pode ativar um desafio num workspace de família? | Qualquer membro (mesmo padrão de permissão usado em transações e cofres) |

## 6. Key Entities

```text
challenge_templates
  id              uuid PK
  key             text (identificador único, ex: 'savings_target_default')
  name            text
  description     text
  metric_type     enum('spending_limit','savings_target','category_reduction','no_spend_streak')
  default_params  jsonb

challenges
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  template_id     uuid FK -> challenge_templates, nullable
  name            text
  metric_type     enum('spending_limit','savings_target','category_reduction','no_spend_streak')
  target_value    numeric(12,2)
  category_id     uuid FK -> categories, nullable
  vault_id        uuid FK -> vaults, nullable
  start_date      date
  end_date        date
  status          enum('active','completed','failed','abandoned')
  created_by      uuid FK -> auth.users
```

## 7. Out of Scope (v1)

- Desafios recorrentes automáticos (ex: relançar "poupar X€" todos os meses) — no MVP cada desafio é ativado manualmente.
- Gamificação (badges, pontos, ranking entre membros da família) — pode ser considerado em fase posterior.
- Notificações proativas de desvio de ritmo (ex: "ao ritmo atual não vais atingir a meta") — depende de uma futura feature de Alertas.

## 8. Security Considerations

- RLS em `challenges` — só membros do `workspace_id` acedem; `challenge_templates` é uma tabela global de leitura pública (sem `workspace_id`), sem dados sensíveis.
- O job de recálculo de progresso corre com privilégio elevado (Edge Function), mas nunca expõe esse privilégio a um endpoint de cliente — apenas lê `transactions` do próprio `workspace_id` do desafio que está a processar.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Dashboard do workspace | Cards de desafios ativos com barra de progresso |
| Página "Desafios" | Catálogo de templates + lista de desafios ativos/concluídos/falhados |
| Página individual do desafio | Progresso detalhado, gráfico de evolução, opção abandonar |

## 10. Relationship to Existing Features

Depende de [Manual Transactions](../manual-transactions/feature-spec.md) para o cálculo de progresso e, opcionalmente, de [Savings Vaults](../savings-vaults/feature-spec.md) via `vault_id`. É o precedente conceptual para os futuros **desafios de investimento** (frente de Investment Tracking, fora desta spec), que reutilizarão o mesmo padrão de templates + progresso derivado, aplicado a métricas de investimento em vez de gastos.
