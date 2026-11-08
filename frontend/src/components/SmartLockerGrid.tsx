import React, { useState, useEffect } from 'react';
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
  stationName = 'Station #1',
  onSelectLocker,
}) => {
  const [demoOpenLocker, setDemoOpenLocker] = useState<string | null>(null);

  // Play subtle mechanical solenoid unlatch sound
  const playSolenoidSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Ignore if autoplay policy blocks audio
    }
  };

  useEffect(() => {
    if (isUnlocked && activeLocker) {
      playSolenoidSound();
    }
  }, [isUnlocked, activeLocker]);

  // 12 Compartment definitions
  const lockerBay = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const id = `L-${num < 10 ? '0' + num : num}`;
    let size: 'Small' | 'Medium' | 'Large' = 'Small';
    if (num > 4 && num <= 8) size = 'Medium';
    if (num > 8) size = 'Large';

    const occupyingParcel = parcels.find((p) => {
      const isPending = !p.status || p.status === 'PENDING';
      if (!isPending) return false;
      const lNum = (p.locker_number || '').trim().toUpperCase();
      return (
        lNum === id ||
        lNum === `L-${num}` ||
        lNum === `L-0${num}` ||
        lNum === `LOCKER ${num}` ||
        lNum === `LOCKER 0${num}` ||
        lNum === String(num) ||
        lNum === `L${num}`
      );
    });

    const activeUpper = (activeLocker || '').trim().toUpperCase();
    const isSystemActive =
      activeUpper === id ||
      activeUpper === `L-${num}` ||
      activeUpper === `LOCKER ${num}` ||
      activeUpper === String(num);

    const isThisUnlocked = (isSystemActive && isUnlocked) || demoOpenLocker === id;
    const isOccupied = Boolean(occupyingParcel);
    const isLocked = isOccupied && !isThisUnlocked;

    return {
      id,
      num,
      size,
      occupied: isOccupied,
      parcel: occupyingParcel,
      isActive: isSystemActive,
      isUnlocked: isThisUnlocked,
      isLocked,
    };
  });

  const lockedCount = lockerBay.filter((l) => l.isLocked).length;
  const openCount = lockerBay.filter((l) => l.isUnlocked).length;
  const vacantCount = lockerBay.filter((l) => !l.occupied && !l.isUnlocked).length;

  const handleLockerClick = (locker: typeof lockerBay[0]) => {
    if (onSelectLocker) {
      onSelectLocker(locker.id);
    }
    if (locker.occupied) {
      if (demoOpenLocker === locker.id) {
        setDemoOpenLocker(null);
      } else {
        setDemoOpenLocker(locker.id);
        playSolenoidSound();
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Station Control Frame & Status Legend */}
      <div className="p-3 rounded bg-canvas-base border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-mono font-medium text-fg">
            {stationName} • 12 Compartments
          </span>
        </div>

        {/* Legend: Red (Locked), Green (Open), Slate (Available) */}
        <div className="flex items-center space-x-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-status-danger" />
            <span className="text-status-danger font-medium">{lockedCount} Locked (Red)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-status-success" />
            <span className="text-status-success font-medium">{openCount} Open (Green)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-border" />
            <span className="text-fg-muted">{vacantCount} Available</span>
          </div>
        </div>
      </div>

      {/* Clean 4-Column Locker Bay (3 rows of 4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {lockerBay.map((locker) => {
          const isGreenOpen = locker.isUnlocked;
          const isRedLocked = locker.isLocked;

          return (
            <button
              key={locker.id}
              type="button"
              onClick={() => handleLockerClick(locker)}
              className={`min-h-[112px] p-3 rounded border text-left flex flex-col justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
                isGreenOpen
                  ? 'bg-status-success-tint border-status-success text-fg'
                  : isRedLocked
                  ? 'bg-status-danger-tint border-status-danger text-fg hover:border-status-danger'
                  : 'bg-canvas-surface border-border text-fg-muted hover:border-border-accent'
              }`}
            >
              {/* Header: Stencil Locker Number + Status Badge */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-sm font-semibold text-fg">
                  {locker.id}
                </span>

                {isGreenOpen ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-success bg-canvas-base border border-status-success px-1.5 py-0.5 rounded">
                    <Unlock className="w-3 h-3 shrink-0" />
                    <span>DOOR OPEN</span>
                  </span>
                ) : isRedLocked ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-danger bg-canvas-base border border-status-danger px-1.5 py-0.5 rounded">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>Locked</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-fg-subtle">
                    Available
                  </span>
                )}
              </div>

              {/* Body: Tracking code or availability */}
              <div className="my-1.5">
                {isGreenOpen ? (
                  <div>
                    <span className="font-mono text-xs font-semibold text-status-success block">
                      Ready for pickup
                    </span>
                    <span className="text-[11px] text-fg-muted truncate block">
                      {locker.parcel?.tracking_code || 'Door unlatched'}
                    </span>
                  </div>
                ) : isRedLocked ? (
                  <div>
                    <span className="font-mono text-xs font-semibold text-fg block truncate">
                      {locker.parcel?.tracking_code}
                    </span>
                    <span className="text-[11px] text-fg-muted truncate block">
                      {locker.parcel?.carrier || 'Package'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-fg-subtle">Empty</span>
                )}
              </div>

              {/* Footer: Size + Prompt */}
              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-border/60">
                <span className="text-fg-subtle font-mono">{locker.size}</span>
                {isRedLocked && (
                  <span className="text-[11px] text-status-danger font-medium">
                    Select →
                  </span>
                )}
                {isGreenOpen && (
                  <span className="text-[11px] text-status-success font-medium">
                    Collect
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer Helper */}
      <div className="flex items-center justify-between text-xs text-fg-muted px-1">
        <span>Click any locked compartment (red) to select it for pickup.</span>
        {demoOpenLocker && (
          <button
            type="button"
            onClick={() => {
              setDemoOpenLocker(null);
              playSolenoidSound();
            }}
            className="text-xs text-status-warning hover:underline font-mono"
          >
            Close door {demoOpenLocker} ↺
          </button>
        )}
      </div>
    </div>
  );
};
