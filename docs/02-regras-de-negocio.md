# 02 — Regras de negócio

## 1. Finalidade

Este documento define como a aplicação deve se comportar independentemente da tecnologia usada na interface. Regras aqui descritas devem, sempre que possível, possuir testes automatizados correspondentes.

## 2. Conceitos

### Eleição

Configuração de um pleito suportado pelo projeto em determinado ano.

### Cargo

Posição eletiva para a qual o usuário pode registrar uma escolha na colinha.

### Candidato

Registro eleitoral derivado da fonte oficial e normalizado para o modelo interno.

### Circunscrição eleitoral

Recorte territorial necessário para determinar quais candidaturas são relevantes. Pode ser nacional, estadual ou municipal.

### Seleção

Escolha local feita pelo usuário para uma posição da colinha. Não é voto e não deve ser transmitida ao servidor.

Uma seleção é representada explicitamente como candidatura, legenda, branco ou nulo. Branco, nulo e legenda não são candidatos sintéticos.

## 3. Determinação da eleição

**RN-001.** Ao iniciar, a aplicação consulta a configuração local das eleições suportadas para o ano civil corrente.

**RN-002.** Se não houver eleição configurada para o ano corrente, a aplicação não deve inventar cargos com base apenas em aritmética de ano.

**RN-003.** Uma eleição futura só passa a ser suportada após sua configuração ter sido conferida contra fonte oficial aplicável.

**RN-004.** A configuração eleitoral é a fonte autoritativa interna para ordem, quantidade de escolhas e escopo territorial da interface.

## 4. Localização eleitoral

**RN-010.** A aplicação deve perguntar implicitamente “onde você vota?”, e não assumir que a posição física atual corresponde ao domicílio eleitoral.

**RN-011.** Se a eleição exigir apenas circunscrição estadual, somente a UF é necessária.

**RN-012.** Se a eleição exigir circunscrição municipal, UF e município são necessários.

**RN-013.** Campos territoriais desnecessários para o pleito não devem ser solicitados.

**RN-014.** Geolocalização é opcional e serve apenas para sugerir a localização eleitoral.

**RN-015.** Resultado derivado da geolocalização deve ser confirmado ou editável pelo usuário antes de determinar os candidatos carregados.

**RN-016.** Se a permissão de geolocalização for negada, indisponível ou falhar, a seleção manual deve continuar plenamente funcional.

**RN-017.** Coordenadas não devem ser enviadas a serviço externo de reverse geocoding. A resolução territorial deve ocorrer localmente no navegador.

## 5. Eleições Gerais de 2026

**RN-020.** A configuração inicial de 2026 utiliza circunscrição estadual para candidaturas estaduais e circunscrição nacional para Presidente.

**RN-021.** A ordem de posições da colinha segue a ordem oficial de votação:

1. Deputado Federal — 1 escolha;
2. Deputado Estadual — 1 escolha; ou Deputado Distrital no DF;
3. Senador — primeira vaga;
4. Senador — segunda vaga;
5. Governador — 1 escolha;
6. Presidente da República — 1 escolha.

**RN-022.** As duas vagas de senador são posições distintas, mas não podem conter o mesmo candidato.

**RN-023.** Para UF = DF, a interface usa Deputado Distrital em vez de Deputado Estadual.

**RN-024.** O candidato a Presidente é nacional; não deve variar segundo a UF escolhida.

**RN-025.** A eleição declara rodadas e datas. Em 2026, o primeiro turno ocorre em 4 de outubro e o eventual segundo turno em 25 de outubro. As disputas do segundo turno só podem ser configuradas depois de conhecidas oficialmente.

**RN-026.** Voto de legenda é permitido somente para Deputado Federal e Deputado Estadual ou Distrital. É proibido para Senador, Governador e Presidente.

**RN-027.** Branco e nulo registram apenas a intenção correspondente; a aplicação não sugere número para produzir voto nulo.

## 6. Candidatos

**RN-030.** Candidatos apresentados devem ter origem nos dados oficiais normalizados e validados.

**RN-031.** A representação mínima de candidato para seleção deve conter:

- identificador oficial estável disponível na fonte;
- eleição;
- cargo;
- número;
- nome de urna;
- partido/federação quando aplicável ao campo exibido;
- fotografia oficial;
- situação relevante da candidatura;
- circunscrição aplicável.

**RN-032.** Foto ausente não deve ser substituída por imagem de origem não oficial. A interface pode apresentar placeholder claramente identificado se o dado oficial estiver ausente.

**RN-033.** Texto proveniente da fonte externa deve ser renderizado como texto, nunca interpretado como HTML.

**RN-034.** A política de inclusão/exclusão por situação da candidatura deve ser explícita no pipeline e versionada. Candidaturas com situação ambígua ou alterada não devem ser silenciosamente tratadas como definitivamente aptas.

**RN-035.** Uma atualização da situação de candidatura deve refletir-se no próximo snapshot validado publicado.

## 7. Busca e apresentação

**RN-040.** O usuário deve poder buscar por nome de urna e número.

**RN-041.** Partido pode ser utilizado como informação auxiliar de busca, mas não como mecanismo de recomendação.

**RN-042.** Resultados sem termo de busca devem usar ordenação objetiva e documentada, preferencialmente numérica ou alfabética.

**RN-043.** A aplicação não deve usar popularidade, cliques, escolhas anteriores ou qualquer dado comportamental para ordenar candidatos.

**RN-044.** A seleção deve exibir foto, número, nome de urna, partido e cargo de forma suficientemente clara para confirmação visual.

**RN-045.** Sem busca ou filtro, a aplicação apresenta os primeiros 20 candidatos em ordem numérica e nominal determinística. “Mostrar mais” acrescenta os próximos 20, sem rolagem infinita.

**RN-046.** O filtro de partido é extraído dos candidatos carregados, ordenado deterministicamente e combinado com a busca textual.

## 8. Estado da colinha

**RN-050.** O estado da colinha existe somente na memória da página por padrão.

**RN-051.** Recarregar ou fechar a página pode apagar as escolhas. Isso é comportamento aceitável e coerente com privacidade.

**RN-052.** LocalStorage, IndexedDB, cookies ou mecanismos equivalentes não devem ser usados para persistir escolhas eleitorais na versão inicial.

**RN-053.** A aplicação pode permitir posições ainda não preenchidas durante a montagem.

**RN-054.** A exportação final deve deixar claro se uma posição permanecer vazia, em vez de inferir uma escolha.

## 9. Geração da imagem

**RN-060.** A imagem é produzida no navegador.

**RN-061.** A imagem final deve preservar a ordem dos cargos definida na eleição.

**RN-062.** Para candidatura, a imagem deve incluir pelo menos:

- cargo;
- foto do candidato;
- número em alto destaque;
- nome de urna;
- partido.

Para legenda, deve incluir número, sigla e a indicação `VOTO DE LEGENDA`. Branco e nulo devem ser identificados somente como `BRANCO` e `NULO`.

**RN-063.** A geração da imagem não deve requerer upload da composição ou das escolhas.

**RN-064.** O layout deve priorizar legibilidade do número, usando a fotografia como confirmação visual.

**RN-065.** Quando o navegador suportar Web Share com arquivos, a mesma imagem pode ser preparada localmente e compartilhada como `File` após uma segunda ação explícita, preservando a ativação exigida pelo navegador. Cancelamento não é erro; sem suporte, o download permanece disponível.

**RN-066.** Compartilhar o projeto transmite apenas a URL pública. Escolhas nunca entram em URL, query string, hash ou clipboard automático.

## 10. Atualização dos dados

**RN-070.** Visitantes não dependem de uma consulta ao TSE em cada acesso.

**RN-071.** Um pipeline periódico importa a fonte oficial, normaliza, valida e publica snapshots estáticos.

**RN-072.** Se o TSE estiver temporariamente indisponível, o último snapshot validado permanece em produção.

**RN-073.** Uma atualização inválida não deve substituir automaticamente um snapshot válido.

**RN-074.** Cada snapshot publicado deve registrar origem, data de geração/extração disponível e versão do pipeline ou commit relevante.

**RN-075.** Como o TSE informa frequência diária para o conjunto Candidatos 2026, o pipeline de 2026 deve ser executado pelo menos diariamente durante o período relevante, salvo indisponibilidade da fonte.

## 11. Neutralidade

**RN-080.** A aplicação não recomenda candidatos.

**RN-081.** Não existem seções “populares”, “em alta”, “mais escolhidos”, “recomendados” ou equivalentes.

**RN-082.** A interface não pode destacar candidato em razão de preferência política do mantenedor.

**RN-083.** Eventuais mensagens institucionais devem ser politicamente neutras e centradas no funcionamento da ferramenta.

## 12. Falhas

**RN-090.** Dados incompletos devem produzir estado de erro identificável, não informação inventada.

**RN-091.** Se os dados necessários para uma circunscrição estiverem indisponíveis, a aplicação deve informar a indisponibilidade e não substituir silenciosamente por dados de outra circunscrição.

**RN-092.** Se uma foto falhar, nome e número continuam visíveis, mas o sistema deve indicar que a foto oficial não pôde ser carregada.

**RN-093.** A seleção manual de UF/município deve continuar disponível quando geolocalização ou resolução geográfica falharem.

## 13. Questões a fechar durante implementação

Estas decisões precisam ser confirmadas após inspeção concreta dos campos do conjunto de dados do TSE:

- qual combinação de campos define “candidatura exibível” em cada situação jurídica;
- qual identificador deve nomear arquivos de foto normalizados;
- como representar federação/coligação quando a exibição exigir distinção;
- como tratar candidaturas substituídas entre snapshots;
- qual mensagem deve aparecer quando uma candidatura escolhida anteriormente deixa de estar apta enquanto a página permanece aberta.
