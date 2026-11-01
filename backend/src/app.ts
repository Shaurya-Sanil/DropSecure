import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { parcelsRouter } from './routes/parcels.js';
import { usersRouter } from './routes/users.js';
import { statsRouter } from './routes/stats.js';
import { errorHandler } from './middleware/errorHandler.js';

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

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'DropSecure Express API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/parcels', parcelsRouter);
app.use('/api/users', usersRouter);
app.use('/api/stats', statsRouter);

// Global Error Handler
app.use(errorHandler);
