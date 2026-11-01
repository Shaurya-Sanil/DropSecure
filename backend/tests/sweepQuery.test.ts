import { describe, it, expect } from 'vitest';

describe('Daily Sweep Query Filter Logic', () => {
  interface MockParcel {
    id: string;
    trackingCode: string;
    status: 'PENDING' | 'COLLECTED' | 'EXPIRED';
    createdAt: Date;
    lastRemindedAt: Date | null;
  }

  // Exact JavaScript representation of the SQL filter:
  // WHERE status = 'PENDING'
  //   AND created_at < NOW() - INTERVAL '24 HOURS'
  //   AND (last_reminded_at IS NULL OR last_reminded_at < NOW() - INTERVAL '24 HOURS')
  function isEligibleForDailySweep(parcel: MockParcel, now: Date = new Date()): boolean {
    if (parcel.status !== 'PENDING') return false;

    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    if (parcel.createdAt >= twentyFourHoursAgo) return false;

    if (parcel.lastRemindedAt && parcel.lastRemindedAt >= twentyFourHoursAgo) {
      return false;
    }

    return true;
  }

  it('should include PENDING parcels older than 24 hours with no previous reminder', () => {
    const now = new Date();
    const staleParcel: MockParcel = {
      id: '1',
      trackingCode: 'DS-STALE-1',
      status: 'PENDING',
      createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000), // 26 hours ago
      lastRemindedAt: null,
    };

    expect(isEligibleForDailySweep(staleParcel, now)).toBe(true);
  });

  it('should include PENDING parcels whose last reminder was > 24 hours ago', () => {
    const now = new Date();
    const reRemindParcel: MockParcel = {
      id: '2',
      trackingCode: 'DS-STALE-2',
      status: 'PENDING',
      createdAt: new Date(now.getTime() - 50 * 60 * 60 * 1000), // 50 hours ago
      lastRemindedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
    };

    expect(isEligibleForDailySweep(reRemindParcel, now)).toBe(true);
  });

  it('should ignore parcels created less than 24 hours ago', () => {
    const now = new Date();
    const freshParcel: MockParcel = {
      id: '3',
      trackingCode: 'DS-FRESH-1',
      status: 'PENDING',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      lastRemindedAt: null,
    };

    expect(isEligibleForDailySweep(freshParcel, now)).toBe(false);
  });

  it('should ignore already COLLECTED or EXPIRED parcels regardless of age', () => {
    const now = new Date();
    const collectedParcel: MockParcel = {
      id: '4',
      trackingCode: 'DS-COLLECTED-1',
      status: 'COLLECTED',
      createdAt: new Date(now.getTime() - 30 * 60 * 60 * 1000),
      lastRemindedAt: null,
    };

    const expiredParcel: MockParcel = {
      id: '5',
      trackingCode: 'DS-EXPIRED-1',
      status: 'EXPIRED',
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      lastRemindedAt: null,
    };

    expect(isEligibleForDailySweep(collectedParcel, now)).toBe(false);
    expect(isEligibleForDailySweep(expiredParcel, now)).toBe(false);
  });

  it('should prevent spam by ignoring parcels reminded within the last 24 hours', () => {
    const now = new Date();
    const recentlyRemindedParcel: MockParcel = {
      id: '6',
      trackingCode: 'DS-RECENTLY-REMINDED',
      status: 'PENDING',
      createdAt: new Date(now.getTime() - 40 * 60 * 60 * 1000),
      lastRemindedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
    };

    expect(isEligibleForDailySweep(recentlyRemindedParcel, now)).toBe(false);
  });
});
