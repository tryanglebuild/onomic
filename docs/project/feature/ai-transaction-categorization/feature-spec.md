# Feature Spec — AI Transaction Categorization

**Status:** Approved
**Created:** 2026-09-06
**Last updated:** 2026-09-06
**Author:** Leandro Oliveira

---

## 1. Overview

Quando um utilizador regista uma transação apenas com uma descrição livre (ex: "Continente 34,50€"), esta feature usa um LLM via OpenRouter para sugerir automaticamente a categoria mais provável, com base nas categorias já existentes no workspace. Reduz a fricção de categorização manual, mantendo o utilizador sempre no controlo — a IA sugere, nunca decide sozinha.

É a primeira aplicação concreta da camada de IA do Onomic (`lib/ai/AIService`), e estabelece o padrão que a futura AI Advisor Layer vai seguir: dados estruturados entram, uma sugestão estruturada sai, o utilizador confirma.

## 2. Core Objective

Suggest the correct category for a freely-described transaction, without ever saving it without user confirmation.

## 3. Context: How This Area Currently Works

Depende de `transactions` e `categories` (feature Manual Transactions) já existirem. Não existe ainda nenhuma integração de IA na aplicação — este é o primeiro uso de OpenRouter no produto.

## 4. User Flow

```
1. Utilizador começa a criar uma transação manual, preenche só a descrição
   e o valor (categoria em branco)
2. App chama /api/ai/categorize com: descrição, valor, lista de categorias
   do workspace (nome + tipo)
3. AIService (OpenRouter) devolve a categoria sugerida + nível de confiança
4. UI pré-seleciona a categoria sugerida no formulário, com indicação visual
   de que é uma sugestão (não uma decisão automática)
5. Utilizador aceita (submete normalmente) ou troca manualmente por outra categoria
6. Transação é gravada com a categoria final escolhida pelo utilizador —
   nunca com source alterado por causa da sugestão (fica 'manual';
   metadata pode guardar que houve sugestão de IA, para analytics futuro)
```

## 5. Confirmed Design Decisions

| Question | Decision |
|---|---|
| A IA pode gravar a transação sem confirmação? | Não, nunca — apenas pré-preenche o campo categoria |
| A IA pode inventar uma categoria nova? | Não — só escolhe entre as categorias já existentes no workspace (globais + próprias) fornecidas no prompt |
| Quando é chamada a IA? | Só quando a descrição é preenchida e a categoria está vazia — nunca em bulk/automático sobre transações já existentes, para controlar custo |
| Qual o modelo usado? | A definir na fase de implementação via OpenRouter — recomenda-se um modelo económico/rápido, já que é uma tarefa de classificação simples, não geração de texto longo |

## 6. Key Entities

Não introduz tabelas novas. Introduz um módulo de código:

```text
lib/ai/AIService
  categorizeTransaction(description, amount, categories[]) → { categoryId, confidence }
```

E um endpoint:

```text
POST /api/ai/categorize
  body: { workspaceId, description, amount, type }
  response: { suggestedCategoryId, confidence }
```

`transactions.metadata` (jsonb, já previsto) pode guardar `{ ai_suggested_category_id, ai_confidence }` quando aplicável, para permitir medir a precisão da sugestão ao longo do tempo.

## 7. Out of Scope (v1)

- Categorização em lote de transações já existentes (ex: "categorizar automaticamente as últimas 100 transações sem categoria").
- Aprendizagem contínua/fine-tuning a partir das correções do utilizador — no MVP a IA usa sempre o mesmo prompt com a lista de categorias, sem histórico de correções.
- Categorização automática de linhas vindas de CSV Import — fica fora do fluxo síncrono de UI; poderá ser adicionada depois como opção em lote.

## 8. Security Considerations

- Chave da API OpenRouter apenas em variável de ambiente server-side; nunca exposta ao cliente.
- O endpoint `/api/ai/categorize` valida que o utilizador autenticado é membro do `workspaceId` recebido antes de expor a lista de categorias desse workspace ao prompt.
- Prompt inclui apenas descrição/valor/tipo — nenhum outro dado financeiro sensível do utilizador é enviado à IA nesta feature.
- Rate limiting no endpoint para controlar custo de chamadas à LLM.

## 9. UI Entry Points

| Location | What appears |
|---|---|
| Formulário "Adicionar transação" | Categoria pré-preenchida com sugestão da IA, editável, com indicador visual de "sugestão" |

## 10. Relationship to Existing Features

Depende de [Manual Transactions](../manual-transactions/feature-spec.md). É o precedente arquitetural para a futura **AI Financial Advisor Layer** (fora desta spec) — o mesmo módulo `lib/ai/AIService` e o mesmo princípio (dados estruturados → IA → sugestão confirmável) serão reutilizados e estendidos nessa frente futura.
