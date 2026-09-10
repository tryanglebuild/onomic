# Feature Spec — Savings Vaults

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Inspirados nos "Vaults" da Revolut e nas "Caixinhas" do Nubank, os cofres permitem que um utilizador (ou família) defina metas de poupança visuais e acompanhe o progresso ao longo do tempo — sem precisar de uma ligação bancária real, através de **alocação virtual**: o dinheiro não sai fisicamente da conta, o cofre é apenas uma etiqueta de valor sobre o que já existe.

Em workspaces de família, o cofre tem uma meta agregada, mas cada membro pode contribuir individualmente, e o progresso mostra o breakdown por pessoa.

## 2. Core Objective

Allow a user or family to set a savings goal and track contributions toward it, without moving real money.

## 3. Context: How This Area Currently Works

Depende de `workspaces` e `workspace_members` (feature Family Workspaces). Pode opcionalmente ligar-se a `transactions` (feature Manual Transactions) quando uma contribuição corresponde a uma transação real registada, mas não depende disso para funcionar (permite ajustes manuais de alocação).

## 4. User Flow

```
1. Utilizador cria um cofre: nome, ícone, cor, meta (opcional), prazo (opcional)
2. Cofre aparece no workspace com progresso 0
3. Utilizador (ou qualquer membro, se for workspace de família) regista uma
   contribuição: valor, data, nota opcional, transação associada (opcional)
4. Saldo do cofre = soma de todas as vault_contributions
5. Progresso = saldo / meta (se meta definida); sem meta, o cofre só acumula
6. Em família: página do cofre mostra breakdown "quem contribuiu quanto"
7. Utilizador pode registar uma contribuição negativa para representar
   "levantamento" da alocação virtual (o cofre não guarda dinheiro real)
8. Ao atingir a meta, cofre passa a status='completed'
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| O dinheiro do cofre é movido fisicamente? | Não — alocação virtual; sem ligação bancária real, o cofre é só uma etiqueta sobre o saldo existente |
| Cofres podem não ter meta? | Sim — meta e prazo são opcionais, permitindo um cofre "aberto" (ex: fundo de emergência sem alvo fixo) |
| Como funciona uma meta partilhada em família? | Meta agregada ao nível do cofre + contribuições individuais com breakdown por `user_id` |
| Contribuições podem ser negativas? | Sim, para representar remoção da alocação virtual sem apagar histórico |

## 6. Key Entities

```text
vaults
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  name            text
  icon            text
  color           text
  target_amount   numeric(12,2), nullable
  target_date     date, nullable
  status          enum('active','completed','archived')
  created_by      uuid FK -> auth.users
  created_at      timestamptz

vault_contributions
  id              uuid PK
  vault_id        uuid FK -> vaults, cascade delete
  user_id         uuid FK -> auth.users
  amount          numeric(12,2)  (pode ser negativo)
  occurred_at     date
  note            text, nullable
  transaction_id  uuid FK -> transactions, nullable
  created_at      timestamptz
```

Saldo e progresso são sempre **derivados** por query (`SUM(vault_contributions.amount)`), nunca guardados como campo persistido — evita dessincronização.

## 7. Out of Scope (v1)

- Juros/rendimento sobre o saldo do cofre (é alocação virtual, não uma conta real).
- Transferência entre cofres num único passo (fazer via duas contribuições: negativa num, positiva noutro).
- Cofres partilhados entre workspaces diferentes — um cofre pertence sempre a exatamente um workspace.

## 8. Security Considerations

- RLS em `vaults` e `vault_contributions` — só membros do `workspace_id` do cofre podem ler/escrever.
- `vault_contributions.user_id` sempre o utilizador autenticado que regista a contribuição — não pode ser definido em nome de outro membro.
- Nenhuma chave de API envolvida — feature puramente de dados internos.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Dashboard do workspace | Cards de cofres ativos com progresso visual (barra) |
| Página individual do cofre | Histórico de contribuições, breakdown por membro (família), botão contribuir |
| Onboarding | Sugestão de criar o primeiro cofre |

## 10. Relationship to Existing Features

Depende de [Family Workspaces](../family-workspaces/feature-spec.md); opcionalmente liga-se a [Manual Transactions](../manual-transactions/feature-spec.md) via `vault_contributions.transaction_id`. É consumido por [Financial Challenges](../financial-challenges/feature-spec.md) quando um desafio está configurado para alimentar um cofre (`challenges.vault_id`).
