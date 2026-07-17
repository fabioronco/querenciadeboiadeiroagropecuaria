import { onRequest as api } from './functions/api/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
    return env.ASSETS.fetch(request);
  },
};
