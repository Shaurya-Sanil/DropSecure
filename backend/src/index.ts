import { app } from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './db/migrate.js';
import { getProviders } from './providers/index.js';
import { pool } from './db/pool.js';

async function bootstrap() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting DropSecure Cloud Backend API...');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Provider Mode: ${config.providerMode}`);
  console.log('----------------------------------------------------');

  try {
    // 1. Initialize Secrets Provider
    const providers = getProviders();
    if (config.providerMode === 'aws') {
      const ssmJwtSecret = await providers.secrets.getSecret(config.ssm.jwtSecretParam);
      if (ssmJwtSecret) {
        config.jwt.secret = ssmJwtSecret;
        console.log('[SSM] Successfully loaded JWT Secret from SSM Parameter Store');
      }
    }

    // 2. Verify Database Connectivity & Run Migrations
    console.log('[DB] Connecting to PostgreSQL database...');
    const client = await pool.connect();
    client.release();
    console.log('[DB] PostgreSQL connection verified!');

    await runMigrations();

    // Check if database needs initial seeding
    const userCountRes = await pool.query('SELECT COUNT(*)::int AS count FROM users');
    if (userCountRes.rows[0].count === 0) {
      console.log('[SEED] Empty database detected. Running initial demo seed...');
      const { seedDatabase } = await import('./db/seed.js');
      await seedDatabase();
    }

    // 3. Start Express HTTP Server
    app.listen(config.port, () => {
      console.log(`📡 DropSecure API Server listening on port ${config.port}`);
      console.log(`🔗 Health Check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    console.error('❌ Fatal error during backend startup:', error);
    process.exit(1);
  }
}

bootstrap();
