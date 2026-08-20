# ADR-001 — SPA estática sem backend de negócio

**Status:** Aceita

## Contexto

A funcionalidade central consiste em consumir dados públicos, manter escolhas temporárias e gerar uma imagem. Nenhuma dessas operações exige um servidor de aplicação.

## Decisão

A Colinha será entregue como SPA estática. O runtime do visitante não dependerá de backend próprio para montar ou exportar a colinha.

## Alternativas consideradas

- backend tradicional com API;
- serverless functions para busca;
- consulta dinâmica ao TSE em cada visita.

## Consequências

### Positivas

- menor superfície de ataque;
- menor custo operacional;
- hospedagem gratuita é plausível;
- privacidade mais verificável;
- operação simples.

### Negativas

- lógica de busca e composição roda no cliente;
- dados precisam ser preparados previamente;
- limitações da hospedagem estática podem afetar headers ou observabilidade.
