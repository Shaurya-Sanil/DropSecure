import fs from 'fs';
import path from 'path';
import { StorageProvider } from '../types.js';
import { config } from '../../config/index.js';

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    this.baseUrl = `http://localhost:${config.port}/api/parcels`;
  }

  async getPresignedPutUrl(key: string, contentType: string, _expiresInSeconds?: number): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `${this.baseUrl}/upload-local?key=${encodedKey}`;
  }

  async getPresignedGetUrl(key: string, _expiresInSeconds?: number): Promise<string> {
    const encodedKey = encodeURIComponent(key);
    return `${this.baseUrl}/image/${encodedKey}`;
  }

  async uploadObject(key: string, data: Buffer, _contentType: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data);
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
