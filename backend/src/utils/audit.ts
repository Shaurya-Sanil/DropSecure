import { query } from '../db/pool.js';

export async function logAudit(params: {
  parcelId?: string | null;
  actorId?: string | null;
  action: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log (parcel_id, actor_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        params.parcelId || null,
        params.actorId || null,
        params.action,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || '127.0.0.1',
      ]
    );
  } catch (error) {
    console.error('[AUDIT] Failed to record audit log entry:', error);
  }
}
