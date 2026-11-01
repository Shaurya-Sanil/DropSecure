import React from 'react';
import { Shield, Lock, Unlock, Cpu, Zap, Box, CheckCircle } from 'lucide-react';
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
  campusName = 'Fr. CRCE Bandra Locker Bay',
  stationName = 'Station #1',
  onSelectLocker,
}) => {
  // 12 Compartment definitions
  const lockerBay = Array.from({ length: 12 }, (_, i) => {
    const num = i + 1;
    const id = `L-${num < 10 ? '0' + num : num}`;
    let size: 'S' | 'M' | 'L' = 'S';
    if (num > 4 && num <= 8) size = 'M';
    if (num > 8) size = 'L';

    // Check if occupied by any pending parcel
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
    <div className="bg-slate-900/90 rounded-2xl border border-slate-700/80 p-5 shadow-2xl backdrop-blur-md">
      {/* Locker Bay Header & IoT Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Cpu className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold text-white tracking-wide">
              IoT Smart Locker Grid
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              12 Bay Solenoid
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {campusName} • <span className="text-emerald-400 font-medium">{stationName}</span>
          </p>
        </div>

        {/* Real-time Hardware Telemetry */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px]">AWS IoT Core: LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-slate-400 font-mono text-[11px]">
            <Zap className="h-3 w-3 text-amber-400" />
            Relays: 12V Active
          </div>
        </div>
      </div>

      {/* Door Unlock Banner when active */}
      {isUnlocked && activeLocker && (
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border-2 border-emerald-500/80 shadow-lg shadow-emerald-500/20 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-slate-950">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-200">
                DOOR POPPED OPEN: Compartment {activeLocker}
              </p>
              <p className="text-xs text-emerald-300/80">
                Solenoid latch released. Please collect the parcel and firmly push the door closed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 12-Bay Physical Locker Grid Layout */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
        {lockerBay.map((bay) => {
          return (
            <button
              key={bay.id}
              type="button"
              onClick={() => onSelectLocker && onSelectLocker(bay.id)}
              className={`group relative text-left p-3 rounded-xl transition-all duration-300 border flex flex-col justify-between min-h-[96px] ${
                bay.isUnlocked
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105 ring-2 ring-emerald-400'
                  : bay.isActive
                  ? 'bg-blue-950/70 border-blue-400 shadow-md ring-2 ring-blue-500/50'
                  : bay.occupied
                  ? 'bg-slate-950/90 border-amber-500/40 hover:border-amber-400'
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              {/* Top Row: Compartment ID + LED Indicator */}
              <div className="flex items-center justify-between w-full">
                <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-white">
                  {bay.id}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {bay.size}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      bay.isUnlocked
                        ? 'bg-emerald-400 animate-ping'
                        : bay.occupied
                        ? 'bg-amber-400'
                        : 'bg-emerald-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Middle Door Simulation Graphics */}
              <div className="my-1.5 flex items-center justify-center py-1">
                {bay.isUnlocked ? (
                  <div className="flex flex-col items-center text-emerald-400 animate-bounce">
                    <Unlock className="h-5 w-5" />
                    <span className="text-[10px] font-bold mt-0.5 tracking-wider uppercase">OPEN</span>
                  </div>
                ) : bay.occupied ? (
                  <div className="flex flex-col items-center text-amber-400/90">
                    <Box className="h-5 w-5" />
                    <span className="text-[9px] font-mono text-amber-300/80 truncate max-w-[55px]">
                      {bay.parcel?.tracking_code || 'HOLDING'}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-600 group-hover:text-slate-500">
                    <Lock className="h-4 w-4" />
                    <span className="text-[9px] font-mono mt-0.5">VACANT</span>
                  </div>
                )}
              </div>

              {/* Bottom State Label */}
              <div className="text-[10px] font-mono truncate text-slate-400">
                {bay.isUnlocked ? (
                  <span className="text-emerald-300 font-bold">DISPENSING</span>
                ) : bay.occupied ? (
                  <span className="text-amber-400">
                    {bay.parcel?.recipient_room ? bay.parcel.recipient_room : 'OCCUPIED'}
                  </span>
                ) : (
                  <span className="text-slate-500">READY</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Capacity Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500/50" />
            <span>Available ({lockerBay.filter((b) => !b.occupied).length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Occupied ({lockerBay.filter((b) => b.occupied).length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Dispensing / Open</span>
          </div>
        </div>

        <div className="text-slate-500 font-mono text-[11px]">
          Total Capacity: 12 Compartments (4S / 4M / 4L)
        </div>
      </div>
    </div>
  );
};
