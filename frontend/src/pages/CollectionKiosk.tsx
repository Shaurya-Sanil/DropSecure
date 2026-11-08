import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { CONFIG } from '../components/ui/utils';
import { api } from '../services/api';
import { Parcel } from '../types';
import { Search, AlertCircle, CheckCircle2, RefreshCw, KeyRound, Lock, Unlock } from 'lucide-react';
import { SmartLockerGrid } from '../components/SmartLockerGrid';

const KIOSK_CAMPUSES = [
  { id: 'CAMPUS-BANDRA', name: 'Fr. CRCE Bandra', station: 'Main Gate Station' },
  { id: 'CAMPUS-VASHI', name: 'Fr. CRIT Vashi', station: 'Reception Terminal' },
  { id: 'CAMPUS-NERUL', name: 'Agnel Nerul', station: 'Library Drop Station' },
];

export const CollectionKiosk: React.FC = () => {
  const [selectedCampusId, setSelectedCampusId] = useState<string>('CAMPUS-BANDRA');
  const [trackingCode, setTrackingCode] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [activeParcel, setActiveParcel] = useState<Parcel | null>(null);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedParcel, setVerifiedParcel] = useState<Parcel | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [pendingList, setPendingList] = useState<Parcel[]>([]);

  const currentCampus = KIOSK_CAMPUSES.find((c) => c.id === selectedCampusId) || KIOSK_CAMPUSES[0];

  useEffect(() => {
    loadPending();

    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('code');
    const otpParam = urlParams.get('otp');
    if (codeParam) {
      setTrackingCode(codeParam);
      if (otpParam) {
        setOtp(otpParam);
      }
      lookupParcel(codeParam);
    }
  }, [selectedCampusId]);

  const loadPending = async () => {
    try {
      const res = await api.getKioskPending(selectedCampusId);
      setPendingList(res.pendingParcels);
    } catch (err) {
      console.error('Error fetching pending parcels:', err);
    }
  };

  const lookupParcel = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    try {
      setLoadingSearch(true);
      setError(null);
      const res = await api.lookupParcel(codeToSearch.trim());
      setActiveParcel(res.parcel);
    } catch (err: any) {
      setError(err.message || 'Tracking ID not found');
      setActiveParcel(null);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingCode || otp.length !== 6) return;

    try {
      setVerifying(true);
      setError(null);
      const res = await api.verifyOtp({
        trackingCode,
        otp,
      });

      setVerifiedParcel(res.parcel);
      setActiveParcel(null);
      setOtp('');
      loadPending();
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
      if (err.attemptsRemaining !== undefined) {
        setAttemptsRemaining(err.attemptsRemaining);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setVerifiedParcel(null);
    setActiveParcel(null);
    setTrackingCode('');
    setOtp('');
    setError(null);
    setAttemptsRemaining(null);
  };

  return (
    <AppShell
      portalName="Collection Kiosk"
      portalDescription="Walk-up automated self-service pickup terminal"
      primaryAction={
        <div className="flex items-center space-x-1 border border-border rounded bg-canvas-base p-1 text-xs">
          {KIOSK_CAMPUSES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCampusId(c.id);
                handleReset();
              }}
              className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                selectedCampusId === c.id
                  ? 'bg-canvas-raised text-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Verification Success View */}
        {verifiedParcel ? (
          <div className="p-8 rounded bg-canvas-surface border border-border text-center space-y-5">
            <div className="h-12 w-12 rounded-full bg-status-success-tint border border-status-success text-status-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-fg">Verification successful</h2>
              <p className="text-xs text-fg-muted mt-1">
                Locker door has unlatched. Please collect your parcel and close the door.
              </p>
            </div>

            <div className="p-4 rounded bg-canvas-base border border-border text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Tracking Code</span>
                <span className="font-mono font-medium text-fg">{verifiedParcel.tracking_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Compartment</span>
                <span className="font-mono font-medium text-fg">
                  {verifiedParcel.locker_number || 'L-01'} (Simulated Hardware)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Status in Database</span>
                <StatusBadge status="COLLECTED" />
              </div>
            </div>

            <Button onClick={handleReset} className="w-full">
              Finish and reset kiosk
            </Button>
          </div>
        ) : (
          /* Step 1: Input Tracking ID & OTP */
          <div className="p-6 rounded bg-canvas-surface border border-border space-y-6">
            <div>
              <label className="block text-xs font-medium text-fg mb-1">
                1. Enter parcel tracking code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. DS-4829-X"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  className="flex-1 h-12 bg-canvas-base border border-border rounded px-4 text-sm font-mono uppercase text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => lookupParcel(trackingCode)}
                  disabled={loadingSearch || !trackingCode.trim()}
                  className="h-12 px-5 min-w-[48px]"
                >
                  {loadingSearch ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Find'}
                </Button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded bg-canvas-base border border-status-danger text-status-danger text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                {attemptsRemaining !== null && (
                  <span className="font-mono font-medium tabular-nums">
                    {attemptsRemaining} attempts left
                  </span>
                )}
              </div>
            )}

            {/* Step 2: OTP Entry Pad (Prominent, High-Contrast) */}
            {activeParcel && (
              <form onSubmit={handleVerifyOtp} className="pt-4 border-t border-border space-y-4">
                <div className="p-3 rounded bg-canvas-base border border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-fg-muted">Recipient: </span>
                    <span className="font-medium text-fg">{activeParcel.recipient_name}</span>
                  </div>
                  <div>
                    <span className="text-fg-muted">Locker: </span>
                    <span className="font-mono text-fg font-medium">
                      {activeParcel.locker_number || 'L-01'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-fg">
                      2. Enter 6-digit collection OTP
                    </label>
                    <span className="text-[11px] text-fg-subtle">Sent via email / SMS</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-16 bg-canvas-base border-2 border-border focus:border-accent rounded text-center text-3xl font-mono tracking-[0.4em] text-fg tabular-nums focus:outline-none placeholder:text-fg-subtle"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="w-full h-12 text-sm font-semibold min-w-[48px]"
                >
                  {verifying ? 'Verifying OTP...' : 'Release locker door'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Simulated Locker Visualizer */}
        <div className="p-4 rounded bg-canvas-surface border border-border">
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-medium text-fg">Simulated Locker Bay</span>
            <span className="text-[11px] font-mono text-fg-subtle">
              12 Compartments • {currentCampus.station}
            </span>
          </div>
          <SmartLockerGrid
            activeLocker={activeParcel?.locker_number}
            parcels={pendingList}
            campusName={currentCampus.name}
            stationName={currentCampus.station}
            onSelectLocker={(num) => {
              const matched = pendingList.find((p) => p.locker_number === num);
              if (matched) {
                setTrackingCode(matched.tracking_code);
                lookupParcel(matched.tracking_code);
              }
            }}
          />
        </div>
      </div>
    </AppShell>
  );
};
