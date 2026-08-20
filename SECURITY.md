# Política de segurança

## Relato responsável

Se você encontrar uma vulnerabilidade na Minha Colinha, prefira **GitHub Security → Report a vulnerability** no repositório. Esse canal mantém o relato privado enquanto o problema é avaliado.

Se o relato privado do GitHub não estiver disponível, abra uma issue pública apenas para solicitar um canal privado de contato. Não publique detalhes de exploração, coordenadas, uma colinha real, intenção de voto nem capturas com informações sensíveis.

Inclua, quando possível:

- componente e versão afetados;
- impacto observado;
- passos mínimos de reprodução com dados fictícios;
- sugestão de correção, se houver.

## Escopo

São especialmente relevantes falhas que possam:

- transmitir ou persistir escolhas eleitorais ou coordenadas;
- alterar silenciosamente candidatos, números, fotos ou situações;
- contornar a validação e a publicação atômica do snapshot;
- executar conteúdo não confiável no navegador;
- comprometer a geração local da imagem ou o workflow de publicação.

Problemas nos serviços e dados de origem do TSE ou do IBGE devem ser relatados aos respectivos mantenedores, mas uma falha da Minha Colinha ao validar ou tratar esses dados continua dentro deste escopo.

## Expectativa

Pedimos tempo razoável para investigar e corrigir antes da divulgação pública. O projeto não define prazo de resposta ou recompensa, mas procurará confirmar o recebimento e manter o relator informado. Testes devem usar fixtures fictícias e evitar qualquer tentativa de identificar escolhas de pessoas reais.
