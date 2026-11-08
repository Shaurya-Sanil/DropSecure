import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, query } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log('[MIGRATE] Running database migrations...');
  let migrationPath = path.join(__dirname, 'migrations', '001_initial_schema.sql');
  if (!fs.existsSync(migrationPath)) {
    migrationPath = path.join(__dirname, '..', '..', 'src', 'db', 'migrations', '001_initial_schema.sql');
  }
  if (!fs.existsSync(migrationPath)) {
    migrationPath = path.resolve(process.cwd(), 'src', 'db', 'migrations', '001_initial_schema.sql');
  }
  if (!fs.existsSync(migrationPath)) {
    migrationPath = path.resolve(process.cwd(), 'backend', 'src', 'db', 'migrations', '001_initial_schema.sql');
  }
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS campus_id VARCHAR(50) DEFAULT \'CAMPUS-BANDRA\';');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS locker_number VARCHAR(20) DEFAULT \'L-01\';');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS locker_size VARCHAR(20) DEFAULT \'MEDIUM\';');
    await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS package_condition VARCHAR(50) DEFAULT \'INTACT\';');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS campus_id VARCHAR(50) DEFAULT \'CAMPUS-BANDRA\';');
    await client.query('COMMIT');
    console.log('[MIGRATE] Schema 001 applied successfully!');

    // Apply migration 002: Campuses table & multi-tenancy
    let migration002Path = path.join(__dirname, 'migrations', '002_multi_campus_tenancy.sql');
    if (!fs.existsSync(migration002Path)) {
      migration002Path = path.join(__dirname, '..', '..', 'src', 'db', 'migrations', '002_multi_campus_tenancy.sql');
    }
    if (!fs.existsSync(migration002Path)) {
      migration002Path = path.resolve(process.cwd(), 'src', 'db', 'migrations', '002_multi_campus_tenancy.sql');
    }
    if (!fs.existsSync(migration002Path)) {
      migration002Path = path.resolve(process.cwd(), 'backend', 'src', 'db', 'migrations', '002_multi_campus_tenancy.sql');
    }

    if (fs.existsSync(migration002Path)) {
      const sql002 = fs.readFileSync(migration002Path, 'utf8');
      await client.query('BEGIN');
      await client.query(sql002);
      await client.query('COMMIT');
      console.log('[MIGRATE] Schema 002 applied successfully!');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[MIGRATE] Error applying migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

// If executed directly from CLI
if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
