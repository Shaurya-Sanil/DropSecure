import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { parcelsRouter } from './routes/parcels.js';
import { usersRouter } from './routes/users.js';
import { statsRouter } from './routes/stats.js';
import { errorHandler } from './middleware/errorHandler.js';
import { query } from './db/pool.js';
import { config } from './config/index.js';

export const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// Support both standard JSON body and raw binary uploads
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Structured JSON Request Logging Middleware (CloudWatch friendly)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || `req-${Math.random().toString(36).substring(2, 9)}`;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      campusId: req.headers['x-campus-id'] || req.query.campusId || undefined,
    };
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: 'ERROR', ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: 'WARN', ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: 'INFO', ...logEntry }));
    }
  });

  next();
});

// Comprehensive /health and readiness check endpoint
app.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  const t0 = Date.now();
  try {
    await query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
  } catch (err: any) {
    dbStatus = `unhealthy: ${err.message}`;
  }

  const isHealthy = dbStatus === 'healthy';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'DropSecure Express API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    providerMode: config.providerMode,
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      storageProvider: config.providerMode === 'aws' ? 'Amazon S3' : 'Local Disk',
      notificationProvider: config.providerMode === 'aws' ? 'Amazon SNS/SES' : 'Local Outbox',
    },
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/parcels', parcelsRouter);
app.use('/api/users', usersRouter);
app.use('/api/stats', statsRouter);

// Global Error Handler
app.use(errorHandler);
