import { pool } from './pool.js';

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id      BIGINT PRIMARY KEY,
      language     TEXT,
      platform     TEXT,
      goal         TEXT,
      voice        TEXT,
      niche        TEXT,
      boundaries   JSONB,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id           BIGINT PRIMARY KEY,
      username          TEXT,
      first_name        TEXT,
      last_name         TEXT,
      tg_language_code  TEXT,
      last_seen_at      TIMESTAMPTZ,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

