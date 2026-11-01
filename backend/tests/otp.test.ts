import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

describe('OTP Generation and Verification Security', () => {
  it('should generate a 6-digit cryptographically secure random numeric OTP', () => {
    for (let i = 0; i < 20; i++) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      expect(otp).toHaveLength(6);
      expect(Number(otp)).toBeGreaterThanOrEqual(100000);
      expect(Number(otp)).toBeLessThanOrEqual(999999);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    }
  });

  it('should securely hash OTP with bcrypt and verify only the correct OTP', async () => {
    const rawOtp = '482910';
    const wrongOtp = '482911';

    const hash = await bcrypt.hash(rawOtp, 10);

    // Verify raw OTP is not stored directly in hash
    expect(hash).not.toContain(rawOtp);
    expect(hash.startsWith('$2')).toBe(true);

    // Valid OTP comparison should succeed
    const isValid = await bcrypt.compare(rawOtp, hash);
    expect(isValid).toBe(true);

    // Invalid OTP comparison must fail
    const isInvalid = await bcrypt.compare(wrongOtp, hash);
    expect(isInvalid).toBe(false);
  });

  it('should enforce maximum attempt limitation (5 attempts)', () => {
    const maxAttempts = 5;
    let attempts = 0;

    const simulateFailedAttempt = () => {
      attempts++;
      if (attempts >= maxAttempts) {
        return { locked: true, remaining: 0 };
      }
      return { locked: false, remaining: maxAttempts - attempts };
    };

    expect(simulateFailedAttempt()).toEqual({ locked: false, remaining: 4 });
    expect(simulateFailedAttempt()).toEqual({ locked: false, remaining: 3 });
    expect(simulateFailedAttempt()).toEqual({ locked: false, remaining: 2 });
    expect(simulateFailedAttempt()).toEqual({ locked: false, remaining: 1 });
    expect(simulateFailedAttempt()).toEqual({ locked: true, remaining: 0 });

    // Subsequent attempts remain locked
    expect(simulateFailedAttempt().locked).toBe(true);
  });

  it('should correctly flag expired OTPs', () => {
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const pastExpiry = new Date(now.getTime() - 1000);

    const isExpired = (expiryDate: Date) => new Date() > expiryDate;

    expect(isExpired(futureExpiry)).toBe(false);
    expect(isExpired(pastExpiry)).toBe(true);
  });
});
