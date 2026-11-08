import React from 'react';
import { cn } from './utils';

export interface StatusBadgeProps {
  status: 'PENDING' | 'COLLECTED' | 'EXPIRED' | 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const getStyles = () => {
    switch (status) {
      case 'COLLECTED':
      case 'ONLINE':
        return {
          dot: 'bg-status-success',
          text: 'text-fg',
          display: label || (status === 'COLLECTED' ? 'Collected' : 'Operational'),
        };
      case 'PENDING':
        return {
          dot: 'bg-status-warning',
          text: 'text-fg',
          display: label || 'Awaiting pickup',
        };
      case 'EXPIRED':
      case 'OFFLINE':
      case 'DEGRADED':
        return {
          dot: 'bg-status-danger',
          text: 'text-fg',
          display: label || (status === 'EXPIRED' ? 'Expired (>48h)' : 'Degraded'),
        };
      default:
        return {
          dot: 'bg-fg-muted',
          text: 'text-fg-muted',
          display: label || status,
        };
    }
  };

  const style = getStyles();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-canvas-raised border border-border text-fg',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)} />
      <span className={style.text}>{style.display}</span>
    </span>
  );
};

