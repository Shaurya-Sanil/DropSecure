import React from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Parcel } from '../types';

interface SmartLockerGridProps {
  activeLocker?: string;
  isUnlocked?: boolean;
  parcels?: Parcel[];
  campusName?: string;
  stationName?: string;
  onSelectLocker?: (lockerNum: string) => void;
}

export const SmartLockerGrid: React.FC<SmartLockerGridProps> = ({
  activeLocker,
  isUnlocked = false,
  parcels = [],
  onSelectLocker,
}) => {
  // 12 Compartment definitions
  const lockerBay = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const id = `L-${num < 10 ? '0' + num : num}`;
    let size: 'S' | 'M' | 'L' = 'S';
    if (num > 4 && num <= 8) size = 'M';
    if (num > 8) size = 'L';

    const occupyingParcel = parcels.find(
      (p) => p.status === 'PENDING' && (p.locker_number === id || p.locker_number === `Locker ${num}`)
    );

    const isActive = activeLocker === id;
    const isThisUnlocked = isActive && isUnlocked;

    return {
      id,
      num,
      size,
      occupied: Boolean(occupyingParcel),
      parcel: occupyingParcel,
      isActive,
      isUnlocked: isThisUnlocked,
    };
  });

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {lockerBay.map((locker) => {
        return (
          <button
            key={locker.id}
            type="button"
            onClick={() => onSelectLocker && onSelectLocker(locker.id)}
            className={`p-3 rounded border text-left flex flex-col justify-between h-20 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              locker.isUnlocked
                ? 'bg-status-success-tint border-status-success text-fg'
                : locker.isActive
                ? 'bg-canvas-raised border-accent text-fg'
                : locker.occupied
                ? 'bg-canvas-surface border-border text-fg'
                : 'bg-canvas-base border-border text-fg-muted opacity-80'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-medium">{locker.id}</span>
              {locker.isUnlocked ? (
                <Unlock className="h-3.5 w-3.5 text-status-success" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-fg-subtle" />
              )}
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-fg-subtle">{locker.size}</span>
              {locker.occupied && (
                <span className="text-[10px] font-mono font-medium text-status-warning">
                  Occupied
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};
