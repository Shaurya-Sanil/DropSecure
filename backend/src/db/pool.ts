import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.db.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle PostgreSQL client', err);
});

export const query = async <T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> => {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.log('[DB-QUERY]', { text, duration, rows: res.rowCount });
  }
  return res;
};
