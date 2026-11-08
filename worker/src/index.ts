import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL || 'postgresql://dropsecure_user:dropsecure_password@localhost:5432/dropsecure_db';
const providerMode = process.env.PROVIDER_MODE || 'local';
const awsRegion = process.env.AWS_REGION || 'ap-south-1';
const awsEndpoint = process.env.AWS_ENDPOINT_URL || undefined;
const sqsQueueUrl = process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/notification-queue';
const snsTopicArn = process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:000000000000:parcel-notifications';
const sesSenderEmail = process.env.SES_SENDER_EMAIL || 'notifications@dropsecure.edu';
const enableSes = process.env.ENABLE_SES === 'true';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

// AWS SDK Clients (used when providerMode === 'aws')
const awsClientConfig: any = { region: awsRegion };
if (awsEndpoint) {
  awsClientConfig.endpoint = awsEndpoint;
}
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  awsClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const sqsClient = new SQSClient(awsClientConfig);
const snsClient = new SNSClient(awsClientConfig);
const sesClient = new SESClient(awsClientConfig);

let isRunning = true;

async function processParcelNotification(parcelId: string): Promise<void> {
  console.log(`[WORKER] 📦 Processing notification for Parcel ID: ${parcelId}`);

  // 1. Query Parcel and Recipient details
  const res = await pool.query(
    `SELECT p.id, p.tracking_code, p.recipient_id, p.status, p.locker_number, p.image_key,
            u.email, u.name, u.room_number
     FROM parcels p
     JOIN users u ON p.recipient_id = u.id
     WHERE p.id = $1`,
    [parcelId]
  );

  if (res.rows.length === 0) {
    console.warn(`[WORKER] Parcel ${parcelId} not found. Skipping.`);
    return;
  }

  const parcel = res.rows[0];

  // 2. Generate cryptographically secure 6-digit OTP
  const rawOtp = crypto.randomInt(100000, 1000000).toString();

  // 3. Hash OTP with bcrypt (10 salt rounds)
  const otpHash = await bcrypt.hash(rawOtp, 10);

  // 4. Update RDS: ONLY store bcrypt hash and 48-hour expiration
  await pool.query(
    `UPDATE parcels
     SET otp_hash = $1,
         otp_expires_at = NOW() + INTERVAL '48 HOURS',
         updated_at = NOW()
     WHERE id = $2`,
    [otpHash, parcel.id]
  );

  const shortId = (parcel.recipient_id || '').slice(0, 6).toUpperCase();
  const rawName = (parcel.name || 'Alice').replace(/^Student\s+/i, '').replace(/\s+Student$/i, '').trim();
  const displayName = `Student ${rawName} (ID: STU-${shortId})`;

  const subject = `[DropSecure] Parcel Arrived at Campus Gate (${parcel.tracking_code})`;
  const lockerInfo = parcel.locker_number ? `\nAssigned Compartment: ${parcel.locker_number} (Simulated Smart Locker)` : '';

  const body = `Hello ${displayName},

A parcel addressed to you (${parcel.room_number || 'Campus Hostel'}) has arrived at the campus smart locker station.

📦 Tracking Code: ${parcel.tracking_code}${lockerInfo}
🔐 6-Digit Pickup OTP: ${rawOtp}
⏳ Expiry: 48 Hours

To collect your package:
1. Walk up to the campus collection kiosk at the gate.
2. Enter your tracking code and 6-digit collection OTP.
3. Your locker door will release automatically.

DropSecure Campus Smart Locker Service`;

  // 5. Publish to Amazon SES and SNS (or Dev Outbox)
  if (providerMode === 'aws') {
    // 5a. Direct SES Email Delivery
    if (enableSes && parcel.email) {
      try {
        const sesCommand = new SendEmailCommand({
          Source: sesSenderEmail,
          Destination: { ToAddresses: [parcel.email] },
          Message: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: body },
              Html: {
                Data: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #0f172a; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
                    <h2 style="margin: 0; color: #1e293b; font-size: 20px;">📦 Package Arrived at Campus Station</h2>
                    <span style="font-size: 12px; color: #64748b; font-family: monospace;">DropSecure Smart Locker Network</span>
                  </div>
                  <p style="font-size: 15px; margin-bottom: 16px;">Hello <strong>${displayName}</strong>,</p>
                  <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                    A parcel addressed to you (<strong>${parcel.room_number || 'Campus Hostel'}</strong>) has arrived and been secured in our smart lockers.
                  </p>
                  <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Tracking Code</div>
                    <div style="font-size: 16px; font-family: monospace; font-weight: bold; color: #0f172a; margin-bottom: 12px;">${parcel.tracking_code}</div>
                    ${parcel.locker_number ? `<div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Assigned Compartment</div><div style="font-size: 16px; font-family: monospace; font-weight: bold; color: #2563eb; margin-bottom: 12px;">${parcel.locker_number} (Simulated Hardware)</div>` : ''}
                    <div style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">6-Digit Collection OTP</div>
                    <div style="font-size: 28px; font-family: monospace; font-weight: 800; color: #16a34a; letter-spacing: 0.25em; margin: 8px 0;">${rawOtp}</div>
                    <div style="font-size: 12px; color: #dc2626;">⏳ Valid for 48 Hours</div>
                  </div>
                  <div style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                    <strong>To collect your package:</strong><br />
                    1. Walk up to the campus collection kiosk at the gate.<br />
                    2. Enter your tracking code and 6-digit collection OTP.<br />
                    3. Your locker door will release automatically.
                  </div>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 11px; color: #94a3b8; margin: 0;">DropSecure Campus Logistics • Zero-Trust Automated Locker System</p>
                </div>`,
              },
            },
          },
        });
        const sesRes = await sesClient.send(sesCommand);
        console.log(`[WORKER] 📧 SES email delivered to ${parcel.email} (Message ID: ${sesRes.MessageId})`);
      } catch (sesErr: any) {
        console.warn(`[WORKER] ⚠️ SES delivery skipped/failed for ${parcel.email}: ${sesErr.message}. Relying on SNS + Outbox.`);
      }
    }

    // 5b. SNS Topic Publish
    try {
      console.log(`[WORKER] Publishing to SNS Topic with recipientId filter: ${parcel.recipient_id}`);
      await snsClient.send(
        new PublishCommand({
          TopicArn: snsTopicArn,
          Subject: subject,
          Message: body,
          MessageAttributes: {
            recipientId: {
              DataType: 'String',
              StringValue: parcel.recipient_id,
            },
            recipientEmail: {
              DataType: 'String',
              StringValue: parcel.email,
            },
          },
        })
      );
    } catch (snsErr: any) {
      console.warn(`[WORKER] ⚠️ SNS publish error: ${snsErr.message}`);
    }
  } else {
    // Local / Dev mode: output to console
    console.log('\n================================================================');
    console.log(`📨 [LOCAL NOTIFICATION DISPATCHED] -> ${parcel.email}`);
    console.log(`🔑 Generated 6-Digit OTP: ${rawOtp}`);
    console.log(`🔐 Bcrypt Hash Stored in DB: ${otpHash.substring(0, 25)}...`);
    console.log('----------------------------------------------------------------');
    console.log(body);
    console.log('================================================================\n');
  }

  // Always mirror to outbox_notifications for the UI Dev Outbox tab
  await pool.query(
    `INSERT INTO outbox_notifications (recipient_id, recipient_email, subject, message)
     VALUES ($1, $2, $3, $4)`,
    [parcel.recipient_id, parcel.email, subject, body]
  );

  // 6. Record in Audit Log
  await pool.query(
    `INSERT INTO audit_log (parcel_id, actor_id, action, details, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      parcel.id,
      parcel.recipient_id,
      'OTP_DISPATCHED',
      JSON.stringify({ trackingCode: parcel.tracking_code, recipientEmail: parcel.email }),
      '127.0.0.1 (worker)',
    ]
  );

  console.log(`[WORKER] ✅ Notification dispatched and parcel ${parcel.tracking_code} secured!`);
}

async function pollLocalQueue(): Promise<void> {
  while (isRunning) {
    try {
      // Query local_queue_messages with SKIP LOCKED
      const res = await pool.query(
        `UPDATE local_queue_messages
         SET visible_after = NOW() + INTERVAL '30 SECONDS'
         WHERE id IN (
           SELECT id FROM local_queue_messages
           WHERE visible_after <= NOW()
           ORDER BY created_at ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, body, receipt_handle`
      );

      if (res.rows.length > 0) {
        const msg = res.rows[0];
        const body = typeof msg.body === 'string' ? JSON.parse(msg.body) : msg.body;
        if (body.parcelId) {
          await processParcelNotification(body.parcelId);
        }
        await pool.query(`DELETE FROM local_queue_messages WHERE id = $1`, [msg.id]);
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      console.error('[WORKER] Error in local queue poll loop:', err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function pollAwsSqs(): Promise<void> {
  console.log(`[WORKER] Long-polling SQS queue: ${sqsQueueUrl}`);
  while (isRunning) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: sqsQueueUrl,
          MaxNumberOfMessages: 5,
          WaitTimeSeconds: 15,
        })
      );

      if (response.Messages && response.Messages.length > 0) {
        for (const msg of response.Messages) {
          try {
            const body = JSON.parse(msg.Body || '{}');
            if (body.parcelId) {
              await processParcelNotification(body.parcelId);
            }
            // Delete message from SQS on successful processing
            if (msg.ReceiptHandle) {
              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: sqsQueueUrl,
                  ReceiptHandle: msg.ReceiptHandle,
                })
              );
            }
          } catch (itemError) {
            console.error('[WORKER] Failed to process SQS message, leaving for retry/DLQ:', itemError);
            // SQS visibility timeout will expire, and message retries until DLQ after 3 failures
          }
        }
      }
    } catch (sqsError) {
      console.error('[WORKER] SQS Receive Error:', sqsError);
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
}

async function startWorker() {
  console.log('----------------------------------------------------');
  console.log('⚙️  DropSecure Background Worker Started');
  console.log(`Mode: ${providerMode.toUpperCase()}`);
  console.log('----------------------------------------------------');

  if (providerMode === 'aws') {
    await pollAwsSqs();
  } else {
    await pollLocalQueue();
  }
}

process.on('SIGINT', () => {
  console.log('\n[WORKER] Shutting down cleanly...');
  isRunning = false;
  pool.end();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[WORKER] Shutting down cleanly...');
  isRunning = false;
  pool.end();
  process.exit(0);
});

startWorker().catch((err) => {
  console.error('[WORKER] Fatal worker error:', err);
  process.exit(1);
});
