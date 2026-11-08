import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Package, CheckCircle2, Volume2, Sparkles } from 'lucide-react';
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

  // Play realistic mechanical solenoid unlatch sound
  const playSolenoidSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Solenoid high impulse click + mechanical clack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio playback fails silently if browser policy blocks autoplay before interaction
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
    let size: 'S' | 'M' | 'L' = 'S';
    if (num > 4 && num <= 8) size = 'M';
    if (num > 8) size = 'L';

    const occupyingParcel = parcels.find(
      (p) => p.status === 'PENDING' && (p.locker_number === id || p.locker_number === `Locker ${num}`)
    );

    const isSystemActive = activeLocker === id || activeLocker === `Locker ${num}`;
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
    // If it is occupied, allow toggling demo door unlatch for inspection
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
          <div className="h-2 w-2 rounded-full bg-status-online shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
          <span className="font-mono font-medium text-fg uppercase tracking-wider">
            {stationName} • 12-Bay Intelligent Solenoid Terminal
          </span>
        </div>

        {/* Legend Indicators: Red (Locked), Green (Open), Slate (Vacant) */}
        <div className="flex items-center space-x-4 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse" />
            <span className="text-red-400 font-semibold">{lockedCount} Locked (Red)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span className="text-emerald-300 font-semibold">{openCount} Open (Green)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span className="text-fg-subtle">{vacantCount} Vacant</span>
          </div>
        </div>
      </div>

      {/* Industrial Locker Chassis Grid */}
      <div className="p-3 sm:p-4 rounded-lg bg-zinc-950 border-2 border-zinc-800 shadow-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {lockerBay.map((locker) => {
            const isGreenOpen = locker.isUnlocked;
            const isRedLocked = locker.isLocked;

            return (
              <div
                key={locker.id}
                onClick={() => handleLockerClick(locker)}
                className={`relative rounded-md border text-left transition-all duration-300 select-none cursor-pointer overflow-hidden flex flex-col justify-between h-36 p-2.5 ${
                  isGreenOpen
                    ? 'border-emerald-500 bg-gradient-to-b from-zinc-950 via-emerald-950/40 to-zinc-950 shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                    : isRedLocked
                    ? 'border-red-500/80 bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-950 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:border-red-400'
                    : 'border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 hover:border-zinc-700 opacity-90'
                }`}
              >
                {/* Visual Top Door Hinges & Ventilation Louvers */}
                <div className="w-full flex items-center justify-between pb-1 border-b border-white/5">
                  <div className="flex space-x-1">
                    <span className="h-1 w-2.5 bg-zinc-700 rounded-sm" />
                    <span className="h-1 w-2.5 bg-zinc-700 rounded-sm" />
                  </div>
                  {/* Ventilation Slats stamped into the steel door */}
                  <div className="flex space-x-1">
                    <span className="h-0.5 w-2.5 bg-zinc-700 rounded-full" />
                    <span className="h-0.5 w-2.5 bg-zinc-700 rounded-full" />
                    <span className="h-0.5 w-2.5 bg-zinc-700 rounded-full" />
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 font-semibold">{locker.size}</span>
                </div>

                {/* Main Compartment Body */}
                {isGreenOpen ? (
                  /* ======================================================== */
                  /* STATE: OPEN / UNLOCKED DOOR (GREEN)                     */
                  /* Door swung open, illuminated interior cavity with parcel */
                  /* ======================================================== */
                  <div className="relative flex-1 flex flex-col justify-between py-1">
                    {/* Overhead Green LED Spotlight */}
                    <div className="w-10 h-1 mx-auto bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.9)]" />

                    {/* Realistic 3D Swung Door Panel (Perspective Ajar) */}
                    <div
                      className="absolute inset-y-0 left-0 w-full pointer-events-none transition-transform duration-500 ease-out z-10"
                      style={{
                        transform: 'perspective(300px) rotateY(-65deg)',
                        transformOrigin: 'left center',
                        background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                        boxShadow: '4px 0 10px rgba(0,0,0,0.8), inset -1px 0 0 rgba(255,255,255,0.1)',
                        borderRight: '2px solid #10b981',
                      }}
                    >
                      <div className="p-1 h-full flex flex-col justify-between opacity-80">
                        <span className="font-mono text-[9px] font-bold text-zinc-300">{locker.id}</span>
                        <div className="w-1 h-5 bg-zinc-400 rounded-full" />
                      </div>
                    </div>

                    {/* Compartment Interior with Delivery Package Waiting */}
                    <div className="my-auto flex flex-col items-center justify-center">
                      <div className="w-12 h-9 bg-amber-900/90 border border-amber-600/70 rounded relative shadow-inner flex flex-col items-center justify-center">
                        {/* Box packing tape */}
                        <div className="w-full h-1.5 bg-amber-700 border-y border-amber-950/40" />
                        {/* Shipping barcode snippet */}
                        <div className="absolute top-0.5 left-1 w-3 h-2 bg-white/95 rounded-[1px] p-0.5 flex flex-col justify-between">
                          <div className="h-px w-full bg-black" />
                          <div className="h-px w-2/3 bg-black" />
                        </div>
                        <span className="text-[7px] font-mono font-bold text-amber-200 mt-0.5">
                          {locker.parcel?.carrier || 'PARCEL'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-emerald-400 mt-1 flex items-center gap-0.5">
                        <Unlock className="w-2.5 h-2.5" /> DOOR OPEN
                      </span>
                    </div>

                    {/* Green Solenoid Status Pill */}
                    <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-emerald-900/40">
                      <span className="font-bold text-emerald-300">{locker.id}</span>
                      <span className="text-emerald-400 font-semibold">RETRIEVE</span>
                    </div>
                  </div>
                ) : isRedLocked ? (
                  /* ======================================================== */
                  /* STATE: LOCKED COMPARTMENT (RED)                          */
                  /* Solid closed metal door, red status LED, latch locked   */
                  /* ======================================================== */
                  <div className="relative flex-1 flex flex-col justify-between py-1">
                    {/* Stencil ID and Locked Indicator */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-fg tracking-wide">{locker.id}</span>
                      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/50 text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,1)]" />
                        <Lock className="h-2.5 w-2.5" />
                        <span className="text-[9px] font-mono font-bold">LOCKED</span>
                      </div>
                    </div>

                    {/* Stored Package Tracking Pill */}
                    <div className="my-1">
                      <div className="bg-red-950/40 border border-red-500/30 px-1.5 py-0.5 rounded text-[10px] font-mono text-red-300 truncate">
                        {locker.parcel?.tracking_code || 'OCCUPIED'}
                      </div>
                    </div>

                    {/* Stainless Steel Vertical Door Handle */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 rounded-full bg-gradient-to-r from-zinc-500 to-zinc-700 shadow border-l border-zinc-400/40" />

                    {/* Footer Prompt */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-white/5">
                      <span>{locker.parcel?.carrier || 'Package'}</span>
                      <span className="text-red-400 hover:underline">Tap to enter OTP →</span>
                    </div>
                  </div>
                ) : (
                  /* ======================================================== */
                  /* STATE: VACANT / AVAILABLE (SLATE)                        */
                  /* Clean metal door, subtle gray LED, vacant status         */
                  /* ======================================================== */
                  <div className="relative flex-1 flex flex-col justify-between py-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-bold text-zinc-400">{locker.id}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                    </div>

                    <div className="text-center py-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Available
                      </span>
                    </div>

                    {/* Handle */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-10 rounded-full bg-zinc-700 border-l border-zinc-600" />

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                      <span>Ready</span>
                      <span>Empty</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Helper Banner */}
      <div className="flex items-center justify-between text-xs text-fg-muted px-1">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          Click any locked compartment (red) to auto-fill its tracking code or test door latch release.
        </span>
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
