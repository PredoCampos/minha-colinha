# Limites estaduais

`ibge-uf-minimum.json` é um artefato estático derivado do serviço oficial de
[Malhas Geográficas do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3).

A geração usa o recorte nacional por UF em GeoJSON, na qualidade mínima oferecida
pelo IBGE. O próprio arquivo registra a URL concreta, o instante de obtenção e o
SHA-256 da resposta original.

O endpoint não informa um identificador de revisão territorial no corpo da
resposta. Por isso, esta captura é identificada pelo instante de obtenção e pelo
hash integral da fonte, sem atribuir artificialmente um ano à geometria.

Para atualizá-lo:

```bash
npm run data:geography
```

A aplicação baixa o arquivo da própria origem somente após a pessoa escolher
usar geolocalização. Coordenadas não são adicionadas ao request nem persistidas.
