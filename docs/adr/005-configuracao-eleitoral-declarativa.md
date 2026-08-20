# ADR-005 — Configuração eleitoral declarativa

**Status:** Aceita

## Contexto

Eleições brasileiras seguem ciclos regulares, mas cargos, quantidades e regras podem mudar. Inferir a eleição exclusivamente por `ano % 4` transformaria convenção histórica em regra de software.

## Decisão

Cada eleição suportada terá configuração versionada que declara rodadas, datas, cargos, ordem, quantidade e tipos permitidos de escolha, escopo territorial e exceções.

Uma rodada futura pode ter data conhecida e disputas ainda não configuradas. Em 2026, isso representa o eventual segundo turno sem inferir automaticamente quais cargos continuarão.

O ano atual apenas seleciona uma configuração existente; ele não inventa uma eleição.

## Alternativas consideradas

- hardcode da interface de 2026;
- regras aritméticas baseadas no ano;
- configuração baixada dinamicamente de serviço próprio.

## Consequências

### Positivas

- regras ficam auditáveis;
- eleições futuras podem ser adicionadas sem reescrever a UI;
- exceções como Deputado Distrital no DF ficam explícitas.

### Negativas

- cada novo pleito precisa ser revisado e configurado;
- erros na configuração podem afetar a interface, exigindo testes contra fonte oficial.
