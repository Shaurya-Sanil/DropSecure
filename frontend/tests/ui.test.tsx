import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '../src/components/ui/Button';
import { StatusBadge } from '../src/components/ui/StatusBadge';

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
});
