import http from 'http';
import { pool } from '../db/pool.js';

export function startHttpServer() {
  const PORT = process.env.PORT || 3000;
  console.log('server starting');

  const server = http.createServer(async (req, res) => {
    try {
      const url = req.url?.split('?')[0] || '/';

      if (url === '/' || url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ok');
        return;
      }

if (url === '/stats') {
  const limit = 20;

  const [{ rows: pRows }, { rows: uCountRows }, { rows: uRows }] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM user_profiles`),
    pool.query(`SELECT COUNT(*)::int AS count FROM users`),
    pool.query(`
      SELECT
        user_id,
        username,
        first_name,
        last_name,
        last_seen_at
      FROM users
      ORDER BY COALESCE(last_seen_at, created_at) DESC
      LIMIT $1
    `, [limit])
  ]);

  const profiles_total = pRows?.[0]?.count ?? 0;
  const users_total = uCountRows?.[0]?.count ?? 0;

  const users_latest = (uRows || []).map((u) => ({
    user_id: Number(u.user_id),
    username: u.username ?? null,
    first_name: u.first_name ?? null,
    last_name: u.last_name ?? null,
    last_seen_at: u.last_seen_at ?? null,
  }));

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ profiles_total, users_total, users_latest }, null, 2));
  return;
}

      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      console.error('HTTP server error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 HTTP server running on :${PORT}`);
  });

  return server;
}
