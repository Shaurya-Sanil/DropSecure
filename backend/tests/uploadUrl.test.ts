import { describe, it, expect } from 'vitest';
import { uploadUrlSchema } from '../src/utils/validators.js';
import { LocalStorageProvider } from '../src/providers/storage/localStorageProvider.js';

describe('Upload URL Generation & Validation', () => {
  it('should accept allowed image MIME types (jpeg, png, webp, heic)', () => {
    const validInputs = [
      { fileName: 'parcel1.jpg', mimeType: 'image/jpeg' },
      { fileName: 'photo.png', mimeType: 'image/png' },
      { fileName: 'shot.webp', mimeType: 'image/webp' },
      { fileName: 'camera.heic', mimeType: 'image/heic' },
    ];

    for (const input of validInputs) {
      const result = uploadUrlSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should reject non-image or potentially malicious MIME types', () => {
    const invalidInputs = [
      { fileName: 'malware.exe', mimeType: 'application/x-msdownload' },
      { fileName: 'script.js', mimeType: 'text/javascript' },
      { fileName: 'document.pdf', mimeType: 'application/pdf' },
      { fileName: 'data.svg', mimeType: 'image/svg+xml' }, // SVG can carry XSS, so rejected
    ];

    for (const input of invalidInputs) {
      const result = uploadUrlSchema.safeParse(input);
      expect(result.success).toBe(false);
    }
  });

  it('should generate a valid presigned PUT URL and encoded key with LocalStorageProvider', async () => {
    const provider = new LocalStorageProvider();
    const testKey = 'parcels/test-uuid-12345.jpg';

    const url = await provider.getPresignedPutUrl(testKey, 'image/jpeg', 900);
    expect(url).toBeDefined();
    expect(url).toContain('/api/parcels/upload-local');
    expect(url).toContain(encodeURIComponent(testKey));
  });

  it('should generate a valid presigned GET URL with LocalStorageProvider', async () => {
    const provider = new LocalStorageProvider();
    const testKey = 'parcels/test-uuid-12345.jpg';

    const url = await provider.getPresignedGetUrl(testKey, 3600);
    expect(url).toBeDefined();
    expect(url).toContain('/api/parcels/image/');
    expect(url).toContain(encodeURIComponent(testKey));
  });
});
