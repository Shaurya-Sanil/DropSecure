import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const { Pool } = pg;

export async function runDailySweep(customPool?: pg.Pool) {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://dropsecure_user:dropsecure_password@localhost:5432/dropsecure_db';
  const awsRegion = process.env.AWS_REGION || 'ap-south-1';
  const awsEndpoint = process.env.AWS_ENDPOINT_URL || undefined;
  const snsTopicArn =
    process.env.SNS_TOPIC_ARN || 'arn:aws:sns:ap-south-1:000000000000:parcel-notifications';

  const pool =
    customPool ||
    new Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

  const clientConfig: any = { region: awsRegion };
  if (awsEndpoint) {
    clientConfig.endpoint = awsEndpoint;
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const snsClient = new SNSClient(clientConfig);

  console.log('[LAMBDA-SWEEP] ⏰ Starting Stale Parcel Daily Sweep (> 24 hours uncollected)...');

  // Query PENDING parcels older than 24 hours that have not received a reminder within the last 24 hours
  const queryText = `
    SELECT p.id, p.tracking_code, p.recipient_id, p.created_at, p.reminder_count,
           u.email, u.name
    FROM parcels p
    JOIN users u ON p.recipient_id = u.id
    WHERE p.status = 'PENDING'
      AND p.created_at < NOW() - INTERVAL '24 HOURS'
      AND (p.last_reminded_at IS NULL OR p.last_reminded_at < NOW() - INTERVAL '24 HOURS')
  `;

  const res = await pool.query(queryText);
  console.log(`[LAMBDA-SWEEP] Found ${res.rows.length} uncollected parcel(s) eligible for automated reminder.`);

  const processedList = [];

  for (const parcel of res.rows) {
    const subject = `[DropSecure Reminder] Uncollected Parcel at Campus Gate (${parcel.tracking_code})`;
    const body = `Hello ${parcel.name},\n\nYour parcel with Tracking Code ${parcel.tracking_code} has been awaiting pickup at the campus gate for more than 24 hours.\n\nPlease collect it promptly by providing your 6-digit verification OTP to security.\n\nThank you,\nCampus Security & Logistics`;

    try {
      // 1. Publish SNS notification with recipientId filter attribute
      if (process.env.PROVIDER_MODE === 'aws') {
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
        console.log(`[LAMBDA-SWEEP] 📨 Simulated SNS reminder for ${parcel.email} (${parcel.tracking_code})`);
      }

      // Always mirror to outbox_notifications for dev inspection
      await pool.query(
        `INSERT INTO outbox_notifications (recipient_id, recipient_email, subject, message)
         VALUES ($1, $2, $3, $4)`,
        [parcel.recipient_id, parcel.email, subject, body]
      );

      // 2. Update reminder count and timestamp in RDS
      await pool.query(
        `UPDATE parcels 
         SET reminder_count = reminder_count + 1,
             last_reminded_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [parcel.id]
      );

      // 3. Record audit log
      await pool.query(
        `INSERT INTO audit_log (parcel_id, actor_id, action, details, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          parcel.id,
          parcel.recipient_id,
          'REMINDER_SENT',
          JSON.stringify({
            trackingCode: parcel.tracking_code,
            reminderCount: parcel.reminder_count + 1,
            recipientEmail: parcel.email,
          }),
          '127.0.0.1 (lambda)',
        ]
      );

      processedList.push({
        id: parcel.id,
        trackingCode: parcel.tracking_code,
        recipient: parcel.email,
        reminderCount: parcel.reminder_count + 1,
      });
    } catch (err) {
      console.error(`[LAMBDA-SWEEP] Failed to send reminder for parcel ${parcel.tracking_code}:`, err);
    }
  }

  if (!customPool) {
    await pool.end();
  }

  return {
    statusCode: 200,
    remindedCount: processedList.length,
    parcels: processedList,
  };
}

// AWS Lambda entrypoint
export const handler = async (event: any, context: any) => {
  console.log('[LAMBDA] Event received:', JSON.stringify(event));
  const result = await runDailySweep();
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
