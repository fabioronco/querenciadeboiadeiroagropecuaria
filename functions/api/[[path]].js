const encoder = new TextEncoder();
const INITIAL_USER = 'QDB';
const INITIAL_SALT = 'QDB-2026-Cloudflare';
const INITIAL_HASH = '0EkeTHfPU9iCihtGx+p1FInJZ3bp/Qtl95FRu12aIz0=';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=UTF-8', 'cache-control': 'no-store' },
});

function base64(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

async function passwordHash(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256);
  return base64(new Uint8Array(bits));
}

async function sha256(value) {
  return base64(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}

function newToken() {
  return base64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, '');
}

async function setup(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL, updated_by INTEGER);
    INSERT OR IGNORE INTO users (id, username, password_hash, salt, created_at) VALUES (1, '${INITIAL_USER}', '${INITIAL_HASH}', '${INITIAL_SALT}', datetime('now'));
    UPDATE users SET password_hash = '${INITIAL_HASH}', salt = '${INITIAL_SALT}' WHERE id = 1 AND username = '${INITIAL_USER}';
  `);
}

async function userFromRequest(request, db) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const row = await db.prepare(`SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')`).bind(await sha256(token)).first();
  return row || null;
}

export async function onRequest(context) {
  const db = context.env.DB;
  if (!db) return json({ error: 'Banco de dados ainda não foi conectado ao projeto.' }, 503);
  await setup(db);
  const { request } = context;
  const path = new URL(request.url).pathname.replace(/^\/api/, '') || '/';

  if (request.method === 'POST' && path === '/auth/login') {
    const { username = '', password = '' } = await request.json().catch(() => ({}));
    const user = await db.prepare('SELECT * FROM users WHERE upper(username) = upper(?)').bind(String(username).trim()).first();
    if (!user || (await passwordHash(String(password), user.salt)) !== user.password_hash) return json({ error: 'Login ou senha incorretos.' }, 401);
    const token = newToken();
    await db.prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`).bind(await sha256(token), user.id).run();
    return json({ token, user: { username: user.username } });
  }

  const user = await userFromRequest(request, db);
  if (!user) return json({ error: 'Sessão expirada. Entre novamente.' }, 401);

  if (request.method === 'GET' && path === '/auth/me') return json({ user });
  if (request.method === 'POST' && path === '/auth/logout') {
    const token = request.headers.get('authorization').replace(/^Bearer\s+/i, '');
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return json({ ok: true });
  }
  if (path === '/state' && request.method === 'GET') {
    const row = await db.prepare('SELECT payload, updated_at FROM app_state WHERE id = 1').first();
    return json({ state: row ? JSON.parse(row.payload) : null, updatedAt: row?.updated_at || null });
  }
  if (path === '/state' && request.method === 'PUT') {
    const { state } = await request.json().catch(() => ({}));
    if (!state || !Array.isArray(state.expenses) || !Array.isArray(state.purchases) || !Array.isArray(state.sales)) return json({ error: 'Dados inválidos.' }, 400);
    const payload = JSON.stringify({ expenses: state.expenses, purchases: state.purchases, sales: state.sales });
    await db.prepare(`INSERT INTO app_state (id, payload, updated_at, updated_by) VALUES (1, ?, datetime('now'), ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(payload, user.id).run();
    return json({ ok: true });
  }
  return json({ error: 'Rota não encontrada.' }, 404);
}
