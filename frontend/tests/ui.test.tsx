import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '../src/components/ui/Button';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { SmartLockerGrid } from '../src/components/SmartLockerGrid';

describe('Design System UI Components', () => {
  it('renders primary button with accessible contrast class', () => {
    render(<Button>Deposit Parcel</Button>);
    const btn = screen.getByRole('button', { name: /deposit parcel/i });
    expect(btn).toBeDefined();
    expect(btn.className).toContain('bg-accent');
    expect(btn.className).toContain('text-white');
  });

  it('renders operational status badge with calm indicator', () => {
    render(<StatusBadge status="ONLINE" label="Operational" />);
    const badge = screen.getByText('Operational');
    expect(badge).toBeDefined();
    expect(badge.parentElement?.className).toContain('bg-canvas-raised');
  });

  it('renders pending status badge with warning indicator', () => {
    render(<StatusBadge status="PENDING" label="Awaiting pickup" />);
    const badge = screen.getByText('Awaiting pickup');
    expect(badge).toBeDefined();
  });

  it('renders SmartLockerGrid with locked (red) and unlocked (green) compartments', () => {
    const mockParcels: any[] = [
      {
        id: 'p-1',
        tracking_code: 'DS-TEST-01',
        status: 'PENDING',
        locker_number: 'L-01',
        carrier: 'Amazon',
      },
      {
        id: 'p-2',
        tracking_code: 'DS-TEST-02',
        status: 'PENDING',
        locker_number: 'L-02',
        carrier: 'BlueDart',
      },
    ];

    render(
      <SmartLockerGrid
        activeLocker="L-01"
        isUnlocked={true}
        parcels={mockParcels}
      />
    );

    // L-01 should be open/unlocked in green
    expect(screen.getByText(/DOOR OPEN/i)).toBeDefined();
    expect(screen.getByText(/1 Open \(Green\)/i)).toBeDefined();

    // L-02 should be locked in red
    expect(screen.getByText(/1 Locked \(Red\)/i)).toBeDefined();
    expect(screen.getByText('DS-TEST-02')).toBeDefined();
  });
});


