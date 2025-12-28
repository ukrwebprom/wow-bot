// src/storage/users.js
import { pool } from '../db/pool.js';

export async function upsertUserFromCtx(ctx) {
  const u = ctx.from;
  if (!u?.id) return;

  await pool.query(
    `INSERT INTO users (user_id, username, first_name, last_name, tg_language_code, last_seen_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       tg_language_code = EXCLUDED.tg_language_code,
       last_seen_at = NOW(),
       updated_at = NOW()`,
    [
      String(u.id),
      u.username ?? null,
      u.first_name ?? null,
      u.last_name ?? null,
      u.language_code ?? null,
    ]
  );
}
