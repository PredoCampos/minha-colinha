# ADR-008 — Ciclo de vida e exibição de candidaturas

## Status

Aceito.

## Contexto

O dataset de candidatos possui uma situação geral de candidatura e, em arquivo complementar, uma situação de julgamento. No pacote oficial 2026 inspecionado, o primeiro campo aparece como `-3 / #NE` em todos os registros e os estados efetivos estão no arquivo complementar. Estados de recurso e pendência podem mudar durante o calendário eleitoral.

Uma classificação baseada apenas nos textos observados em um único snapshot deixaria a atualização vulnerável a transições já previstas pelo próprio domínio do TSE.

## Decisão

O adaptador mantém tabelas explícitas de código e descrição para os dois campos. Elas reconhecem somente valores concretamente encontrados no pacote oficial de Candidatos 2026: `-3 / #NE` no campo geral e `2`, `4`, `6`, `8`, `13`, `14` e `16` no julgamento.

`#NE` não é convertido em status do produto. O julgamento complementar fornece o estado de 2026. Códigos conhecidos apenas por eleições anteriores não são antecipados neste adaptador.

Qualquer código novo ou divergência entre código e descrição aborta a normalização. A publicação continua atômica e exige revisão humana do mapeamento antes de aceitar um novo estado.

## Alternativas consideradas

- usar somente descrições textuais;
- tratar qualquer situação desconhecida como pendente;
- usar apenas o campo geral em todos os anos;
- remover do snapshot registros que não podem ser exibidos.

## Consequências

- mudanças do domínio oficial não chegam silenciosamente à interface;
- transições 2026 de deferimento, recurso, espera de julgamento, renúncia, pedido não conhecido e indeferimento possuem testes explícitos;
- registros não exibíveis permanecem auditáveis no snapshot, mas a camada de candidatos impede sua seleção;
- novos códigos exigem inspeção oficial e alteração revisada do adaptador.
