import React, { useState, useEffect } from 'react';
import { Package, Search, CheckCircle2, AlertCircle, ArrowRight, Truck, RefreshCw, FileText, Sparkles, Building, UserCheck, ScanLine, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { User as UserType, Parcel } from '../types';
import { CameraCapture } from '../components/CameraCapture';
import { LabelScanner } from '../components/LabelScanner';

interface DeliveryDropoffProps {
  onSuccessDrop?: (parcel: Parcel) => void;
}

const CARRIER_PRESETS = [
  { name: 'Amazon', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { name: 'BlueDart', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { name: 'Delhivery', color: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  { name: 'Swiggy', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { name: 'Flipkart', color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  { name: 'DTDC', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { name: 'Other', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
];

const CAMPUSES = [
  { id: 'CAMPUS-BANDRA', name: 'Fr. CRCE Bandra', station: 'Station #1', tag: 'Main Campus' },
  { id: 'CAMPUS-VASHI', name: 'Fr. CRIT Vashi', station: 'Station #2', tag: 'Agnel Tech' },
  { id: 'CAMPUS-NERUL', name: 'Agnel Nerul', station: 'Station #3', tag: 'Polytechnic & Research' },
];

export const DeliveryDropoff: React.FC<DeliveryDropoffProps> = ({ onSuccessDrop }) => {
  const [recipients, setRecipients] = useState<UserType[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [campusId, setCampusId] = useState<string>('CAMPUS-BANDRA');
  const [lockerSize, setLockerSize] = useState<'SMALL' | 'MEDIUM' | 'LARGE'>('MEDIUM');
  const [packageCondition, setPackageCondition] = useState<'INTACT' | 'SLIGHT_DAMAGE' | 'HEAVILY_DAMAGED'>('INTACT');
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [carrier, setCarrier] = useState<string>('Amazon');
  const [customCarrier, setCustomCarrier] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingRecipients, setLoadingRecipients] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successParcel, setSuccessParcel] = useState<Parcel | null>(null);

  useEffect(() => {
    fetchRecipients();
  }, []);

  const fetchRecipients = async () => {
    try {
      setLoadingRecipients(true);
      const res = await api.getRecipients();
      setRecipients(res.recipients);
      const inCurrentCampus = res.recipients.filter((r) => r.campus_id === campusId);
      if (inCurrentCampus.length > 0) {
        setSelectedRecipientId(inCurrentCampus[0].id);
      } else if (res.recipients.length > 0) {
        setSelectedRecipientId(res.recipients[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load campus student directory');
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCampusChange = (newCampusId: string) => {
    setCampusId(newCampusId);
    const campusStudents = recipients.filter((r) => r.campus_id === newCampusId);
    if (campusStudents.length > 0) {
      const stillValid = campusStudents.some((r) => r.id === selectedRecipientId);
      if (!stillValid) {
        setSelectedRecipientId(campusStudents[0].id);
      }
    } else {
      setSelectedRecipientId('');
    }
  };

  const filteredRecipients = recipients.filter((r) => {
    const matchesCampus = !campusId || r.campus_id === campusId;
    if (!matchesCampus) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
      (r.room_number && r.room_number.toLowerCase().includes(q)) ||
      r.email.toLowerCase().includes(q)
    );
  });

  const selectedRecipient = recipients.find((r) => r.id === selectedRecipientId);
  const activeCarrierName = carrier === 'Other' ? (customCarrier.trim() || 'Courier') : carrier;

  const handleSelectRecipient = (id: string) => {
    setSelectedRecipientId(id);
    const rec = recipients.find((r) => r.id === id);
    if (rec?.campus_id) {
      setCampusId(rec.campus_id);
    }
  };

  const handleApplyScan = (scanned: any) => {
    if (scanned.recipientId) {
      setSelectedRecipientId(scanned.recipientId);
    }
    if (scanned.carrier) {
      const match = CARRIER_PRESETS.find((c) => c.name.toLowerCase() === scanned.carrier.toLowerCase());
      if (match) {
        setCarrier(match.name);
      } else {
        setCarrier('Other');
        setCustomCarrier(scanned.carrier);
      }
    }
    if (scanned.campusId) {
      setCampusId(scanned.campusId);
    }
    if (scanned.lockerSize) {
      setLockerSize(scanned.lockerSize);
    }
    if (scanned.condition) {
      setPackageCondition(scanned.condition);
    }
    setNotes(`[SCAN: ${scanned.trackingId}] Condition: ${scanned.condition}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      setError('Please select a recipient student.');
      return;
    }
    if (!photoFile) {
      setError('Please capture or select a photo proof of the package.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Request Presigned S3 PUT URL from API (Zero login needed for courier!)
      const { uploadUrl, imageKey } = await api.getUploadUrl(
        photoFile.name || 'proof.jpg',
        photoFile.type || 'image/jpeg'
      );

      // Step 2: Direct Binary Upload to S3 (Saves server bandwidth!)
      await api.uploadPhotoBinary(uploadUrl, photoFile, photoFile.type || 'image/jpeg');

      // Step 3: Register parcel record & enqueue to SQS
      const res = await api.createParcel({
        recipientId: selectedRecipientId,
        imageKey,
        carrier: activeCarrierName,
        campusId,
        lockerSize,
        packageCondition,
        notes: notes.trim() || undefined,
      });

      setSuccessParcel(res.parcel);
      if (onSuccessDrop) {
        onSuccessDrop(res.parcel);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register parcel drop-off');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessParcel(null);
    setPhotoFile(null);
    setNotes('');
    setSearchQuery('');
    setError(null);
  };

  if (successParcel) {
    const assignedCampus = CAMPUSES.find((c) => c.id === (successParcel.campus_id || campusId));
    return (
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 text-center border border-emerald-500/30 shadow-2xl shadow-emerald-950/40">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-500/10">
            <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white">Package Deposited Successfully!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Photo stored in Amazon S3 • 6-Digit Verification OTP sent to recipient
          </p>

          <div className="bg-slate-950 rounded-2xl p-5 my-6 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">Tracking Code</span>
              <span className="text-lg font-mono font-bold text-brand-400">{successParcel.tracking_code}</span>
            </div>

            {/* Smart Locker Bay Allocation */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">Smart Locker Assigned</span>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {successParcel.locker_number || 'L-04'} ({successParcel.locker_size || lockerSize})
              </span>
            </div>

            {/* Destination Campus Station */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs text-slate-400">Destination Campus</span>
              <span className="font-semibold text-xs text-slate-200">
                {assignedCampus?.name || 'Fr. CRCE Bandra'} ({assignedCampus?.station || 'Station #1'})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Carrier</span>
              <span className="font-semibold text-white px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
                {successParcel.carrier || activeCarrierName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-800">
              <span className="text-slate-400">Recipient Student</span>
              <span className="font-medium text-slate-200">
                {selectedRecipient?.name} ({selectedRecipient?.roomNumber || 'Hostel'})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Deposit Time</span>
              <span className="text-slate-300 font-mono">
                {new Date(successParcel.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 text-xs text-emerald-300 mb-6 flex items-start space-x-2 text-left">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>
              The recipient will receive their secure 6-digit collection OTP. The package is safely locked in compartment{' '}
              <strong className="text-white">{successParcel.locker_number || 'L-04'}</strong> awaiting pickup.
            </span>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold py-3.5 px-6 rounded-2xl transition duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/20 active:scale-[0.99]"
          >
            <Package className="h-5 w-5" />
            <span>Drop Off Another Package</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
      {/* AI Label Scanner Modal */}
      {showScannerModal && (
        <LabelScanner
          recipients={recipients}
          onApplyScan={handleApplyScan}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Mobile-friendly Header */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-brand-400 mb-2">
            <Truck className="h-3.5 w-3.5" />
            <span>Courier Fast Drop-Off</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Deposit Package</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deliver to Fr. Agnel Smart Lockers across Bandra, Vashi, and Nerul.
          </p>
        </div>

        {/* Member 1 Waybill Scanner Action Button */}
        <button
          type="button"
          onClick={() => setShowScannerModal(true)}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-2 shadow-lg transition active:scale-95"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Scan Shipping Label</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Destination Campus Selector */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            1. Destination Campus & Terminal
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {CAMPUSES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => handleCampusChange(c.id)}
                className={`p-3 rounded-xl text-left border transition ${
                  campusId === c.id
                    ? 'bg-brand-500/15 border-brand-400 text-white shadow-md ring-1 ring-brand-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-semibold text-xs text-white">{c.name}</div>
                <div className="text-[10px] text-brand-400 font-mono mt-0.5">{c.station}</div>
                <div className="text-[10px] text-slate-500 mt-1">{c.tag}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Courier Company Selector */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            2. Select Courier Company
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {CARRIER_PRESETS.map((c) => (
              <button
                type="button"
                key={c.name}
                onClick={() => setCarrier(c.name)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                  carrier === c.name
                    ? 'bg-brand-500 text-slate-950 border-brand-400 shadow-md'
                    : 'bg-slate-950/60 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {carrier === 'Other' && (
            <input
              type="text"
              placeholder="Enter courier name (e.g., DHL, FedEx, Shadowfax)"
              value={customCarrier}
              onChange={(e) => setCustomCarrier(e.target.value)}
              className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          )}
        </div>

        {/* Step 3: Searchable Student Recipient Picker */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Select Recipient Student ({CAMPUSES.find((c) => c.id === campusId)?.name || 'All'})
            </label>
            {loadingRecipients && (
              <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Loading...</span>
              </span>
            )}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by student name or hostel room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Recipient list */}
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filteredRecipients.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No students enrolled in {CAMPUSES.find((c) => c.id === campusId)?.name || 'this campus'}.
              </p>
            ) : (
              filteredRecipients.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSelectRecipient(r.id)}
                  className={`p-3 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedRecipientId === r.id
                      ? 'bg-brand-500/10 border-brand-500/50 text-white'
                      : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-brand-400 shrink-0">
                      {r.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{r.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300">
                      <Building className="h-3 w-3" />
                      <span>{r.roomNumber || 'Hostel'}</span>
                    </span>
                    {r.campus_id && (
                      <span className="block text-[9px] font-mono text-emerald-400 mt-0.5">
                        {r.campus_id.replace('CAMPUS-', '')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Step 4: Locker Size Allocation */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            4. Smart Locker Compartment Size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { size: 'SMALL', label: 'Small (S)', desc: 'Envelopes & Pouch' },
              { size: 'MEDIUM', label: 'Medium (M)', desc: 'Standard Shoebox' },
              { size: 'LARGE', label: 'Large (L)', desc: 'Backpack & Bulk' },
            ].map((s) => (
              <button
                key={s.size}
                type="button"
                onClick={() => setLockerSize(s.size as any)}
                className={`p-3 rounded-xl text-center border transition ${
                  lockerSize === s.size
                    ? 'bg-emerald-500/15 border-emerald-400 text-white ring-1 ring-emerald-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-bold text-xs text-emerald-300">{s.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 5: Physical Package Condition Inspection */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            5. Package Physical Condition Check
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'INTACT', label: 'Intact Seal', color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
              { id: 'SLIGHT_DAMAGE', label: 'Box Dent', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
              { id: 'HEAVILY_DAMAGED', label: 'Damaged Seal', color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
            ].map((cond) => (
              <button
                key={cond.id}
                type="button"
                onClick={() => setPackageCondition(cond.id as any)}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition text-center ${
                  packageCondition === cond.id
                    ? `${cond.color} ring-1 ring-emerald-400`
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {cond.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 6: Photo Proof of Package */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            6. Package Photo Proof
          </label>
          <CameraCapture
            onPhotoSelected={(file: File) => setPhotoFile(file)}
            selectedFile={photoFile}
          />
        </div>

        {/* Step 7: Package Description & Courier Notes */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            7. Package Description & Notes (Optional)
          </label>
          <div className="relative">
            <FileText className="h-4 w-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="e.g. Medium brown cardboard box, small document pouch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !photoFile || !selectedRecipientId}
          className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition duration-200 flex items-center justify-center space-x-2 shadow-xl ${
            loading || !photoFile || !selectedRecipientId
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-400 text-slate-950 shadow-brand-500/20 active:scale-[0.99]'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Uploading to S3 & Enqueueing SQS...</span>
            </>
          ) : (
            <>
              <span>Confirm & Deposit Package</span>
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
