import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { NotificationProvider } from '../types.js';
import { config } from '../../config/index.js';
import { query } from '../../db/pool.js';

export class SnsNotificationProvider implements NotificationProvider {
  private client: SNSClient;
  private topicArn: string;

  constructor() {
    this.topicArn = config.sns.topicArn;
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

    this.client = new SNSClient(clientConfig);
  }

  async publishNotification(
    recipientId: string,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<string> {
    const command = new PublishCommand({
      TopicArn: this.topicArn,
      Subject: subject,
      Message: message,
      MessageAttributes: {
        recipientId: {
          DataType: 'String',
          StringValue: recipientId,
        },
      },
    });

    const response = await this.client.send(command);
    const messageId = response.MessageId || '';

    // Also mirror to outbox_notifications table for local observability and demo review
    try {
      await query(
        `INSERT INTO outbox_notifications (recipient_id, recipient_email, subject, message)
         VALUES ($1, $2, $3, $4)`,
        [recipientId, recipientEmail, subject, message]
      );
    } catch (err) {
      console.warn('[SNS] Warning: Failed to mirror notification to outbox table', err);
    }

    return messageId;
  }
}
