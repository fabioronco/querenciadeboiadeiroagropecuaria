import { onRequest as api } from './functions/api/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
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
    return env.ASSETS.fetch(request);
  },
};
