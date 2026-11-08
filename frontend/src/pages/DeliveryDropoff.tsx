import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Button } from '../components/ui/Button';
import { CONFIG } from '../components/ui/utils';
import { api } from '../services/api';
import { User, Parcel } from '../types';
import { CameraCapture } from '../components/CameraCapture';
import { CheckCircle2, AlertCircle, RefreshCw, Truck } from 'lucide-react';

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

  useEffect(() => {
    loadRecipients();
  }, [campusId]);

  const loadRecipients = async () => {
    try {
      const res = await api.getRecipients(campusId);
      setRecipients(res.recipients);
      if (res.recipients.length > 0) {
        setSelectedRecipientId(res.recipients[0].id);
      } else {
        setSelectedRecipientId('');
      }
    } catch (err) {
      console.error('Failed to load recipients:', err);
    }
  };

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

    try {
      setLoading(true);
      setError(null);

      // Step 1: Get S3 presigned PUT URL
      const { uploadUrl, imageKey } = await api.getUploadUrl(photoFile.name, photoFile.type);

      // Step 2: Upload direct to S3
      await api.uploadPhotoBinary(uploadUrl, photoFile, photoFile.type);

      // Step 3: Create parcel record & enqueue notification
      const res = await api.createParcel({
        recipientId: selectedRecipientId,
        imageKey,
        carrier,
        campusId,
        lockerSize: 'MEDIUM',
        packageCondition: 'INTACT',
        notes: notes.trim() || undefined,
      });

      setSuccessParcel(res.parcel);
      setPhotoFile(null);
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessParcel(null);
    setError(null);
  };

  return (
    <AppShell
      portalName="Courier Drop-off"
      portalDescription="Register package deliveries and capture photo proof"
    >
      <div className="max-w-xl mx-auto">
        {successParcel ? (
          <div className="p-8 rounded bg-canvas-surface border border-border text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-status-success-tint border border-status-success text-status-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-fg">Package deposited</h2>
              <p className="text-xs text-fg-muted mt-1">
                Notification queued for recipient. Stored in simulated locker compartment.
              </p>
            </div>

            <div className="p-4 rounded bg-canvas-base border border-border text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Tracking code</span>
                <span className="font-mono font-medium text-fg">{successParcel.tracking_code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border">
                <span className="text-fg-muted">Assigned compartment</span>
                <span className="font-mono font-medium text-fg">
                  {successParcel.locker_number || 'L-01'} (Simulated)
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-fg-muted">Carrier</span>
                <span className="text-fg font-medium">{successParcel.carrier}</span>
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

            <div>
              <label className="block text-xs font-medium text-fg mb-1">Campus location</label>
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

            <div>
              <label className="block text-xs font-medium text-fg mb-1">Photo proof of parcel</label>
              <CameraCapture
                onPhotoSelected={(file: File) => setPhotoFile(file)}
                selectedFile={photoFile}
              />
            </div>

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
                <span>Uploading directly to storage and registering parcel...</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !photoFile || !selectedRecipientId}
              className="w-full h-11 text-sm font-semibold"
            >
              {loading ? 'Processing deposit...' : 'Confirm package deposit'}
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
};
