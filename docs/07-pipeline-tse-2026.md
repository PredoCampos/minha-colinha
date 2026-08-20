# 07 — Pipeline TSE 2026

## 1. Recursos inspecionados

Catálogo oficial: [Candidatos - 2026](https://dadosabertos.tse.jus.br/dataset/candidatos-2026), mantido por TSE/AGEL. O catálogo informa fonte CAND/Candex/DivulgaCand e atualização quatro vezes ao dia.

O pipeline usa exclusivamente estes recursos oficiais:

- `consulta_cand_2026.zip` — candidaturas de todas as UFs;
- `consulta_cand_complementar_2026.zip` — situações detalhadas de julgamento;
- `foto_cand2026_BR_div.zip` — fotos de Presidente;
- `foto_cand2026_{UF}_div.zip` — um pacote de fotos para cada UF, inclusive DF.

Em 20/08/2026, o CDN oficial devolveu HTTP 403 para `curl` e para uma sessão Edge real neste ambiente, mas aceitou o cliente Node identificado do pipeline. A execução final baixou e interpretou diretamente os pacotes oficiais gerados em 19/08/2026 às 19:31:08 BRT. Os hashes SHA-256 e cabeçalhos `Last-Modified` dessa execução estão em `public/data/2026/metadata.json`. Se o CDN falhar, nada é publicado.

## 2. Contrato externo concretamente observado

Os ZIPs de dados contêm agregados `consulta_cand_2026_BRASIL.csv` e `consulta_cand_complementar_2026_BRASIL.csv`, além das divisões territoriais. Os CSVs usam:

- encoding ISO-8859-1;
- delimitador `;`;
- campos textuais entre aspas duplas;
- CRLF;
- campos numéricos que podem aparecer sem aspas.

Campos lidos do arquivo principal:

| Campo TSE | Uso interno |
| --- | --- |
| `DT_GERACAO` + `HH_GERACAO` | `sourceGeneratedAt`, interpretado em horário de Brasília |
| `ANO_ELEICAO` | validação contra a configuração declarativa de 2026 |
| `TP_ABRANGENCIA` | validação de `FEDERAL` para Presidente e `ESTADUAL` para os demais |
| `SG_UF` + `SG_UE` | circunscrição e partição `BR`/UF |
| `CD_CARGO` + `DS_CARGO` | mapeamento explícito de cargo |
| `SQ_CANDIDATO` | identificador estável da candidatura e chave de associação da foto |
| `NR_CANDIDATO` | número eleitoral, preservado como string |
| `NM_URNA_CANDIDATO` | nome de urna |
| `SG_PARTIDO` | sigla partidária |
| `CD_SITUACAO_CANDIDATURA` + `DS_SITUACAO_CANDIDATURA` | situação geral observada (`-3 / #NE`) e detector de mudança de schema |

Campos lidos do arquivo complementar:

| Campo TSE | Uso interno |
| --- | --- |
| `SQ_CANDIDATO` | join um-para-um com o arquivo principal |
| `CD_SITUACAO_JULGAMENTO` + `DS_SITUACAO_JULGAMENTO` | status interno relevante ao produto |

CPF, e-mail, título eleitoral, data de nascimento e demais campos pessoais do CSV bruto nunca entram no modelo interno nem nos snapshots.

## 3. Cargos

| Código | Descrição TSE | Cargo interno | Tratamento |
| ---: | --- | --- | --- |
| 1 | PRESIDENTE | `PRESIDENT` | publicado em `BR` |
| 2 | VICE-PRESIDENTE | — | ignorado, componente de chapa |
| 3 | GOVERNADOR | `GOVERNOR` | publicado por UF |
| 4 | VICE-GOVERNADOR | — | ignorado, componente de chapa |
| 5 | SENADOR | `SENATOR` | publicado por UF; os dois slots continuam no domínio eleitoral |
| 6 | DEPUTADO FEDERAL | `FEDERAL_DEPUTY` | publicado por UF |
| 7 | DEPUTADO ESTADUAL | `STATE_DEPUTY` | publicado nas 26 UFs exceto DF |
| 8 | DEPUTADO DISTRITAL | `DISTRICT_DEPUTY` | publicado somente no DF |
| 9 | 1º SUPLENTE | — | ignorado, componente da candidatura ao Senado |
| 10 | 2º SUPLENTE | — | ignorado, componente da candidatura ao Senado |

Código e descrição precisam coincidir. Valor novo ou divergente aborta o pipeline.

## 4. Situações

Na extração 2026 inspecionada, o arquivo principal apresentava `-3 / #NE` para todas as 20.638 linhas; `#NE` não é um status eleitoral interno. O `leiame.pdf` descreve os campos, mas não fornece um catálogo adicional de códigos. A informação útil concretamente presente em 2026 está no arquivo complementar:

| Código | Descrição TSE | Status interno |
| ---: | --- | --- |
| 2 | DEFERIDO | `DISPLAYABLE` |
| 16 | DEFERIDO EM PRAZO RECURSAL OU COM RECURSO | `DISPLAYABLE` |
| 8 | AGUARDANDO JULGAMENTO | `PENDING_OR_AMBIGUOUS` |
| 4 | INDEFERIDO EM PRAZO RECURSAL OU COM RECURSO | `PENDING_OR_AMBIGUOUS` |
| 6 | RENÚNCIA | `NOT_DISPLAYABLE` |
| 13 | PEDIDO NÃO CONHECIDO | `NOT_DISPLAYABLE` |
| 14 | INDEFERIDO | `NOT_DISPLAYABLE` |

Decisão de produto: deferimento com recurso permanece exibível; indeferimento com recurso é mantido como ambíguo; renúncia, indeferimento sem indicação de recurso e pedido não conhecido não são exibíveis. Os registros continuam no snapshot com seu status — o adaptador não apaga a informação. Código novo, inclusive um valor conhecido apenas por eleições anteriores, ou descrição divergente interrompe a atualização para revisão humana.

A decisão e suas consequências estão registradas no [ADR-008](adr/008-ciclo-de-vida-candidatura.md).

## 5. Fotografias

Os pacotes são ZIPs de JPEG. O pacote nacional `BR` atende Presidente; cada UF possui pacote próprio. O nome concreto é:

```text
F{UF_OU_BR}{SQ_CANDIDATO}_div.jpg
```

Exemplo de forma: `FDF70002531326_div.jpg`.

O pipeline associa pela combinação da partição com `SQ_CANDIDATO`, valida a assinatura JPEG e publica o mesmo conteúdo como `<SQ_CANDIDATO>.jpg`. Uma foto individual ausente produz `photoPath: null`. Pacote ausente, ZIP inválido, nome duplicado, UF divergente ou JPEG inválido aborta toda a atualização.

## 6. Execução e atomicidade

```bash
npm run data:tse
```

Também é possível usar ZIPs oficiais previamente baixados:

```bash
npm run data:tse -- --input-dir caminho/para/zips-oficiais
```

O ambiente precisa de `tar.exe` no Windows ou `unzip` em Unix. Todos os downloads e extrações ficam em diretório temporário. O pipeline:

1. baixa e calcula SHA-256 de todos os recursos;
2. interpreta os dois CSVs e os 28 pacotes de fotos;
3. normaliza e valida todas as candidaturas;
4. exige as 109 combinações cargo/partição esperadas em 2026;
5. grava e relê um staging ao lado do destino;
6. substitui `public/data/2026` por rename, restaurando o backup se a troca falhar.

`metadata.json` registra origem, geração TSE, importação, versão do pipeline, URLs, hashes, tamanhos, `Last-Modified` quando disponível e contagens de status/fotos.

`public/data/2026/` é um artefato gerado e ignorado pelo Git. O workflow `deploy-pages.yml` roda em pushes para `main`, diariamente às 05:23 BRT e por `workflow_dispatch`. Ele gera e valida o snapshot, executa os checks e o build, confirma que os 109 arquivos de candidatos, os metadados e as fotografias chegaram a `dist` e somente então publica o artefato do Pages. Não há commit automático, branch de atualização nem PR contendo dados ou fotografias. Falhas interrompem o job antes do upload/deploy, preservando a última publicação válida.
