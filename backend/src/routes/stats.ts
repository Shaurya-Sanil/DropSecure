import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { getProviders } from '../providers/index.js';
import { logAudit } from '../utils/audit.js';

export const statsRouter = Router();

// GET /api/stats/dashboard (Comprehensive operational metrics - supports ?campusId=)
statsRouter.get(
  '/dashboard',
  authenticate,
  roleGuard(['ADMIN', 'GUARD']),
  async (req: Request, res: Response): Promise<void> => {
    const campusId = req.query.campusId as string | undefined;

    let countsSql = `
      SELECT 
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'COLLECTED')::int AS collected,
        COUNT(*) FILTER (WHERE status = 'EXPIRED')::int AS expired,
        COUNT(*) FILTER (WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '24 HOURS')::int AS stale,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS dropped_today
      FROM parcels
    `;
    const countsParams: any[] = [];
    if (campusId && campusId !== 'ALL') {
      countsSql += ` WHERE campus_id = $1`;
      countsParams.push(campusId);
    }
    const countsRes = await query(countsSql, countsParams);

    let auditSql = `
      SELECT a.*, u.name as actor_name, u.role as actor_role, p.tracking_code, p.campus_id as parcel_campus_id
      FROM audit_log a
      LEFT JOIN users u ON a.actor_id = u.id
      LEFT JOIN parcels p ON a.parcel_id = p.id
    `;
    const auditParams: any[] = [];
    if (campusId && campusId !== 'ALL') {
      auditSql += ` WHERE p.campus_id = $1 OR a.details->>'campusId' = $1`;
      auditParams.push(campusId);
    }
    auditSql += ` ORDER BY a.created_at DESC LIMIT 20`;
    const recentAuditRes = await query(auditSql, auditParams);

    res.json({
      metrics: countsRes.rows[0],
      recentAudit: recentAuditRes.rows,
    });
  }
);

// GET /api/stats/audit-logs (Full audit log list - supports ?campusId=)
statsRouter.get(
  '/audit-logs',
  authenticate,
  roleGuard(['ADMIN', 'GUARD']),
  async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const campusId = req.query.campusId as string | undefined;

    let sql = `
      SELECT a.*, u.name as actor_name, u.role as actor_role, p.tracking_code, p.campus_id as parcel_campus_id
      FROM audit_log a
      LEFT JOIN users u ON a.actor_id = u.id
      LEFT JOIN parcels p ON a.parcel_id = p.id
    `;
    const params: any[] = [];
    if (campusId && campusId !== 'ALL') {
      sql += ` WHERE p.campus_id = $1 OR a.details->>'campusId' = $1`;
      params.push(campusId);
    }
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(sql, params);
    res.json({ auditLogs: result.rows });
  }
);

// GET /api/outbox (Dev Outbox viewer for all roles / evaluators - supports ?campusId=)
statsRouter.get('/outbox', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const campusId = req.query.campusId as string | undefined;

  let sql = `
    SELECT o.*, u.name as recipient_name, u.room_number, u.campus_id
    FROM outbox_notifications o
    LEFT JOIN users u ON o.recipient_id = u.id
  `;
  const params: any[] = [];

  // Scoped if student
  if (user.role === 'RECIPIENT') {
    sql += ` WHERE o.recipient_id = $1`;
    params.push(user.id);
  } else if (campusId && campusId !== 'ALL') {
    sql += ` WHERE u.campus_id = $1`;
    params.push(campusId);
  }

  sql += ` ORDER BY o.created_at DESC LIMIT 50`;

  const result = await query(sql, params);
  res.json({ outbox: result.rows });
});

// POST /api/stats/sweep-now (Trigger Daily Stale Sweep on-demand)
statsRouter.post(
  '/sweep-now',
  authenticate,
  roleGuard(['ADMIN']),
  async (req: Request, res: Response): Promise<void> => {
    const providers = getProviders();

    // Query stale pending parcels (>24h and not reminded in last 24h)
    const staleParcelsRes = await query(`
      SELECT p.id, p.tracking_code, p.recipient_id, p.created_at, p.reminder_count,
             u.email, u.name
      FROM parcels p
      JOIN users u ON p.recipient_id = u.id
      WHERE p.status = 'PENDING'
        AND p.created_at < NOW() - INTERVAL '24 HOURS'
        AND (p.last_reminded_at IS NULL OR p.last_reminded_at < NOW() - INTERVAL '24 HOURS')
    `);

    let remindedCount = 0;
    for (const parcel of staleParcelsRes.rows) {
      const subject = `[DropSecure Reminder] Uncollected Parcel at Gate (${parcel.tracking_code})`;
      const message = `Hello ${parcel.name},\n\nYour parcel with Tracking Code ${parcel.tracking_code} has been awaiting pickup at the campus main gate for over 24 hours.\n\nPlease collect it promptly using your 6-digit OTP.\n\nThank you,\nCampus Security & Logistics Team`;

      await providers.notification.publishNotification(
        parcel.recipient_id,
        parcel.email,
        subject,
        message
      );

      await query(
        `UPDATE parcels 
         SET reminder_count = reminder_count + 1,
             last_reminded_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [parcel.id]
      );

      await logAudit({
        parcelId: parcel.id,
        actorId: req.user!.id,
        action: 'REMINDER_SENT',
        details: {
          trackingCode: parcel.tracking_code,
          recipientEmail: parcel.email,
          reminderCount: parcel.reminder_count + 1,
        },
        ipAddress: req.ip,
      });

      remindedCount++;
    }

    res.json({
      message: `Daily sweep completed. Processed and sent reminders for ${remindedCount} parcel(s).`,
      remindedCount,
    });
  }
);
