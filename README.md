# Colinha

> Nome provisório do projeto.

Aplicação web single-page, aberta e auditável, para montar uma colinha eleitoral a partir de dados oficiais da Justiça Eleitoral e exportá-la como imagem. A aplicação não exige conta, não persiste as escolhas do usuário e não envia a colinha para um servidor de aplicação.

## Princípios do projeto

1. **Privacidade por arquitetura** — a composição da colinha e as escolhas dos candidatos não são enviadas como dados de aplicação nem persistidas pelo projeto. Coordenadas permanecem no dispositivo. A circunscrição pode ser tecnicamente inferível pela hospedagem quando o navegador solicita arquivos públicos separados por UF/município; essa limitação deve ser documentada, não escondida.
2. **Fonte oficial** — candidatos, números, partidos, situação eleitoral e fotografias são derivados de dados oficiais do TSE.
3. **Neutralidade** — o sistema não recomenda, ranqueia, favorece ou personaliza candidatos.
4. **Auditabilidade** — código, configuração eleitoral, pipeline de transformação e origem dos dados são públicos e verificáveis.
5. **Minimização** — a aplicação pede apenas a localização eleitoral necessária para a eleição corrente.
6. **Simplicidade** — SPA estática, dependências mínimas, sem conta, banco de dados, analytics ou backend de negócio.
7. **Falha segura** — dados inconsistentes, incompletos ou não validados não devem ser apresentados silenciosamente como corretos.

## O que a aplicação faz

Em um ano eleitoral suportado, a aplicação:

1. identifica a configuração eleitoral correspondente ao ano;
2. determina se precisa de UF ou de UF + município;
3. permite preencher essa informação manualmente ou sugeri-la por geolocalização, sempre com confirmação do usuário;
4. carrega somente os candidatos pertinentes à circunscrição e aos cargos da eleição;
5. permite localizar candidatos por nome ou número, mostrando foto oficial, número, nome de urna e partido;
6. monta a colinha na ordem oficial de votação;
7. gera uma imagem no próprio navegador para o usuário salvar.

Em anos sem eleição suportada, a aplicação apenas informa que não há pleito configurado e pode indicar a próxima eleição prevista na configuração do projeto.

## O que a aplicação não faz

- não recomenda candidato;
- não mostra popularidade, tendências ou “mais escolhidos”;
- não registra intenção de voto;
- não possui conta ou login;
- não salva colinhas no servidor;
- não utiliza analytics, pixels ou trackers de terceiros;
- não exige impressão;
- não consulta coordenadas em serviço externo de geocodificação;
- não trata a localização física como domicílio eleitoral sem confirmação do usuário.

## Documentação

- [01 — Visão e escopo](docs/01-visao-e-escopo.md)
- [02 — Regras de negócio](docs/02-regras-de-negocio.md)
- [03 — Arquitetura](docs/03-arquitetura.md)
- [04 — Modelo de dados](docs/04-modelo-de-dados.md)
- [05 — Fluxos](docs/05-fluxos.md)
- [06 — Privacidade e segurança](docs/06-privacidade-e-seguranca.md)
- [07 — Pipeline TSE 2026](docs/07-pipeline-tse-2026.md)
- [ADRs — decisões arquiteturais](docs/adr/README.md)

## Pipeline de dados oficiais

O adaptador 2026 baixa os recursos oficiais, interpreta CSV ISO-8859-1, associa as fotos por `SQ_CANDIDATO`, normaliza para o contrato interno e só então troca o snapshot publicado:

```bash
npm run data:tse
```

Para ZIPs oficiais já baixados, use `npm run data:tse -- --input-dir <diretório>`.

`public/data/2026/` é um artefato gerado e ignorado pelo Git. No GitHub Pages, o workflow baixa e valida os dados oficiais, executa o build com o snapshot completo e publica o diretório `dist` somente quando todas as etapas terminam com sucesso. A atualização ocorre em pushes para `main`, uma vez por dia e sob execução manual, sem commit automático ou PR de dados e fotografias.

A SPA usa esse snapshot oficial como fonte padrão em runtime: lê os metadados de procedência, baixa somente os cinco arquivos de candidatos necessários para a UF escolhida (quatro estaduais e Presidente em `BR`) e carrega fotos locais sob demanda. As fixtures em `public/data/development-fixtures/` exigem ativação explícita em código de desenvolvimento ou teste e são removidas do build de produção.

## Geolocalização opcional

A escolha manual de UF é o fluxo principal. Após ação explícita, a aplicação pode solicitar a Geolocation API e comparar as coordenadas localmente com uma malha estadual mínima derivada do IBGE. Apenas a UF sugerida permanece no estado da interface; ela precisa ser confirmada antes do carregamento de candidatos. Nenhuma coordenada é enviada a serviço de mapas, geocodificação ou IP.

O artefato `public/geography/ibge-uf-minimum.json` é versionado, registra URL, obtenção e SHA-256 da resposta oficial e pode ser reproduzido com `npm run data:geography`.

## Referências oficiais principais

- TSE — Candidatos 2026: https://dadosabertos.tse.jus.br/dataset/candidatos-2026
- TSE — Resolução nº 23.751/2026: https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-751-de-26-de-fevereiro-de-2026
- TSE — Calendário Eleitoral 2026: https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-750-de-26-de-fevereiro-de-2026
- IBGE — Malhas Territoriais: https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html

## Estado da documentação

Este conjunto descreve a arquitetura e as regras pretendidas antes da implementação. Decisões técnicas que mudem garantias de privacidade, fonte de dados, persistência, neutralidade ou modelo de distribuição devem ser registradas em ADR.
