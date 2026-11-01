import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from '../types.js';
import { config } from '../../config/index.js';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = config.s3.bucketName;
    const clientConfig: any = {
      region: config.aws.region,
    };

    if (config.aws.endpointUrl) {
      clientConfig.endpoint = config.aws.endpointUrl;
      clientConfig.forcePathStyle = true; // Essential for LocalStack
    }

    if (config.aws.accessKeyId && config.aws.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      };
    }

    this.client = new S3Client(clientConfig);
  }

  async getPresignedPutUrl(key: string, contentType: string, expiresInSeconds: number = config.s3.presignedExpires): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async getPresignedGetUrl(key: string, expiresInSeconds: number = config.s3.presignedExpires): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async uploadObject(key: string, data: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }
}
