# ADR-007 — Snapshot oficial gerado no deploy

## Status

Aceito.

## Contexto

O snapshot oficial de 2026 inclui milhares de fotografias e arquivos derivados. Versioná-lo aumentaria substancialmente o repositório e faria atualizações automatizadas produzirem branches e pull requests muito grandes, embora o conteúdo possa ser reconstruído de forma determinística a partir das fontes oficiais.

## Decisão

`public/data/2026/` é um artefato gerado e ignorado pelo Git. O workflow do GitHub Pages obtém os recursos oficiais, normaliza e valida integralmente o snapshot, executa os checks e o build, verifica sua presença no diretório `dist` e publica somente após o sucesso de todas essas etapas.

O mesmo workflow roda em pushes para `main`, uma vez por dia e por acionamento manual. Ele tem apenas permissões de leitura do repositório e de publicação no Pages: não cria commits, branches ou pull requests com dados do TSE.

## Alternativas consideradas

- versionar todo o snapshot, incluindo fotografias;
- manter uma branch automatizada e abrir um PR a cada atualização;
- publicar dados e aplicação em jobs independentes.

## Consequências

- o repositório contém o pipeline auditável, não os dados derivados volumosos;
- cada publicação é construída com um snapshot oficial recém-validado;
- falhas de download, parsing, fotos, validação ou build impedem upload e deploy, preservando a última publicação válida;
- reproduzir um snapshot histórico depende dos metadados e da disponibilidade dos recursos oficiais correspondentes;
- desenvolvimento local exige executar o pipeline ou usar as fixtures explicitamente separadas.
