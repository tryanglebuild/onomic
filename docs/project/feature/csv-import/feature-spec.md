# Feature Spec — CSV Import

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Sem ligação bancária real disponível no MVP, um utilizador que já tem histórico de transações (exportado do seu banco/Revolut em CSV) precisa de uma forma rápida de o trazer para o Onomic, em vez de reintroduzir manualmente meses de histórico. Esta feature permite fazer upload de um ficheiro CSV, mapear as suas colunas para os campos do Onomic, rever um preview, e confirmar a importação em lote.

Constrói sobre [Manual Transactions](../manual-transactions/feature-spec.md) — o resultado da importação são linhas normais em `transactions` com `source='csv_import'`.

## 2. Core Objective

Allow a user to bulk-populate their transaction history from a bank-exported CSV file without a real bank integration.

## 3. Context: How This Area Currently Works

Depende de `transactions` e `categories` já existirem. Não há ainda parsing de ficheiros na aplicação.

## 4. User Flow

```
1. Utilizador exporta um extrato do seu banco em CSV
2. No Onomic: Definições > Importar > escolhe ficheiro
3. Sistema lê o cabeçalho do CSV e apresenta um mapeador de colunas:
   coluna do ficheiro → campo Onomic (data, valor, descrição, [categoria opcional])
4. Utilizador confirma o mapeamento (guardado como preset reutilizável para o mesmo banco)
5. Sistema mostra preview das primeiras N linhas já mapeadas, incluindo
   deteção de possíveis duplicados (mesma data+valor+descrição já existente)
6. Utilizador escolhe: categoria default para linhas sem categoria mapeada,
   e se quer pular os duplicados detetados
7. Confirma → inserção em lote (source='csv_import')
8. Dashboard atualiza com o histórico importado
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| O parsing é feito no cliente ou no servidor? | Server-side (Route Handler) — evita expor lógica de parsing e permite validação consistente |
| Como se evita duplicar transações já existentes? | Deteção heurística (mesma data + valor + descrição semelhante) apresentada no preview; decisão final é do utilizador |
| O mapeamento de colunas é guardado? | Sim, como preset por formato de ficheiro, para reutilização em importações futuras do mesmo banco |

## 6. Key Entities

Não introduz tabelas novas de domínio — reutiliza `transactions` (feature Manual Transactions). Introduz apenas uma tabela de suporte:

```text
import_presets
  id              uuid PK
  workspace_id    uuid FK -> workspaces, cascade delete
  name            text (ex: "Revolut CSV", "Banco X CSV")
  column_mapping  jsonb  (ex: {"date": "Data", "amount": "Montante", "description": "Descrição"})
  created_by      uuid FK -> auth.users
```

## 7. Out of Scope (v1)

- Parsing de formatos além de CSV (ex: OFX, QIF, PDF) — considerar apenas se houver procura real.
- Reconciliação automática de duplicados sem confirmação humana — a decisão final é sempre do utilizador.
- Importação agendada/recorrente de ficheiros (isso é o papel da futura ligação Revolut real).

## 8. Security Considerations

- Ficheiro nunca é armazenado permanentemente após a importação (processado em memória/temporário, descartado depois de confirmado ou abandonado).
- Validação estrita do tamanho/tipo de ficheiro no upload para evitar abuso do endpoint.
- RLS garante que os presets e as transações resultantes ficam confinadas ao `workspace_id` de quem fez o upload.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Definições > Importar | Fluxo completo de upload → mapeamento → preview → confirmação |
| Lista de transações | Filtro por `source='csv_import'` para rever o que foi trazido de import |

## 10. Relationship to Existing Features

Depende de [Manual Transactions](../manual-transactions/feature-spec.md). Não tem dependências de saída além das mesmas que consomem `transactions` em geral ([Savings Vaults](../savings-vaults/feature-spec.md), [Financial Challenges](../financial-challenges/feature-spec.md)). É um precursor conceptual da futura integração Revolut real — o mapeamento de colunas antecipa o mesmo formato de dados normalizado que uma API bancária forneceria.
