import { v4 as uuidv4 } from 'uuid';
import { QueueProvider, QueueMessage } from '../types.js';
import { query } from '../../db/pool.js';

export class LocalQueueProvider implements QueueProvider {
  async sendMessage(message: Record<string, any>): Promise<string> {
    const id = uuidv4();
    const receiptHandle = `local-handle-${uuidv4()}`;

    await query(
      `INSERT INTO local_queue_messages (id, body, receipt_handle, visible_after)
       VALUES ($1, $2, $3, NOW())`,
      [id, JSON.stringify(message), receiptHandle]
    );

    return id;
  }

  async receiveMessages(maxMessages: number = 10, waitTimeSeconds: number = 2): Promise<QueueMessage[]> {
    // Check for visible messages using SKIP LOCKED (similar to SQS visibility timeout)
    const selectRes = await query(
      `UPDATE local_queue_messages
       SET visible_after = NOW() + INTERVAL '30 SECONDS'
       WHERE id IN (
         SELECT id FROM local_queue_messages
         WHERE visible_after <= NOW()
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, body, receipt_handle`,
      [maxMessages]
    );

    if (selectRes.rows.length === 0 && waitTimeSeconds > 0) {
      // Short delay for long-polling simulation
      await new Promise((r) => setTimeout(r, Math.min(waitTimeSeconds * 1000, 2000)));
    }

    return selectRes.rows.map((row) => ({
      id: row.id,
      body: typeof row.body === 'string' ? JSON.parse(row.body) : row.body,
      receiptHandle: row.receipt_handle,
    }));
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    await query(`DELETE FROM local_queue_messages WHERE receipt_handle = $1`, [receiptHandle]);
  }
}
