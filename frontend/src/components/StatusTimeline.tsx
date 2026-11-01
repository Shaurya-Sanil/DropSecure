import React from 'react';
import { Check, Clock, AlertTriangle, ShieldCheck, Mail } from 'lucide-react';
import { ParcelStatus } from '../types';

interface StatusTimelineProps {
  status: ParcelStatus;
  createdAt: string;
  hasOtpHash?: boolean;
  collectedAt?: string;
  reminderCount?: number;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({
  status,
  createdAt,
  hasOtpHash = true,
  collectedAt,
  reminderCount = 0,
}) => {
  const isDropped = true;
  const isNotified = hasOtpHash || status === 'COLLECTED';
  const isCollected = status === 'COLLECTED';
  const isExpired = status === 'EXPIRED';

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="py-3">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isCollected
                ? 'bg-emerald-500 w-full'
                : isNotified
                ? 'bg-blue-500 w-1/2'
                : 'bg-emerald-500/20 w-0'
            }`}
          />
        </div>

        {/* Step 1: Dropped */}
        <div className="flex flex-col items-center relative z-10">
          <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-slate-900 shadow-md">
            <Check className="h-4 w-4 stroke-[3]" />
          </div>
          <span className="text-xs font-semibold text-slate-200 mt-2">1. Dropped</span>
          <span className="text-[10px] text-slate-400">{formatDate(createdAt)}</span>
        </div>

        {/* Step 2: Notified */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-slate-900 shadow-md transition-colors ${
              isNotified
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {isNotified ? <Mail className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </div>
          <span className="text-xs font-semibold text-slate-200 mt-2">2. OTP Sent</span>
          <span className="text-[10px] text-slate-400">
            {isNotified ? (reminderCount > 0 ? `${reminderCount} reminder(s)` : 'SNS Delivered') : 'In SQS Queue'}
          </span>
        </div>

        {/* Step 3: Collected / Expired */}
        <div className="flex flex-col items-center relative z-10">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-slate-900 shadow-md transition-colors ${
              isCollected
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : isExpired
                ? 'bg-rose-600 text-white'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            {isCollected ? (
              <ShieldCheck className="h-4 w-4 stroke-[3]" />
            ) : isExpired ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </div>
          <span className="text-xs font-semibold text-slate-200 mt-2">
            {isExpired ? 'Expired' : '3. Collected'}
          </span>
          <span className="text-[10px] text-slate-400">
            {collectedAt ? formatDate(collectedAt) : 'Awaiting Gate Pickup'}
          </span>
        </div>
      </div>
    </div>
  );
};
