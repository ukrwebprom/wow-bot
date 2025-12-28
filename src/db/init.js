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
}
