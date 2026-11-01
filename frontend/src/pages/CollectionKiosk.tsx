import React, { useState, useEffect } from 'react';
import { Package, Search, AlertCircle, CheckCircle2, Lock, KeyRound, Building, Clock, RefreshCw, Sparkles, Image, ArrowRight, Cpu, Unlock, Zap } from 'lucide-react';
import { api } from '../services/api';
import { Parcel } from '../types';
import { SmartLockerGrid } from '../components/SmartLockerGrid';

interface CollectionKioskProps {
  initialTrackingCode?: string;
  onVerified?: () => void;
}

const KIOSK_CAMPUSES = [
  { id: 'CAMPUS-BANDRA', name: 'Fr. CRCE Bandra', station: 'Station #1 (Main Gate)' },
  { id: 'CAMPUS-VASHI', name: 'Fr. CRIT Vashi', station: 'Station #2 (Tech Hub)' },
  { id: 'CAMPUS-NERUL', name: 'Agnel Nerul', station: 'Station #3 (Library Hub)' },
];

export const CollectionKiosk: React.FC<CollectionKioskProps> = ({ initialTrackingCode, onVerified }) => {
  const [selectedCampusId, setSelectedCampusId] = useState<string>('CAMPUS-BANDRA');
  const [trackingCode, setTrackingCode] = useState<string>(initialTrackingCode || '');
  const [otp, setOtp] = useState<string>('');
  const [activeParcel, setActiveParcel] = useState<Parcel | null>(null);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedParcel, setVerifiedParcel] = useState<Parcel | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [pendingList, setPendingList] = useState<Parcel[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(true);

  const currentCampus = KIOSK_CAMPUSES.find((c) => c.id === selectedCampusId) || KIOSK_CAMPUSES[0];

  useEffect(() => {
    fetchPendingParcels(selectedCampusId);

    // Parse URL search parameters (e.g. from Dynamic QR scan: /kiosk?code=DS-5076-W&otp=942534&auto=true)
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code') || initialTrackingCode;
    const otpParam = urlParams.get('otp');
    const autoParam = urlParams.get('auto') === 'true';

    if (codeParam) {
      setTrackingCode(codeParam);
      if (otpParam) {
        setOtp(otpParam);
        if (autoParam) {
          executeAutoScanVerify(codeParam, otpParam);
          return;
        }
      }
      handleLookup(codeParam);
    }
  }, [initialTrackingCode, selectedCampusId]);

  const executeAutoScanVerify = async (code: string, otpCode: string) => {
    try {
      setVerifying(true);
      setError(null);
      const res = await api.verifyOtp({
        trackingCode: code,
        otp: otpCode,
      });
      setVerifiedParcel(res.parcel);
      setActiveParcel(null);
      setOtp('');
      fetchPendingParcels(selectedCampusId);
      if (onVerified) {
        onVerified();
      }
    } catch (err: any) {
      setError(err.message || 'Automated QR scan verification failed.');
      handleLookup(code);
    } finally {
      setVerifying(false);
    }
  };

  const fetchPendingParcels = async (campusId?: string) => {
    try {
      setLoadingPending(true);
      const res = await api.getKioskPending(campusId || selectedCampusId);
      setPendingList(res.pendingParcels);
    } catch (err) {
      console.error('Error fetching kiosk pending parcels:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleLookup = async (codeToSearch?: string) => {
    const code = (codeToSearch || trackingCode).trim();
    if (!code) {
      setError('Please enter a tracking code (e.g., DS-6594-O).');
      return;
    }

    try {
      setLoadingSearch(true);
      setError(null);
      setVerifiedParcel(null);
      setOtp('');

      const res = await api.lookupParcel(code);
      const found = res.parcel;

      if (found.status !== 'PENDING') {
        setError(`Parcel ${found.tracking_code} was already ${found.status}.`);
        setActiveParcel(found);
        return;
      }

      setActiveParcel(found);
      setAttemptsRemaining(Math.max(0, 5 - (found.otp_attempts || 0)));
    } catch (err: any) {
      setError(err.message || `No parcel found matching "${code}"`);
      setActiveParcel(null);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParcel) return;

    if (!otp || otp.length !== 6) {
      setError('Please enter your complete 6-digit OTP.');
      return;
    }

    try {
      setVerifying(true);
      setError(null);

      const res = await api.verifyOtp({
        parcelId: activeParcel.id,
        trackingCode: activeParcel.tracking_code,
        otp,
      });

      setVerifiedParcel(res.parcel);
      setActiveParcel(null);
      setOtp('');
      fetchPendingParcels(selectedCampusId);
      if (onVerified) {
        onVerified();
      }
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
      if (err.message && err.message.includes('attempt(s) remaining')) {
        const match = err.message.match(/(\d+)\s+attempt/);
        if (match) {
          setAttemptsRemaining(parseInt(match[1], 10));
        }
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResetKiosk = () => {
    setActiveParcel(null);
    setVerifiedParcel(null);
    setTrackingCode('');
    setOtp('');
    setError(null);
    fetchPendingParcels(selectedCampusId);
  };

  const handleSelectLockerBay = (lockerNum: string) => {
    const found = pendingList.find((p) => p.locker_number === lockerNum);
    if (found) {
      setTrackingCode(found.tracking_code);
      handleLookup(found.tracking_code);
    }
  };

  // State: Verification Success Screen
  if (verifiedParcel) {
    const lockerBayNum = verifiedParcel.locker_number || activeParcel?.locker_number || 'L-04';
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 text-center border border-emerald-500/30 shadow-2xl shadow-emerald-950/40">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-500/10">
            <Unlock className="h-10 w-10 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Solenoid Released: Locker Popped Open!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Trust identity verification confirmed • Status marked{' '}
            <span className="text-emerald-400 font-semibold uppercase">COLLECTED</span> in RDS
          </p>

          {/* Interactive Hardware Visualizer in Unlocked State */}
          <div className="my-6">
            <SmartLockerGrid
              activeLocker={lockerBayNum}
              isUnlocked={true}
              parcels={pendingList}
              campusName={currentCampus.name}
              stationName={currentCampus.station}
            />
          </div>

          <div className="bg-slate-950 rounded-2xl p-5 my-6 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">Tracking Code</span>
              <span className="text-lg font-mono font-bold text-brand-400">{verifiedParcel.tracking_code}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Locker Compartment</span>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {lockerBayNum} ({verifiedParcel.locker_size || 'MEDIUM'})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Carrier</span>
              <span className="font-semibold text-white px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {verifiedParcel.carrier || 'Courier'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Collected At</span>
              <span className="text-slate-300 font-mono">
                {new Date(verifiedParcel.collected_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            {verifiedParcel.imageUrl && (
              <div className="pt-2">
                <span className="text-xs text-slate-400 block mb-2">Delivery Photo Proof:</span>
                <img
                  src={verifiedParcel.imageUrl}
                  alt="Delivery Proof"
                  className="w-full h-44 object-cover rounded-xl border border-slate-800"
                />
              </div>
            )}
          </div>

          <button
            onClick={handleResetKiosk}
            className="w-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold py-3.5 px-6 rounded-2xl transition duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20 active:scale-[0.99]"
          >
            <Package className="h-5 w-5" />
            <span>Finish & Close Locker Door</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Kiosk Header */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-brand-400 mb-2">
          <Building className="h-3.5 w-3.5" />
          <span>Self-Service Smart Locker Terminal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Package Collection Kiosk</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Select campus station, enter your tracking code & OTP, and claim your parcel from the smart locker bay.
        </p>
      </div>

      {/* Campus Terminal Switcher */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 max-w-2xl mx-auto">
        {KIOSK_CAMPUSES.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCampusId(c.id);
              setActiveParcel(null);
            }}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition ${
              selectedCampusId === c.id
                ? 'bg-brand-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Member 2 IoT Smart Locker Hardware Visualizer */}
      <SmartLockerGrid
        activeLocker={activeParcel?.locker_number}
        parcels={pendingList}
        campusName={currentCampus.name}
        stationName={currentCampus.station}
        onSelectLocker={handleSelectLockerBay}
      />

      {error && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Kiosk Area */}
      <div className="max-w-xl mx-auto space-y-5">
        {/* Step 1: Tracking ID Lookup */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Enter Parcel Tracking ID
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="e.g. DS-6594-O"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-sm font-mono font-bold tracking-wider text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 uppercase"
              />
            </div>
            <button
              type="button"
              onClick={() => handleLookup()}
              disabled={loadingSearch || !trackingCode.trim()}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-5 py-3 rounded-2xl text-xs transition border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 shrink-0"
            >
              {loadingSearch ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Lookup</span>}
            </button>
          </div>
        </div>

        {/* Step 2: Active Parcel Details & OTP Entry (Revealed when parcel found) */}
        {activeParcel && (
          <div className="bg-slate-900/90 border border-brand-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl shadow-brand-500/10 animate-in fade-in duration-300">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-brand-400 uppercase tracking-wider">Package Verified</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{activeParcel.recipient_name}</h3>
                <p className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                  <Building className="h-3.5 w-3.5 text-slate-500" />
                  <span>{activeParcel.recipient_room || 'Campus Hostel'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-xs font-semibold">
                  {activeParcel.carrier || 'Courier'}
                </span>
                <p className="text-[11px] text-slate-400 font-mono mt-1">{activeParcel.tracking_code}</p>
              </div>
            </div>

            {activeParcel.imageUrl && (
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5">Delivery Photo Proof:</span>
                <img
                  src={activeParcel.imageUrl}
                  alt="Package proof"
                  className="w-full h-36 object-cover rounded-xl border border-slate-800"
                />
              </div>
            )}

            {/* Smart Locker Compartment Callout */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
              <span className="text-slate-400">Assigned Smart Locker:</span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                Compartment {activeParcel.locker_number || 'L-04'} ({activeParcel.locker_size || 'MEDIUM'})
              </span>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleVerify} className="space-y-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <KeyRound className="h-4 w-4 text-brand-400" />
                    <span>2. Enter 6-Digit Pickup OTP</span>
                  </label>
                  {attemptsRemaining !== null && (
                    <span className="text-[11px] text-amber-400 font-medium">
                      {attemptsRemaining} attempts left
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border-2 border-slate-700 focus:border-brand-500 rounded-2xl py-3.5 text-center text-2xl font-mono font-bold tracking-[0.5em] text-white focus:outline-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Sent via email/SMS to {activeParcel.recipient_name}
                </p>
              </div>

              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-center space-x-2 shadow-xl ${
                  verifying || otp.length !== 6
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-brand-500/20 active:scale-[0.99]'
                }`}
              >
                {verifying ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Verifying Cryptographic Hash...</span>
                  </>
                ) : (
                  <>
                    <span>Verify OTP & Collect Package</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Quick Kiosk Pending Queue (Tap to pick) */}
        {!activeParcel && (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Package className="h-3.5 w-3.5 text-brand-400" />
                <span>Currently Awaiting Collection at Station</span>
              </span>
              <button
                onClick={() => fetchPendingParcels(selectedCampusId)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center space-x-1"
              >
                <RefreshCw className={`h-3 w-3 ${loadingPending ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingPending ? (
              <div className="h-24 flex items-center justify-center text-xs text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span>Checking collection station inventory...</span>
              </div>
            ) : pendingList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No pending parcels awaiting pickup.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setTrackingCode(p.tracking_code);
                      handleLookup(p.tracking_code);
                    }}
                    className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/70 hover:border-brand-500/40 cursor-pointer transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-brand-400">{p.tracking_code}</span>
                      <p className="text-slate-300 font-medium mt-0.5">{p.recipient_name} ({p.recipient_room || 'Hostel'})</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300">
                        {p.carrier || 'Courier'}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1">Tap to select</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
