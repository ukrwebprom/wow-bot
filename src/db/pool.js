import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: false }, // подходит для Render/Supabase
});

process.once('SIGINT', async () => { await pool.end(); process.exit(0); });
process.once('SIGTERM', async () => { await pool.end(); process.exit(0); });