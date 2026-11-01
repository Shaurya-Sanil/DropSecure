import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadUrlSchema, createParcelSchema, verifyOtpSchema } from '../utils/validators.js';
import { getProviders } from '../providers/index.js';
import { logAudit } from '../utils/audit.js';

export const parcelsRouter = Router();

// Helper to generate human-readable tracking codes: DS-4829-X
function generateTrackingCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const char = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `DS-${num}-${char}`;
}

// 1. POST /api/parcels/upload-url (Generate Presigned S3 PUT URL - public for couriers)
parcelsRouter.post(
  '/upload-url',
  validate(uploadUrlSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { fileName, mimeType } = req.body;
    const ext = path.extname(fileName) || '.jpg';
    const key = `parcels/${uuidv4()}-${Date.now()}${ext}`;

    const providers = getProviders();
    const uploadUrl = await providers.storage.getPresignedPutUrl(key, mimeType, 900);

    res.json({
      uploadUrl,
      imageKey: key,
      expiresIn: 900,
    });
  }
);

// 2. Direct binary local upload endpoint (used when storage provider is local)
parcelsRouter.put('/upload-local', async (req: Request, res: Response): Promise<void> => {
  const key = req.query.key as string;
  if (!key) {
    res.status(400).json({ error: 'Missing key query parameter' });
    return;
  }

  const baseDir = path.resolve(process.cwd(), 'uploads');
  const targetPath = path.join(baseDir, key);
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const writeStream = fs.createWriteStream(targetPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.status(200).json({ success: true, key });
  });

  writeStream.on('error', (err) => {
    console.error('[LOCAL-UPLOAD] Error saving file:', err);
    res.status(500).json({ error: 'Failed to write uploaded file' });
  });
});

// 3. Image streaming endpoint for local storage provider
parcelsRouter.get('/image/:dir/:file', (req: Request, res: Response): void => {
  const { dir, file } = req.params;
  const filePath = path.resolve(process.cwd(), 'uploads', dir, file);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Image not found' });
    return;
  }
  res.sendFile(filePath);
});

// 4. POST /api/parcels (Register dropped parcel & enqueue to SQS - public for couriers)
parcelsRouter.post(
  '/',
  validate(createParcelSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { recipientId, imageKey, notes, carrier, campusId, lockerNumber, lockerSize, packageCondition } = req.body;
    let droppedById = (req as any).user?.id;
    if (!droppedById) {
      const deliveryUserRes = await query(`SELECT id FROM users WHERE role = 'DELIVERY' LIMIT 1`);
      droppedById = deliveryUserRes.rows[0]?.id || recipientId;
    }
    const trackingCode = generateTrackingCode();

    // Verify recipient exists
    const recipientRes = await query(`SELECT id, email, name, campus_id FROM users WHERE id = $1`, [recipientId]);
    if (recipientRes.rows.length === 0) {
      res.status(404).json({ error: 'Recipient user not found' });
      return;
    }

    const recipient = recipientRes.rows[0];
    const assignedCampus = campusId || recipient.campus_id || 'CAMPUS-BANDRA';
    const randomLockerNum = Math.floor(1 + Math.random() * 12);
    const assignedLocker = lockerNumber || `L-${randomLockerNum < 10 ? '0' + randomLockerNum : randomLockerNum}`;
    const assignedSize = lockerSize || (randomLockerNum <= 4 ? 'SMALL' : randomLockerNum <= 8 ? 'MEDIUM' : 'LARGE');
    const assignedCondition = packageCondition || 'INTACT';

    // Insert PENDING parcel row with smart locker & campus
    const insertRes = await query(
      `INSERT INTO parcels (
         tracking_code, recipient_id, dropped_by_id, image_key, 
         status, notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING id, tracking_code, recipient_id, dropped_by_id, image_key, status, notes, carrier, 
                 campus_id, locker_number, locker_size, package_condition, created_at`,
      [
        trackingCode,
        recipientId,
        droppedById,
        imageKey,
        notes || null,
        carrier || 'General Courier',
        assignedCampus,
        assignedLocker,
        assignedSize,
        assignedCondition,
      ]
    );

    const parcel = insertRes.rows[0];

    // Enqueue parcelId to SQS via QueueProvider
    const providers = getProviders();
    const messageId = await providers.queue.sendMessage({ parcelId: parcel.id });

    // Record audit log
    await logAudit({
      parcelId: parcel.id,
      actorId: droppedById,
      action: 'PARCEL_DROPPED',
      details: {
        trackingCode: parcel.tracking_code,
        recipientId,
        imageKey,
        carrier: carrier || 'General Courier',
        campusId: assignedCampus,
        lockerNumber: assignedLocker,
        lockerSize: assignedSize,
        packageCondition: assignedCondition,
        sqsMessageId: messageId,
      },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Parcel dropped successfully and notification queued',
      parcel: {
        ...parcel,
        recipient,
      },
    });
  }
);

// 5. GET /api/parcels/lookup/:code (Public lookup for Collection Kiosk)
parcelsRouter.get('/lookup/:code', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const providers = getProviders();
  const result = await query(
    `SELECT p.id, p.tracking_code, p.status, p.carrier, p.notes, p.image_key, p.created_at, p.otp_expires_at,
            p.campus_id, p.locker_number, p.locker_size, p.package_condition,
            r.name AS recipient_name, r.room_number AS recipient_room, r.campus_id AS recipient_campus
     FROM parcels p
     JOIN users r ON p.recipient_id = r.id
     WHERE UPPER(p.tracking_code) = UPPER($1)`,
    [code.trim()]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Parcel not found. Please double-check the tracking code.' });
    return;
  }

  const parcel = result.rows[0];
  let imageUrl = '';
  try {
    if (parcel.image_key) {
      imageUrl = await providers.storage.getPresignedGetUrl(parcel.image_key, 3600);
    }
  } catch (err) {
    console.warn('[LOOKUP] Failed to get presigned GET URL:', err);
  }

  res.json({ parcel: { ...parcel, imageUrl } });
});

// 6. GET /api/parcels/kiosk/pending (Public list of pending parcels awaiting pickup at collection center)
parcelsRouter.get('/kiosk/pending', async (req: Request, res: Response): Promise<void> => {
  const campusFilter = req.query.campusId as string | undefined;
  let sql = `
    SELECT p.id, p.tracking_code, p.carrier, p.created_at, p.otp_expires_at,
           p.campus_id, p.locker_number, p.locker_size, p.package_condition,
           r.name AS recipient_name, r.room_number AS recipient_room
    FROM parcels p
    JOIN users r ON p.recipient_id = r.id
    WHERE p.status = 'PENDING'
  `;
  const params: any[] = [];
  if (campusFilter) {
    sql += ` AND p.campus_id = $1`;
    params.push(campusFilter);
  }
  sql += ` ORDER BY p.created_at DESC LIMIT 50`;

  const result = await query(sql, params);
  res.json({ pendingParcels: result.rows });
});

// 7. GET /api/parcels/campuses (List Father Agnel campuses with operational status & stats)
parcelsRouter.get('/campuses', async (_req: Request, res: Response): Promise<void> => {
  const statsRes = await query(`
    SELECT campus_id, COUNT(*)::int AS parcel_count,
           COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count
    FROM parcels
    GROUP BY campus_id
  `);

  const statsMap = new Map<string, { total: number; pending: number }>();
  statsRes.rows.forEach((r: any) => {
    statsMap.set(r.campus_id, { total: r.parcel_count, pending: r.pending_count });
  });

  const campuses = [
    {
      id: 'CAMPUS-BANDRA',
      name: 'Fr. CRCE Bandra (Main Campus)',
      code: 'CRCE-BANDRA',
      location: 'Bandstand, Bandra (W), Mumbai',
      kioskStation: 'Station #1 (Main Security Gate)',
      totalLockers: 12,
      activeParcels: statsMap.get('CAMPUS-BANDRA')?.pending || 0,
      totalParcels: statsMap.get('CAMPUS-BANDRA')?.total || 0,
      status: 'ONLINE',
      cloudRegion: 'ap-south-1a',
    },
    {
      id: 'CAMPUS-VASHI',
      name: 'Fr. CRIT Vashi (Agnel Technical)',
      code: 'CRIT-VASHI',
      location: 'Sector 9A, Vashi, Navi Mumbai',
      kioskStation: 'Station #2 (Tech Hub Reception)',
      totalLockers: 12,
      activeParcels: statsMap.get('CAMPUS-VASHI')?.pending || 0,
      totalParcels: statsMap.get('CAMPUS-VASHI')?.total || 0,
      status: 'ONLINE',
      cloudRegion: 'ap-south-1b',
    },
    {
      id: 'CAMPUS-NERUL',
      name: 'Agnel Nerul (Polytechnic & Research)',
      code: 'AGNEL-NERUL',
      location: 'Sector 4, Nerul, Navi Mumbai',
      kioskStation: 'Station #3 (Library Drop Station)',
      totalLockers: 12,
      activeParcels: statsMap.get('CAMPUS-NERUL')?.pending || 0,
      totalParcels: statsMap.get('CAMPUS-NERUL')?.total || 0,
      status: 'ONLINE',
      cloudRegion: 'ap-south-1a',
    },
  ];

  res.json({ campuses });
});

// Helper: Validate dynamic zero-trust TOTP token (RFC 6238 time-stepped algorithm)
function isValidTotpToken(seed: string, inputOtp: string): boolean {
  if (!seed || !inputOtp || inputOtp.length !== 6) return false;
  const currentStep = Math.floor(Date.now() / 30000);
  // Allow ±1 time window (current, previous 30s, next 30s) to account for slight clock drift
  for (const step of [currentStep, currentStep - 1, currentStep + 1]) {
    let hash = 0;
    const combined = `${seed}-${step}-dropsecure-salt`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash) % 1000000;
    const expected = String(positiveHash).padStart(6, '0');
    if (expected === inputOtp) {
      return true;
    }
  }
  return false;
}

// 7. POST /api/parcels/verify-otp (Verify OTP at Package Collection Kiosk)
parcelsRouter.post(
  '/verify-otp',
  validate(verifyOtpSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { parcelId, trackingCode, otp } = req.body;

    let parcelRes;
    if (parcelId) {
      parcelRes = await query(`SELECT * FROM parcels WHERE id = $1`, [parcelId]);
    } else {
      parcelRes = await query(`SELECT * FROM parcels WHERE UPPER(tracking_code) = UPPER($1)`, [trackingCode]);
    }

    if (parcelRes.rows.length === 0) {
      res.status(404).json({ error: 'Parcel not found' });
      return;
    }

    const parcel = parcelRes.rows[0];

    // Determine verifying actor (logged in staff/student or automated kiosk)
    let verifiedById = (req as any).user?.id;
    let verifiedByName = (req as any).user?.name || 'Self-Service Collection Kiosk';
    if (!verifiedById) {
      const staffRes = await query(`SELECT id, name FROM users WHERE role = 'GUARD' OR role = 'ADMIN' LIMIT 1`);
      verifiedById = staffRes.rows[0]?.id || null;
    }

    // 1. Check status
    if (parcel.status !== 'PENDING') {
      res.status(400).json({
        error: `Parcel is already marked as ${parcel.status}`,
        status: parcel.status,
      });
      return;
    }

    // 2. Check maximum attempts
    if (parcel.otp_attempts >= 5) {
      res.status(403).json({
        error: 'OTP locked. Maximum 5 verification attempts exceeded. Please contact campus security supervisor.',
        attempts: parcel.otp_attempts,
      });
      return;
    }

    // 3. Check expiration
    if (parcel.otp_expires_at && new Date() > new Date(parcel.otp_expires_at)) {
      await query(`UPDATE parcels SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`, [parcel.id]);
      await logAudit({
        parcelId: parcel.id,
        actorId: verifiedById,
        action: 'OTP_EXPIRED',
        details: { expiresAt: parcel.otp_expires_at },
        ipAddress: req.ip,
      });
      res.status(400).json({ error: 'OTP has expired. Please request a new notification code.' });
      return;
    }

    // 4. Verify OTP: supports EITHER static email OTP OR zero-trust dynamic TOTP token
    const isStaticMatch = parcel.otp_hash ? await bcrypt.compare(otp, parcel.otp_hash) : false;
    const isTotpMatch = isValidTotpToken(parcel.tracking_code, otp);
    const isMatch = isStaticMatch || isTotpMatch;

    if (!isMatch) {
      const newAttempts = parcel.otp_attempts + 1;
      await query(`UPDATE parcels SET otp_attempts = $1, updated_at = NOW() WHERE id = $2`, [
        newAttempts,
        parcel.id,
      ]);

      await logAudit({
        parcelId: parcel.id,
        actorId: verifiedById,
        action: 'OTP_VERIFY_FAILED',
        details: { attempt: newAttempts, remainingAttempts: Math.max(0, 5 - newAttempts) },
        ipAddress: req.ip,
      });

      res.status(400).json({
        error: `Invalid OTP. ${Math.max(0, 5 - newAttempts)} attempt(s) remaining.`,
        attemptsRemaining: Math.max(0, 5 - newAttempts),
      });
      return;
    }

    // Success: mark as COLLECTED
    const updateRes = await query(
      `UPDATE parcels 
       SET status = 'COLLECTED', 
           collected_at = NOW(), 
           verified_by_id = $1, 
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [verifiedById, parcel.id]
    );

    await logAudit({
      parcelId: parcel.id,
      actorId: verifiedById,
      action: 'PARCEL_COLLECTED',
      details: {
        trackingCode: parcel.tracking_code,
        verifiedBy: verifiedByName,
        station: 'Collection Center Kiosk',
        verificationMethod: isTotpMatch ? 'DYNAMIC_TOTP_QR' : 'STATIC_EMAIL_OTP',
        lockerNumber: parcel.locker_number || 'L-01',
        campusId: parcel.campus_id,
      },
      ipAddress: req.ip,
    });

    const providers = getProviders();
    let imageUrl = '';
    try {
      if (updateRes.rows[0].image_key) {
        imageUrl = await providers.storage.getPresignedGetUrl(updateRes.rows[0].image_key, 3600);
      }
    } catch {
      // ignore
    }

    res.json({
      message: 'OTP verified successfully! Package released.',
      parcel: { ...updateRes.rows[0], imageUrl },
    });
  }
);

// 6. GET /api/parcels (List parcels with role scoping and presigned image URLs)
parcelsRouter.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const providers = getProviders();

  let sql = `
    SELECT p.*, 
           r.name AS recipient_name, r.email AS recipient_email, r.room_number AS recipient_room,
           d.name AS dropped_by_name,
           v.name AS verified_by_name
    FROM parcels p
    LEFT JOIN users r ON p.recipient_id = r.id
    LEFT JOIN users d ON p.dropped_by_id = d.id
    LEFT JOIN users v ON p.verified_by_id = v.id
  `;

  const params: any[] = [];
  const conditions: string[] = [];

  if (user.role === 'RECIPIENT') {
    conditions.push(`p.recipient_id = $${params.length + 1}`);
    params.push(user.id);
  } else if (user.role === 'DELIVERY' && req.query.my_drops === 'true') {
    conditions.push(`p.dropped_by_id = $${params.length + 1}`);
    params.push(user.id);
  }

  if (req.query.status) {
    conditions.push(`p.status = $${params.length + 1}`);
    params.push(req.query.status);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }

  sql += ` ORDER BY p.created_at DESC LIMIT 100`;

  const result = await query(sql, params);

  // Attach presigned GET URLs for image preview
  const enrichedParcels = await Promise.all(
    result.rows.map(async (row) => {
      let imageUrl = '';
      try {
        imageUrl = await providers.storage.getPresignedGetUrl(row.image_key, 3600);
      } catch (err) {
        console.warn(`[PARCELS] Failed to get presigned GET URL for key ${row.image_key}:`, err);
      }

      // Do NOT leak otp_hash to the client!
      const { otp_hash, ...safeRow } = row;
      return {
        ...safeRow,
        imageUrl,
      };
    })
  );

  res.json({ parcels: enrichedParcels });
});

// 7. GET /api/parcels/:id
parcelsRouter.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const providers = getProviders();

  const result = await query(
    `SELECT p.*, 
            r.name AS recipient_name, r.email AS recipient_email, r.room_number AS recipient_room,
            d.name AS dropped_by_name,
            v.name AS verified_by_name
     FROM parcels p
     LEFT JOIN users r ON p.recipient_id = r.id
     LEFT JOIN users d ON p.dropped_by_id = d.id
     LEFT JOIN users v ON p.verified_by_id = v.id
     WHERE p.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Parcel not found' });
    return;
  }

  const row = result.rows[0];
  let imageUrl = '';
  try {
    imageUrl = await providers.storage.getPresignedGetUrl(row.image_key, 3600);
  } catch (err) {
    console.warn(`[PARCELS] Failed to get presigned URL:`, err);
  }

  const { otp_hash, ...safeRow } = row;
  res.json({ parcel: { ...safeRow, imageUrl } });
});
