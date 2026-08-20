# ADR-002 — Não persistir escolhas eleitorais

**Status:** Aceita

## Contexto

A composição da colinha revela intenção de voto e não precisa ser preservada pelo serviço para cumprir sua função.

## Decisão

Escolhas permanecem somente em memória durante a sessão da página. Não são enviadas ao servidor nem gravadas em armazenamento persistente do navegador por padrão.

## Alternativas consideradas

- localStorage;
- conta com sincronização;
- link compartilhável codificando escolhas;
- backend de rascunhos.

## Consequências

### Positivas

- reduz drasticamente risco de privacidade;
- comportamento simples de auditar;
- elimina necessidade de gestão de dados pessoais/intenção de voto.

### Negativas

- recarregar a página perde o progresso;
- não há sincronização entre dispositivos.

Essas limitações são aceitas como coerentes com o propósito do projeto.
