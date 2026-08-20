# ADR-003 — Espelhar e normalizar dados do TSE

**Status:** Aceita

## Contexto

O TSE publica dados abertos de candidaturas e fotografias. Consultar a fonte oficial diretamente em cada visita acoplaria disponibilidade, formato e CORS da fonte ao funcionamento da aplicação.

## Decisão

Um pipeline periódico importará a fonte oficial, validará, normalizará e publicará snapshots estáticos consumidos pela SPA.

Para 2026, o conjunto “Candidatos — 2026” informa frequência de atualização diária; o pipeline acompanhará essa frequência durante o período relevante.

## Alternativas consideradas

- browser consultar TSE em toda visita;
- backend próprio consultar TSE sob demanda;
- base manual mantida pelo projeto.

## Consequências

### Positivas

- site continua funcionando com o último snapshot se a fonte estiver indisponível;
- modelo interno fica estável;
- transformações são auditáveis em Git;
- possibilidade de validação antes da publicação.

### Negativas

- existe atraso entre atualização oficial e próximo snapshot;
- pipeline passa a ser componente crítico de manutenção;
- é necessário monitorar mudanças de schema da fonte.
