export interface StorageProvider {
  getPresignedPutUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  getPresignedGetUrl(key: string, expiresInSeconds?: number): Promise<string>;
  uploadObject(key: string, data: Buffer, contentType: string): Promise<void>;
  deleteObject?(key: string): Promise<void>;
}

export interface QueueMessage {
  id: string;
  body: any;
  receiptHandle: string;
}

export interface QueueProvider {
  sendMessage(message: Record<string, any>): Promise<string>;
  receiveMessages(maxMessages?: number, waitTimeSeconds?: number): Promise<QueueMessage[]>;
  deleteMessage(receiptHandle: string): Promise<void>;
}

export interface NotificationProvider {
  publishNotification(
    recipientId: string,
    recipientEmail: string,
    subject: string,
    message: string
  ): Promise<string>;
}

export interface SecretsProvider {
  getSecret(parameterName: string): Promise<string | undefined>;
}
