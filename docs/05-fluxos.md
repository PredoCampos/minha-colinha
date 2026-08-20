# 05 — Fluxos

## 1. Fluxo principal

```mermaid
flowchart TD
    A[Abrir aplicação] --> B[Ler ano atual]
    B --> C{Existe eleição suportada?}
    C -->|não| D[Informar ausência de eleição configurada]
    C -->|sim| E[Carregar configuração eleitoral]
    E --> F{Qual circunscrição é necessária?}
    F -->|Estado| G[Obter UF]
    F -->|Município| H[Obter UF + município]
    G --> I[Confirmar localização eleitoral]
    H --> I
    I --> J[Carregar candidatos aplicáveis]
    J --> K[Montar colinha]
    K --> L[Pré-visualizar]
    L --> M[Gerar imagem localmente]
    M --> N[Salvar no dispositivo]
```

## 2. Entrada territorial manual

### Eleição estadual/nacional

1. aplicação informa o pleito;
2. usuário escolhe UF;
3. aplicação confirma a UF;
4. carrega cargos estaduais daquela UF e cargos nacionais.

### Eleição municipal

1. aplicação informa o pleito;
2. usuário escolhe UF;
3. lista de municípios é limitada à UF;
4. usuário escolhe município;
5. aplicação confirma UF + município;
6. carrega candidaturas daquela circunscrição.

## 3. Entrada por geolocalização

```mermaid
flowchart TD
    A[Usuário escolhe usar localização] --> B{Permissão concedida?}
    B -->|não| C[Exibir seleção manual]
    B -->|sim| D[Browser retorna coordenadas]
    D --> E[Resolver UF localmente]
    E --> F{Pleito exige município?}
    F -->|não| H[Mostrar UF sugerida]
    F -->|sim| G[Carregar malha municipal da UF e resolver localmente]
    G --> I[Mostrar UF + município sugeridos]
    H --> J{Usuário confirma?}
    I --> J
    J -->|sim| K[Carregar candidatos]
    J -->|não| C
```

A geolocalização nunca deve impedir o caminho manual.

## 4. Busca e seleção de candidato

```mermaid
flowchart LR
    A[Abrir posição da colinha] --> B[Campo nome ou número]
    B --> C[Filtrar lista localmente]
    C --> D[Mostrar resultados objetivos]
    D --> E[Selecionar candidato]
    E --> F[Confirmar foto + número + nome + partido]
    F --> G[Guardar seleção somente em memória]
```

Para listas muito grandes, a UI pode exigir um número mínimo de caracteres antes de exibir muitos resultados, desde que isso não prejudique a busca por número.

## 5. Fluxo específico de 2026

Após confirmação da UF:

1. Deputado Federal;
2. Deputado Estadual ou, no DF, Deputado Distrital;
3. Senador — 1ª vaga;
4. Senador — 2ª vaga;
5. Governador;
6. Presidente.

Os cargos podem ser apresentados em uma única página longa ou em etapas, desde que a ordem seja preservada e a pessoa consiga revisar tudo antes da exportação.

## 6. Regra dos dois senadores

```mermaid
flowchart TD
    A[Selecionar Senador 1] --> B[Selecionar Senador 2]
    B --> C{É o mesmo candidato?}
    C -->|sim| D[Bloquear e pedir outra escolha]
    C -->|não| E[Salvar em memória]
```

## 7. Geração da imagem

1. usuário abre a revisão;
2. aplicação ordena os slots conforme a configuração eleitoral;
3. para cada slot preenchido, compõe cargo, fotografia, número, nome e partido;
4. posições não preenchidas permanecem claramente vazias, se exportação parcial for permitida;
5. composição é renderizada localmente;
6. arquivo é disponibilizado ao usuário;
7. nenhuma requisição com o conteúdo da colinha é feita.

## 8. Alteração da circunscrição

Se o usuário trocar a UF ou município depois de selecionar candidatos:

- escolhas incompatíveis com a nova circunscrição devem ser removidas;
- escolhas nacionais que permaneçam válidas podem ser preservadas somente se isso não introduzir ambiguidade;
- a interface deve avisar claramente antes de descartar escolhas.

Para uma v1 simples, é aceitável limpar toda a colinha ao trocar a circunscrição, desde que o usuário seja avisado antes.

## 9. Erro de dados

### Snapshot indisponível

Mostrar erro e não tentar consultar uma fonte não auditada como fallback.

### Cargo sem arquivo válido

Não apresentar candidatos de outro cargo ou outra UF. Informar indisponibilidade daquele dado.

### Foto não encontrada

Exibir placeholder neutro e informar que a foto oficial não está disponível. Nome e número permanecem utilizáveis.

### Atualização em andamento

O visitante deve continuar vendo o último snapshot integral validado; não deve receber estado parcialmente atualizado.

## 10. Ano sem eleição suportada

```mermaid
flowchart LR
    A[Ano atual] --> B{Configuração existe?}
    B -->|não| C[Não há eleição suportada neste ano]
    C --> D[Opcional: informar próxima eleição configurada]
```

A aplicação não deve simular automaticamente uma eleição futura ainda não confirmada.
