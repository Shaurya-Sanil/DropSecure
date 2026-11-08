import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { CONFIG } from '../components/ui/utils';
import { api } from '../services/api';
import { User, Parcel } from '../types';
import { CameraCapture } from '../components/CameraCapture';
import { CheckCircle2, AlertCircle, RefreshCw, Lock, Check } from 'lucide-react';

const CAMPUSES = [
  { id: 'CAMPUS-BANDRA', name: 'Fr. CRCE Bandra' },
  { id: 'CAMPUS-VASHI', name: 'Fr. CRIT Vashi' },
  { id: 'CAMPUS-NERUL', name: 'Agnel Nerul' },
];

const COMMON_CARRIERS = ['Amazon', 'BlueDart', 'Delhivery', 'Swiggy', 'Flipkart', 'DTDC', 'Other'];

export const DeliveryDropoff: React.FC = () => {
  const [recipients, setRecipients] = useState<User[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [campusId, setCampusId] = useState<string>('CAMPUS-BANDRA');
  const [carrier, setCarrier] = useState<string>('Amazon');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successParcel, setSuccessParcel] = useState<Parcel | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Smart Locker Selection State
  const [pendingParcels, setPendingParcels] = useState<Parcel[]>([]);
  const [loadingLockers, setLoadingLockers] = useState<boolean>(false);
  const [selectedLocker, setSelectedLocker] = useState<string>('L-01');
  const [selectedSize, setSelectedSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('SMALL');

  useEffect(() => {
    loadCampusData();
  }, [campusId]);

  const loadCampusData = async () => {
    try {
      setLoadingLockers(true);
      const [recipientsRes, pendingRes] = await Promise.all([
        api.getRecipients(campusId),
        api.getKioskPending(campusId),
      ]);

      setRecipients(recipientsRes.recipients);
      if (recipientsRes.recipients.length > 0) {
        setSelectedRecipientId(recipientsRes.recipients[0].id);
      } else {
        setSelectedRecipientId('');
      }

      const activePending = pendingRes.pendingParcels || [];
      setPendingParcels(activePending);

      // Auto-assign first available locker
      const occupiedSet = new Set(
        activePending.map((p) => (p.locker_number || '').trim().toUpperCase())
      );
      for (let i = 1; i <= 12; i++) {
        const id = `L-${i < 10 ? '0' + i : i}`;
        if (!occupiedSet.has(id)) {
          setSelectedLocker(id);
          setSelectedSize(i <= 4 ? 'SMALL' : i <= 8 ? 'MEDIUM' : 'LARGE');
          break;
        }
      }
    } catch (err) {
      console.error('Failed to load campus data:', err);
    } finally {
      setLoadingLockers(false);
    }
  };

  const occupiedMap = new Map<string, Parcel>();
  pendingParcels.forEach((p) => {
    const key = (p.locker_number || '').trim().toUpperCase();
    occupiedMap.set(key, p);
  });

  const occupiedCount = occupiedMap.size;
  const isBayFull = occupiedCount >= 12;

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      setError('Please select a student recipient.');
      return;
    }
    if (!photoFile) {
      setError('Please take or upload photo proof.');
      return;
    }
    if (isBayFull) {
      setError('Cannot deposit: all 12 compartments at this station are occupied.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Get S3 presigned PUT URL
      const { uploadUrl, imageKey } = await api.getUploadUrl(photoFile.name, photoFile.type);

      // Step 2: Upload direct to S3
      await api.uploadPhotoBinary(uploadUrl, photoFile, photoFile.type);

      // Step 3: Create parcel record & assign selected locker compartment
      const res = await api.createParcel({
        recipientId: selectedRecipientId,
        imageKey,
        carrier,
        campusId,
        lockerNumber: selectedLocker,
        lockerSize: selectedSize,
        packageCondition: 'INTACT',
        notes: notes.trim() || undefined,
      });

      setSuccessParcel(res.parcel);
      setPhotoFile(null);
      setNotes('');
      loadCampusData();
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessParcel(null);
    setError(null);
    loadCampusData();
  };

  return (
    <AppShell
      portalName="Courier Drop-off"
      portalDescription="Register package deliveries and assign smart locker compartments"
    >
      <div className="max-w-2xl mx-auto">
        {successParcel ? (
          <div className="p-8 rounded bg-canvas-surface border border-border text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-status-success-tint border border-status-success text-status-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-fg">Package deposited & locked</h2>
              <p className="text-xs text-fg-muted mt-1">
                Notification sent to recipient with single-use pickup credentials.
              </p>
            </div>

            <div className="p-4 rounded bg-canvas-base border border-border text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Tracking code</span>
                <span className="font-mono font-medium text-fg">{successParcel.tracking_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Assigned compartment</span>
                <span className="font-mono font-bold text-accent">
                  {successParcel.locker_number || selectedLocker} ({successParcel.locker_size || selectedSize})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Carrier</span>
                <span className="text-fg font-medium">{successParcel.carrier}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Compartment Solenoid Status</span>
                <span className="text-status-success font-mono font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Latched & Secured
                </span>
              </div>
            </div>

            <Button onClick={handleReset} className="w-full">
              Deposit next parcel
            </Button>
          </div>
        ) : (
          <form onSubmit={handleDeposit} className="p-6 rounded bg-canvas-surface border border-border space-y-5">
            {error && (
              <div className="p-3 rounded bg-canvas-base border border-status-danger text-status-danger text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Campus Selection */}
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Destination campus</label>
              <select
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
                className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg focus:border-accent focus:outline-none"
              >
                {CAMPUSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Carrier & Recipient */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-fg mb-1">Delivery carrier</label>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg focus:border-accent focus:outline-none"
                >
                  {COMMON_CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-fg mb-1">Recipient student</label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg focus:border-accent focus:outline-none"
                >
                  {recipients.length === 0 ? (
                    <option value="">No students enrolled for this campus</option>
                  ) : (
                    recipients.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.room_number || 'General Campus'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Interactive Smart Locker Compartment Selector */}
            <div className="pt-2 border-t border-border space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-fg">
                    Choose locker compartment
                  </label>
                  <p className="text-[11px] text-fg-muted">
                    Select an open compartment to place this package. Occupied lockers are locked.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-fg-muted block">
                    {occupiedCount} / 12 Occupied
                  </span>
                  <span className={`text-[10px] font-mono font-medium ${isBayFull ? 'text-status-danger' : 'text-status-success'}`}>
                    {isBayFull ? 'Station Full' : `${12 - occupiedCount} Available`}
                  </span>
                </div>
              </div>

              {loadingLockers ? (
                <div className="h-32 rounded bg-canvas-base border border-border flex items-center justify-center text-xs text-fg-muted">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span>Loading live compartment telemetry...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Array.from({ length: 12 }, (_, i) => {
                    const num = i + 1;
                    const id = `L-${num < 10 ? '0' + num : num}`;
                    let sizeLabel = 'Small';
                    let sizeType: 'SMALL' | 'MEDIUM' | 'LARGE' = 'SMALL';
                    if (num > 4 && num <= 8) {
                      sizeLabel = 'Medium';
                      sizeType = 'MEDIUM';
                    }
                    if (num > 8) {
                      sizeLabel = 'Large';
                      sizeType = 'LARGE';
                    }

                    const occupying = occupiedMap.get(id);
                    const isOccupied = Boolean(occupying);
                    const isSelected = selectedLocker === id;

                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => {
                          setSelectedLocker(id);
                          setSelectedSize(sizeType);
                        }}
                        className={`p-2 rounded border text-left flex flex-col justify-between h-20 transition select-none ${
                          isOccupied
                            ? 'bg-status-danger-tint border-status-danger/40 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-accent/15 border-accent text-fg ring-1 ring-accent font-medium'
                            : 'bg-canvas-base border-border hover:border-border-accent text-fg-muted cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-mono text-xs font-semibold text-fg">{id}</span>
                          {isOccupied ? (
                            <span className="text-[10px] text-status-danger flex items-center gap-0.5 font-mono">
                              <Lock className="w-2.5 h-2.5" /> Locked
                            </span>
                          ) : isSelected ? (
                            <span className="text-[10px] text-accent flex items-center gap-0.5 font-mono font-bold">
                              <Check className="w-3 h-3" /> Select
                            </span>
                          ) : (
                            <span className="text-[10px] text-fg-subtle font-mono">Free</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40 font-mono">
                          <span className="text-fg-subtle">{sizeLabel}</span>
                          {isOccupied ? (
                            <span className="text-[9px] text-status-danger truncate max-w-[65px]">
                              {occupying?.tracking_code}
                            </span>
                          ) : (
                            <span className={isSelected ? 'text-accent font-semibold' : 'text-fg-subtle'}>
                              {isSelected ? 'Assigned' : 'Open'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedLocker && !isBayFull && (
                <div className="p-2 rounded bg-canvas-base border border-border flex items-center justify-between text-xs font-mono">
                  <span className="text-fg-muted">Target Compartment:</span>
                  <span className="font-semibold text-accent flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {selectedLocker} ({selectedSize} Box)
                  </span>
                </div>
              )}
            </div>

            {/* Photo Proof */}
            <div className="pt-2 border-t border-border">
              <label className="block text-xs font-medium text-fg mb-1">Photo proof of parcel</label>
              <CameraCapture
                onPhotoSelected={(file: File) => setPhotoFile(file)}
                selectedFile={photoFile}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-fg mb-1">Package notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Cardboard box, envelope"
                className="w-full h-9 bg-canvas-base border border-border rounded px-3 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
              />
            </div>

            {loading && (
              <div className="p-3 rounded bg-canvas-base border border-border text-xs text-fg-muted flex items-center space-x-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
                <span>Uploading directly to storage and assigning compartment {selectedLocker}...</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !photoFile || !selectedRecipientId || isBayFull}
              className="w-full h-11 text-sm font-semibold"
            >
              {loading ? 'Processing deposit...' : `Confirm deposit in ${selectedLocker}`}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
};
