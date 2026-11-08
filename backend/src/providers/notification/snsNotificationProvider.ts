import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { NotificationProvider } from '../types.js';
import { config } from '../../config/index.js';
import { query } from '../../db/pool.js';

export class SnsNotificationProvider implements NotificationProvider {
  private snsClient: SNSClient;
  private sesClient: SESClient;
  private topicArn: string;
  private senderEmail: string;
  private sesEnabled: boolean;

  constructor() {
    this.topicArn = config.sns.topicArn;
    this.senderEmail = config.ses.senderEmail;
    this.sesEnabled = config.ses.enabled;

    const clientConfig: any = {
      region: config.aws.region,
    };

    if (config.aws.endpointUrl) {
      clientConfig.endpoint = config.aws.endpointUrl;
    }

    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }

    this.snsClient = new SNSClient(clientConfig);
    this.sesClient = new SESClient(clientConfig);
  }

  async publishNotification(
    recipientId: string,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<string> {
    let messageId = '';
    let sesDelivered = false;

    // 1. Direct SES Email Attempt (if enabled / verified demo email)
    if (this.sesEnabled && recipientEmail) {
      try {
        const sesCommand = new SendEmailCommand({
          Source: this.senderEmail,
          Destination: {
            ToAddresses: [recipientEmail],
          },
          Message: {
            Subject: { Data: subject },
            Body: {
              Text: { Data: message },
              Html: {
                Data: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                  <h2>${subject}</h2>
                  <p style="white-space: pre-line; line-height: 1.6;">${message}</p>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="font-size: 12px; color: #64748b;">DropSecure Campus Logistics & Smart Locker System</p>
                </div>`,
              },
            },
          },
        });
        const sesRes = await this.sesClient.send(sesCommand);
        messageId = sesRes.MessageId || '';
        sesDelivered = true;
        console.log(`[NOTIFICATIONS] 📧 SES email sent to ${recipientEmail} (ID: ${messageId})`);
      } catch (err: any) {
        console.warn(`[NOTIFICATIONS] ⚠️ SES send skipped/failed for ${recipientEmail}: ${err.message}. Falling back to SNS + Outbox.`);
      }
    }

    // 2. SNS Topic Broadcast (Fallback / SMS / Push subscriber notifications)
    try {
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: subject,
        Message: message,
        MessageAttributes: {
          recipientId: {
            DataType: 'String',
            StringValue: recipientId,
          },
          recipientEmail: {
            DataType: 'String',
            StringValue: recipientEmail,
          },
          sesDelivered: {
            DataType: 'String',
            StringValue: sesDelivered ? 'true' : 'false',
          },
        },
      });

      const response = await this.snsClient.send(command);
      if (!messageId) {
        messageId = response.MessageId || '';
      }
    } catch (snsErr: any) {
      console.warn(`[NOTIFICATIONS] ⚠️ SNS publish warning: ${snsErr.message}`);
    }

    // 3. Persist to outbox table for dev inspection & audit trace
    try {
      await query(
        `INSERT INTO notifications_outbox (recipient_id, recipient_email, subject, message, status)
         VALUES ($1, $2, $3, $4, 'SENT')`,
        [recipientId, recipientEmail, subject, message]
      );
    } catch (err) {
      console.error('[NOTIFICATIONS] Error logging notification to outbox:', err);
    }

    return messageId;
  }
}
