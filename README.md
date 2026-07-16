# Pecuária em Dia

Primeira versão do aplicativo web para controle compartilhado de uma operação pecuária.

## O que já funciona

- Painel com compras, vendas, gastos, resultado operacional e próximo pagamento do capital de giro.
- Cronograma dos 24 meses do capital de giro de R$ 500 mil, incluindo a carência e a diluição dos juros.
- Inclusão e exclusão de gastos, compras e vendas de gado.
- Uso adaptado para celular e computador.
- Dados salvos no navegador enquanto o banco online não é conectado.

## Abrir localmente

Abra `index.html` em um navegador. Para desenvolvimento, qualquer servidor de arquivos estáticos serve a pasta `pecuaria-web`.

## Para compartilhar em tempo real

A versão atual foi desenhada como interface. O próximo passo é conectá-la a um banco em nuvem com autenticação — por exemplo, Supabase — e publicar em um endereço web. Isso permitirá que você e seu irmão tenham usuários próprios, vejam os mesmos dados e recebam as atualizações no momento em que um lançamento for salvo.

## Publicar no Cloudflare Pages

O projeto está configurado para deploy como site estático:

- **Framework preset:** None
- **Build command:** deixe em branco
- **Build output directory:** `.`
- **Root directory:** `pecuaria-web` (caso conecte o repositório pela pasta-pai)

O arquivo `wrangler.toml` já registra essa configuração. Após conectar o repositório ao Cloudflare Pages, cada envio para a branch `main` gera uma nova publicação automaticamente.
