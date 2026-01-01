import http from 'http';
import { pool } from '../db/pool.js';

const PORT = process.env.PORT || 3000;
const STATS_TOKEN = process.env.STATS_TOKEN || '';

function isAuthorized(req) {
  if (!STATS_TOKEN) return false;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  return token === STATS_TOKEN;
}

function send(res, status, body, contentType = 'application/json') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === '/health') {
        return send(res, 200, JSON.stringify({ ok: true }));
      }

      if (url.pathname.startsWith('/stats')) {
        if (!isAuthorized(req)) return send(res, 401, 'Unauthorized', 'text/plain');

        if (url.pathname === '/stats/summary') {
          const [users, rewrites, byPreset, donate] = await Promise.all([
            pool.query(`SELECT COUNT(DISTINCT user_id) AS n FROM wow_events`),
            pool.query(`SELECT COUNT(*) AS n FROM wow_events WHERE event IN ('rewrite','rewrite_variant','rewrite_shorter')`),
            pool.query(`
              SELECT COALESCE(preset,'(none)') AS preset, COUNT(*) AS n
              FROM wow_events
              WHERE event IN ('rewrite','rewrite_variant','rewrite_shorter')
              GROUP BY 1
              ORDER BY n DESC
              LIMIT 20
            `),
            pool.query(`
              SELECT
                SUM(CASE WHEN event='donate_menu' THEN 1 ELSE 0 END) AS menus,
                SUM(CASE WHEN event='donate_click' THEN 1 ELSE 0 END) AS clicks,
                SUM(CASE WHEN event='donate_invoice' THEN 1 ELSE 0 END) AS invoices,
                SUM(CASE WHEN event='donate_success' THEN 1 ELSE 0 END) AS success,
                SUM(CASE WHEN event='donate_success' THEN (amount::int) ELSE 0 END) AS stars_total
              FROM wow_events
            `),
          ]);

          return send(res, 200, JSON.stringify({
            users: Number(users.rows[0].n),
            rewrites: Number(rewrites.rows[0].n),
            rewrites_by_preset: byPreset.rows.map(r => ({ preset: r.preset, n: Number(r.n) })),
            donations: {
              menus: Number(donate.rows[0].menus),
              clicks: Number(donate.rows[0].clicks),
              invoices: Number(donate.rows[0].invoices),
              success: Number(donate.rows[0].success),
              stars_total: Number(donate.rows[0].stars_total || 0),
            }
          }));
        }

        if (url.pathname === '/stats/daily') {
          const days = Number(url.searchParams.get('days') || 14);

          const q = await pool.query(`
            SELECT
              DATE_TRUNC('day', ts) AS day,
              COUNT(*) FILTER (WHERE event IN ('rewrite','rewrite_variant','rewrite_shorter')) AS rewrites,
              COUNT(*) FILTER (WHERE event = 'start') AS starts,
              COUNT(*) FILTER (WHERE event = 'donate_success') AS donate_success,
              COALESCE(SUM(amount::int) FILTER (WHERE event = 'donate_success'), 0) AS stars
            FROM wow_events
            WHERE ts >= NOW() - ($1 || ' days')::interval
            GROUP BY 1
            ORDER BY 1 ASC
          `, [days]);

          return send(res, 200, JSON.stringify(q.rows.map(r => ({
            day: r.day,
            starts: Number(r.starts),
            rewrites: Number(r.rewrites),
            donate_success: Number(r.donate_success),
            stars: Number(r.stars),
          }))));
        }

        if (url.pathname === '/stats') {
          // простой HTML-дашборд
          const token = url.searchParams.get('token');
          const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>WOW Advisor Stats</title>
  <style>
    body{font-family:system-ui,Arial;margin:24px;max-width:900px}
    h1{margin:0 0 12px}
    .card{border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0}
    pre{white-space:pre-wrap;word-break:break-word}
    small{color:#666}
  </style>
</head>
<body>
  <h1>WOW Advisor Stats</h1>
  <small>Read-only</small>

  <div class="card">
    <h3>Summary</h3>
    <pre id="summary">Loading…</pre>
  </div>

  <div class="card">
    <h3>Daily (last 14 days)</h3>
    <pre id="daily">Loading…</pre>
  </div>

<script>
  const token = ${JSON.stringify(token || '')};
  async function load() {
    const s = await fetch('/stats/summary?token=' + encodeURIComponent(token)).then(r => r.json());
    document.getElementById('summary').textContent = JSON.stringify(s, null, 2);

    const d = await fetch('/stats/daily?days=14&token=' + encodeURIComponent(token)).then(r => r.json());
    document.getElementById('daily').textContent = JSON.stringify(d, null, 2);
  }
  load();
</script>
</body>
</html>`;
          return send(res, 200, html, 'text/html; charset=utf-8');
        }

        return send(res, 404, 'Not found', 'text/plain');
      }

      return send(res, 404, 'Not found', 'text/plain');
    } catch (e) {
      console.error('httpServer error:', e);
      return send(res, 500, 'Server error', 'text/plain');
    }
  });

  server.listen(PORT, () => console.log(`HTTP server on :${PORT}`));
}
