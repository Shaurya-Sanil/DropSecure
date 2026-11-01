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

let isRunning = true;

async function processParcelNotification(parcelId: string): Promise<void> {
  console.log(`[WORKER] 📦 Processing notification for Parcel ID: ${parcelId}`);

  // 1. Query Parcel and Recipient details
  const res = await pool.query(
    `SELECT p.id, p.tracking_code, p.recipient_id, p.status,
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

  const subject = `[DropSecure] Parcel Arrived at Campus Gate (${parcel.tracking_code})`;
  const body = `Hello ${parcel.name},\n\nA parcel addressed to you (${parcel.room_number || 'Campus'}) has arrived at the security gate.\n\nTracking Code: ${parcel.tracking_code}\nYour 6-Digit Pickup OTP: ${rawOtp}\nExpiry: 48 Hours\n\nPlease present this OTP to campus security at the gate to claim your delivery.\n\nDropSecure Automated Gate Service`;

  // 5. Publish to Amazon SNS (or Dev Outbox)
  if (providerMode === 'aws') {
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
        },
      })
    );
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
