import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { QueueProvider, QueueMessage } from '../types.js';
import { config } from '../../config/index.js';

export class SqsQueueProvider implements QueueProvider {
  private client: SQSClient;
  private queueUrl: string;

  constructor() {
    this.queueUrl = config.sqs.queueUrl;
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

    this.client = new SQSClient(clientConfig);
  }

  async sendMessage(message: Record<string, any>): Promise<string> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
    });

    const response = await this.client.send(command);
    return response.MessageId || '';
  }

  async receiveMessages(maxMessages: number = 10, waitTimeSeconds: number = 20): Promise<QueueMessage[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      AttributeNames: ['All'],
    });

    const response = await this.client.send(command);
    if (!response.Messages || response.Messages.length === 0) {
      return [];
    }

    return response.Messages.map((m) => {
      let parsedBody: any;
      try {
        parsedBody = JSON.parse(m.Body || '{}');
      } catch {
        parsedBody = m.Body;
      }

      return {
        id: m.MessageId || '',
        body: parsedBody,
        receiptHandle: m.ReceiptHandle || '',
      };
    });
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    });
    await this.client.send(command);
  }
}
