import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Clock, QrCode, Copy, Check, Lock, Smartphone } from 'lucide-react';
import { Parcel } from '../types';

interface DynamicQrCodeProps {
  parcel: Parcel;
  onClose?: () => void;
  onSimulateScan?: (trackingCode: string, token: string) => void;
}

export const DynamicQrCode: React.FC<DynamicQrCodeProps> = ({
  parcel,
  onClose,
  onSimulateScan,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [totpToken, setTotpToken] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Generate deterministic time-stepped TOTP token (RFC 6238 simulation)
  const generateToken = (seed: string) => {
    const epochStep = Math.floor(Date.now() / 30000);
    // Simple fast numeric hash based on tracking code and current 30s epoch
    let hash = 0;
    const combined = `${seed}-${epochStep}-dropsecure-salt`;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash) % 1000000;
    return String(positiveHash).padStart(6, '0');
  };

  useEffect(() => {
    // Initial token
    setTotpToken(generateToken(parcel.tracking_code));

    // Calculate time left in current 30s window
    const now = Date.now();
    const msInWindow = now % 30000;
    const initialRemaining = Math.max(1, Math.ceil((30000 - msInWindow) / 1000));
    setSecondsRemaining(initialRemaining);

    const interval = setInterval(() => {
      const currentNow = Date.now();
      const currentMsInWindow = currentNow % 30000;
      const remaining = Math.max(1, Math.ceil((30000 - currentMsInWindow) / 1000));
      setSecondsRemaining(remaining);

      // Rotate token at boundary
      if (remaining === 30 || remaining === 1) {
        setTotpToken(generateToken(parcel.tracking_code));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [parcel.tracking_code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(totpToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // SVG circular countdown calculations
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (secondsRemaining / 30) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Zero-Trust Dynamic QR</h3>
              <p className="text-xs text-slate-400">Time-Stepped OTP • RFC 6238 Standard</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* QR Code Container with Animated Scanner Line */}
        <div className="my-6 flex flex-col items-center">
          <div className="relative p-5 bg-white rounded-2xl shadow-inner border-4 border-slate-800 overflow-hidden">
            {/* Visual QR Code Generator */}
            <svg
              className="w-48 h-48"
              viewBox="0 0 100 100"
              shapeRendering="crispEdges"
            >
              {/* Corner position markers */}
              <rect x="5" y="5" width="28" height="28" fill="#0f172a" />
              <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
              <rect x="13" y="13" width="12" height="12" fill="#0f172a" />

              <rect x="67" y="5" width="28" height="28" fill="#0f172a" />
              <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
              <rect x="75" y="13" width="12" height="12" fill="#0f172a" />

              <rect x="5" y="67" width="28" height="28" fill="#0f172a" />
              <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
              <rect x="13" y="75" width="12" height="12" fill="#0f172a" />

              {/* Data modules pattern simulation */}
              <rect x="38" y="10" width="8" height="8" fill="#0f172a" />
              <rect x="52" y="14" width="8" height="6" fill="#0f172a" />
              <rect x="42" y="24" width="6" height="8" fill="#0f172a" />
              <rect x="54" y="26" width="6" height="6" fill="#0f172a" />

              <rect x="12" y="38" width="6" height="6" fill="#0f172a" />
              <rect x="22" y="42" width="8" height="6" fill="#0f172a" />
              <rect x="36" y="38" width="28" height="24" fill="#0f172a" rx="2" />
              <rect x="40" y="42" width="20" height="16" fill="#ffffff" rx="1" />
              <text
                x="50"
                y="54"
                textAnchor="middle"
                fontSize="6"
                fontWeight="bold"
                fill="#0f172a"
              >
                SECURE
              </text>

              <rect x="70" y="38" width="6" height="8" fill="#0f172a" />
              <rect x="82" y="44" width="8" height="6" fill="#0f172a" />

              <rect x="38" y="68" width="8" height="6" fill="#0f172a" />
              <rect x="50" y="72" width="8" height="8" fill="#0f172a" />
              <rect x="68" y="68" width="6" height="8" fill="#0f172a" />
              <rect x="80" y="74" width="10" height="6" fill="#0f172a" />
              <rect x="72" y="84" width="8" height="8" fill="#0f172a" />
              <rect x="42" y="84" width="14" height="6" fill="#0f172a" />
            </svg>

            {/* Glowing Laser Scan Bar */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse" />
          </div>

          {/* 30-Second Dynamic Countdown Indicator */}
          <div className="mt-4 flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800">
            {/* SVG Countdown Ring */}
            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke="#334155"
                  strokeWidth="3.5"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  stroke={secondsRemaining <= 5 ? '#ef4444' : '#3b82f6'}
                  strokeWidth="3.5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute text-xs font-mono font-bold text-white">
                {secondsRemaining}s
              </span>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
                Rotating TOTP Token
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-mono font-bold tracking-widest text-emerald-400">
                  {totpToken}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Copy numeric OTP"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Specs Callout */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tracking Code:</span>
            <span className="font-mono font-bold text-blue-300">{parcel.tracking_code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Locker Assignment:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {parcel.locker_number || 'L-04'} ({parcel.locker_size || 'MEDIUM'})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Anti-Replay Security:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> 30-Sec Window
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 flex gap-2">
          {onSimulateScan && (
            <button
              onClick={() => onSimulateScan(parcel.tracking_code, totpToken)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"
            >
              <Smartphone className="h-4 w-4" />
              Simulate Kiosk Scan
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
