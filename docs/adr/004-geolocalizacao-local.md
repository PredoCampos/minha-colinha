# ADR-004 — Geolocalização com resolução territorial local

**Status:** Aceita

## Contexto

A API de geolocalização do navegador retorna coordenadas. Para obter UF/município normalmente se utilizaria um serviço de reverse geocoding, o que enviaria a localização a um terceiro.

## Decisão

A resolução de coordenadas para UF e, quando necessário, município será feita localmente com malhas territoriais públicas derivadas do IBGE.

A geolocalização é apenas sugestão. O usuário confirma ou escolhe manualmente seu domicílio eleitoral.

## Alternativas consideradas

- Google Maps/Geocoding;
- Mapbox;
- Nominatim público;
- geolocalização por IP;
- não oferecer geolocalização.

## Consequências

### Positivas

- coordenadas não precisam sair do dispositivo;
- reduz dependências externas;
- mantém opção de conveniência sem abandonar privacidade.

### Negativas

- exige pipeline de malhas e point-in-polygon no cliente;
- simplificação geográfica precisa ser testada;
- regiões de fronteira podem gerar sugestão incorreta, mitigada pela confirmação manual.
