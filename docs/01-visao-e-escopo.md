# 01 — Visão e escopo

## 1. Visão

A **Colinha** é uma aplicação web single-page cujo propósito é permitir que qualquer eleitor monte, de forma simples e privada, uma colinha para a eleição corrente utilizando dados oficiais de candidaturas e fotografias fornecidos pelo Tribunal Superior Eleitoral.

O projeto existe porque a função de uma colinha é pequena e objetiva: reduzir erros no momento de votar, apresentando ao eleitor, na ordem correta, os candidatos que ele próprio escolheu e seus respectivos números. O projeto não pretende transformar essa tarefa em uma plataforma política, rede social, sistema de recomendação ou cadastro eleitoral paralelo.

A proposta de valor é composta por quatro características inseparáveis:

- **utilidade**: produzir uma imagem clara com as escolhas do próprio usuário;
- **privacidade**: não coletar nem persistir intenção de voto;
- **auditabilidade**: permitir verificar de onde vêm os dados e como são transformados;
- **neutralidade**: não influenciar a escolha por ranking, recomendação ou personalização.

## 2. Problema

O eleitor precisa registrar vários números de candidatos, em uma ordem específica, e pode desejar consultar esses números durante a votação. Existem soluções informais e serviços online para montar colinhas, mas a proposta deste projeto é oferecer uma alternativa cujo código, origem dos dados e tratamento de privacidade possam ser inspecionados publicamente.

## 3. Objetivo geral

Permitir que o usuário selecione candidatos válidos para sua circunscrição eleitoral e gere uma imagem de colinha sem que suas escolhas sejam enviadas ou armazenadas por um servidor de aplicação.

## 4. Objetivos específicos

- determinar automaticamente qual configuração eleitoral corresponde ao ano corrente;
- solicitar somente a informação territorial necessária para a eleição daquele ano;
- usar dados oficiais do TSE como fonte de candidaturas e fotos;
- apresentar busca por nome e número adequada a cargos com muitos candidatos;
- montar os cargos na ordem definida para a eleição;
- gerar a imagem final inteiramente no navegador;
- manter trilha pública da transformação dos dados oficiais para o formato consumido pela aplicação;
- preservar funcionamento básico mesmo quando a fonte oficial estiver temporariamente indisponível, usando o último snapshot validado já publicado.

## 5. Público-alvo

Qualquer eleitor que deseje preparar uma colinha eleitoral digital e guardá-la como imagem em seu próprio dispositivo.

Não é necessário cadastro, perfil, histórico, e-mail, CPF ou qualquer outra identificação pessoal.

## 6. Escopo funcional da primeira versão

A primeira versão deve priorizar as **Eleições Gerais de 2026**.

Para 2026, a Justiça Eleitoral definiu a votação, nesta ordem:

1. Deputado Federal;
2. Deputado Estadual ou Distrital;
3. Senador — primeira vaga;
4. Senador — segunda vaga;
5. Governador;
6. Presidente da República.

A eleição de 2026 exige duas escolhas para o Senado. O Distrito Federal utiliza o cargo de Deputado Distrital no lugar de Deputado Estadual.

A aplicação deve permitir:

- escolher ou confirmar a UF de votação;
- opcionalmente sugerir a UF a partir da geolocalização do dispositivo;
- pesquisar candidato por nome ou número;
- visualizar foto oficial, número, nome de urna, partido e cargo;
- selecionar exatamente a quantidade de candidatos prevista para cada cargo;
- impedir a repetição do mesmo candidato nas duas escolhas para senador;
- visualizar a colinha final;
- gerar e salvar a colinha como imagem.

## 7. Expansão para outras eleições

A interface não deve ser codificada exclusivamente para 2026. O comportamento deve ser dirigido por uma **configuração eleitoral declarativa**.

A configuração informa, entre outros elementos:

- ano;
- tipo de eleição;
- nível territorial exigido;
- cargos;
- quantidade de escolhas por cargo;
- ordem de exibição/votação;
- eventuais exceções territoriais.

Em eleições municipais, a circunscrição necessária será UF + município. Nesses anos, a interface deve pedir município somente porque ele é necessário para identificar os candidatos daquele pleito.

Regras de eleições futuras não devem ser inferidas apenas pelo padrão “a cada dois anos”. A configuração de cada eleição deve ser criada ou confirmada contra a regulamentação oficial vigente daquele pleito.

## 8. Fora de escopo

Não fazem parte do propósito do projeto:

- recomendação de candidatos;
- comparação de propostas;
- propaganda eleitoral;
- exibição de pesquisas eleitorais;
- métricas de popularidade;
- comentários ou conteúdo de usuários;
- compartilhamento interno ou feed social;
- conta, perfil ou login;
- sincronização entre dispositivos;
- persistência de colinhas;
- impressão como funcionalidade dedicada;
- histórico de intenção de voto;
- coleta de telemetria comportamental;
- autenticação eleitoral ou validação de título;
- substituição dos canais oficiais do TSE.

## 9. Princípios invariantes

### 9.1 Privacidade por arquitetura

A aplicação deve ser desenhada de modo que a infraestrutura do projeto não precise conhecer as escolhas do usuário. A promessa de privacidade deve decorrer da arquitetura, e não apenas de uma política escrita.

### 9.2 Fonte oficial

Dados eleitorais exibidos como fatos devem ser derivados de fontes oficiais do TSE. Fotografias também devem ser as fotografias oficiais disponibilizadas pelo TSE para a candidatura.

### 9.3 Neutralidade

A aplicação não deve produzir qualquer ordenação baseada em popularidade, perfil do usuário, histórico de navegação ou preferência presumida. Resultados de busca devem usar critérios objetivos e documentados.

### 9.4 Minimização

A aplicação solicita somente a informação necessária para delimitar a eleição relevante. Em eleição estadual/nacional, não pede município. Em eleição municipal, pede município.

### 9.5 Auditabilidade

Transformações realizadas sobre os dados oficiais devem estar em código aberto, ser determinísticas sempre que possível e produzir metadados suficientes para rastrear versão, data de extração e origem.

### 9.6 Simplicidade

Infraestrutura e dependências devem permanecer pequenas. Novos componentes só são justificados quando resolvem uma necessidade real sem comprometer as garantias centrais.

## 10. Critérios de sucesso

O projeto é considerado bem-sucedido quando um usuário consegue:

1. abrir o site sem cadastro;
2. informar corretamente onde vota com o mínimo de dados necessários;
3. encontrar candidatos oficiais de sua circunscrição;
4. confirmar visualmente cada escolha por nome, número e foto;
5. gerar a colinha como imagem;
6. fechar a página sem que o projeto tenha armazenado suas escolhas.

## 11. Fontes institucionais

Para 2026, o Portal de Dados Abertos do TSE publica o conjunto **Candidatos — 2026**, incluindo dados de candidaturas e fotografias, com frequência de atualização informada como diária e licença Creative Commons Atribuição.

A regulamentação da votação de 2026 está na Resolução TSE nº 23.751/2026. O calendário oficial está na Resolução TSE nº 23.750/2026.
