import { v4 as uuidv4 } from 'uuid';
import { NotificationProvider } from '../types.js';
import { query } from '../../db/pool.js';

export class LocalNotificationProvider implements NotificationProvider {
  async publishNotification(
    recipientId: string,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<string> {
    const messageId = `local-msg-${uuidv4()}`;

    // 1. Log beautiful notification to terminal
    console.log('\n======================================================');
    console.log(`📨 [LOCAL NOTIFICATION DISPATCHED] -> ${recipientEmail}`);
    console.log(`🏷️  Recipient ID: ${recipientId}`);
    console.log(`📌 Subject:      ${subject}`);
    console.log('------------------------------------------------------');
    console.log(message);
    console.log('======================================================\n');

    // 2. Persist to outbox_notifications for the web UI "Dev Outbox" viewer
    await query(
      `INSERT INTO outbox_notifications (recipient_id, recipient_email, subject, message)
       VALUES ($1, $2, $3, $4)`,
      [recipientId, recipientEmail, subject, message]
    );

    return messageId;
  }
}
