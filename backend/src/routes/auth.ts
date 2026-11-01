import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { config } from '../config/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../utils/validators.js';
import { logAudit } from '../utils/audit.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const result = await query(
    `SELECT id, email, password_hash, name, role, phone, room_number, email_confirmed
     FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  await logAudit({
    actorId: user.id,
    action: 'USER_LOGIN',
    details: { role: user.role, email: user.email },
    ipAddress: req.ip,
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      roomNumber: user.room_number,
      emailConfirmed: user.email_confirmed,
    },
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT id, email, name, role, phone, room_number, email_confirmed
     FROM users WHERE id = $1`,
    [req.user!.id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const user = result.rows[0];
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      roomNumber: user.room_number,
      emailConfirmed: user.email_confirmed,
    },
  });
});

// POST /api/auth/confirm-email (SNS Subscription Confirmation toggle)
authRouter.post('/confirm-email', authenticate, async (req: Request, res: Response): Promise<void> => {
  await query(
    `UPDATE users SET email_confirmed = TRUE, updated_at = NOW() WHERE id = $1`,
    [req.user!.id]
  );

  await logAudit({
    actorId: req.user!.id,
    action: 'EMAIL_CONFIRMED',
    details: { email: req.user!.email },
    ipAddress: req.ip,
  });

  res.json({ message: 'Email confirmed for SNS notifications' });
});

// GET /api/auth/demo-users (For Demo Quick Switcher)
authRouter.get('/demo-users', async (_req: Request, res: Response): Promise<void> => {
  const result = await query(
    `SELECT id, email, name, role, phone, room_number, email_confirmed
     FROM users ORDER BY role ASC, name ASC`
  );
  res.json({ users: result.rows });
});
