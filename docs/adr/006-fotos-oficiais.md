# ADR-006 — Fotografias oficiais como dado essencial

**Status:** Aceita

## Contexto

A fotografia ajuda o usuário a confirmar visualmente que selecionou a candidatura pretendida. O TSE disponibiliza fotografias oficiais no conjunto de candidatos.

## Decisão

A foto oficial é parte essencial da apresentação da candidatura e da imagem final. Ela será importada da fonte oficial, associada por identificador estável e servida como artefato estático do projeto.

O número continua sendo o elemento visual de maior destaque na colinha.

## Alternativas consideradas

- não mostrar fotos;
- carregar fotos diretamente do TSE em runtime;
- buscar fotos em páginas de campanha ou redes sociais.

## Consequências

### Positivas

- melhora confirmação visual;
- mantém origem uniforme e auditável;
- elimina dependência de servidores de campanha.

### Negativas

- aumenta armazenamento e tráfego;
- exige estratégia de lazy loading/cache;
- requests de imagens podem gerar sinais em logs técnicos, razão pela qual a arquitetura deve evitar que “request de foto” equivalha diretamente a “seleção confirmada”.
