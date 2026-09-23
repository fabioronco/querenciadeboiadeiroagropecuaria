import { onRequest as api } from './functions/api/[[path]].js';

// O pacote de assets ligado ao Worker ficou preso em uma versão antiga. Enquanto
// ele é refeito no painel, estes dois arquivos da interface são entregues da
// fonte principal do projeto, sem cache, para todos receberem a mesma versão.
const currentAssets = {
  '/app.js': 'https://raw.githubusercontent.com/fabioronco/querenciadeboiadeiroagropecuaria/main/app.js',
  '/styles.css': 'https://raw.githubusercontent.com/fabioronco/querenciadeboiadeiroagropecuaria/main/styles.css',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (currentAssets[url.pathname]) {
      const response = await fetch(currentAssets[url.pathname]);
      if (!response.ok) return new Response('Não foi possível carregar a interface atual.', { status: 502 });
      return new Response(response.body, { headers: { 'content-type': url.pathname.endsWith('.css') ? 'text/css; charset=UTF-8' : 'application/javascript; charset=UTF-8', 'cache-control': 'no-store, max-age=0' } });
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        return await api({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
      } catch (error) {
        return new Response(JSON.stringify({ error: `Erro no banco: ${error.message || 'falha inesperada'}` }), {
          status: 500,
          headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
        });
      }
    }
    const hostname = url.hostname.toLowerCase();
    if ((hostname === 'qdba.com.br' || hostname === 'www.qdba.com.br') && url.pathname === '/') {
      return env.ASSETS.fetch(new Request(new URL('/site.html', url), request));
    }
    return env.ASSETS.fetch(request);
  },
};
