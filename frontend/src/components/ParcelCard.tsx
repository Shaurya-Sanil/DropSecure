import React, { useState } from 'react';
import { Package, MapPin, Calendar, Clock, User, ShieldCheck, AlertCircle, Eye, Truck, Info, X } from 'lucide-react';
import { Parcel, UserRole } from '../types';
import { StatusTimeline } from './StatusTimeline';

interface ParcelCardProps {
  parcel: Parcel;
  userRole?: UserRole;
  onVerifyClick?: (parcel: Parcel) => void;
  onShowDynamicQr?: (parcel: Parcel) => void;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({
  parcel,
  userRole,
  onVerifyClick,
  onShowDynamicQr,
}) => {
  const [showImageModal, setShowImageModal] = useState(false);

  const getStatusBadge = () => {
    switch (parcel.status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center space-x-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>READY FOR COLLECTION</span>
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1.5 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>COLLECTED</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center space-x-1.5 shadow-sm">
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
            <span>EXPIRED (&gt;48H)</span>
          </span>
        );
    }
  };

  // Calculate remaining hours for 48h OTP expiration
  const getExpirationInfo = () => {
    if (parcel.status !== 'PENDING') return null;
    const createdAt = new Date(parcel.created_at).getTime();
    const expiryTime = parcel.otp_expires_at ? new Date(parcel.otp_expires_at).getTime() : createdAt + 48 * 3600 * 1000;
    const remainingMs = expiryTime - Date.now();
    if (remainingMs <= 0) return 'Expired';
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m remaining`;
  };

  const expirationText = getExpirationInfo();
  const campusLabel = parcel.campus_id ? parcel.campus_id.replace('CAMPUS-', '') : 'BANDRA';

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-3xl p-5 hover:border-slate-700/80 transition-all duration-200 space-y-4 shadow-lg shadow-black/20">
      {/* Header: Tracking Code, Carrier, Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-slate-800 text-brand-400 border border-slate-700/60 shadow-inner">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold font-mono tracking-wider text-white">
                {parcel.tracking_code}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 border border-slate-700 text-brand-300 flex items-center space-x-1">
                <Truck className="h-3 w-3" />
                <span>{parcel.carrier || 'Courier'}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {campusLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Smart Locker: <span className="text-emerald-400 font-mono font-bold">{parcel.locker_number || 'L-04'}</span> ({parcel.locker_size || 'MEDIUM'})
            </p>
          </div>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/50">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Recipient:</span>
            <span className="font-semibold text-slate-200">{parcel.recipient_name || 'Student'}</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Delivery Room:</span>
            <span className="font-semibold text-slate-200">{parcel.recipient_room || 'Hostel Unit'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Deposited:</span>
            <span className="text-slate-300">{new Date(parcel.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          {expirationText && (
            <div className="flex items-center space-x-2 text-amber-400 font-medium">
              <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>48h Pickup Window:</span>
              <span className="font-mono text-amber-300 tabular-nums px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">{expirationText}</span>
            </div>
          )}
        </div>
      </div>

      {/* Description / Courier Notes */}
      {parcel.notes && (
        <div className="text-xs text-slate-400 bg-slate-950/30 p-2.5 px-3 rounded-xl border border-slate-800/40 flex items-start space-x-2">
          <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-500 font-medium">Courier Description: </span>
            <span className="text-slate-300 italic">{parcel.notes}</span>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-slate-950/50 rounded-2xl px-4 py-2 border border-slate-800/60">
        <StatusTimeline
          status={parcel.status}
          createdAt={parcel.created_at}
          collectedAt={parcel.collected_at}
        />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
        {parcel.imageUrl ? (
          <button
            onClick={() => setShowImageModal(true)}
            className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-800/80 transition"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Photo Proof</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-500 italic">No image proof</span>
        )}

        <div className="flex items-center gap-2">
          {parcel.status === 'PENDING' && onShowDynamicQr && (
            <button
              onClick={() => onShowDynamicQr(parcel)}
              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-semibold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition active:scale-95"
            >
              <span>📱 Dynamic QR</span>
            </button>
          )}

          {parcel.status === 'PENDING' && onVerifyClick && (
            <button
              onClick={() => onVerifyClick(parcel)}
              className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold px-4 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 transition shadow-sm active:scale-95"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Enter OTP at Kiosk</span>
            </button>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {showImageModal && parcel.imageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-slate-300">
                Delivery Photo Proof ({parcel.tracking_code})
              </span>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={parcel.imageUrl}
              alt="Parcel proof"
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
            />
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Direct S3 Presigned Image Proof • Stored with 30-day automated lifecycle
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
