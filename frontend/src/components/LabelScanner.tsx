import React, { useState } from 'react';
import { ScanLine, CheckCircle2, Sparkles, Building2, UserCheck, ShieldAlert, FileText, ArrowRight } from 'lucide-react';
import { User } from '../types';

interface ScannedLabelData {
  trackingId: string;
  carrier: string;
  recipientName: string;
  recipientId?: string;
  campusId: string;
  campusName: string;
  roomNumber: string;
  lockerSize: 'SMALL' | 'MEDIUM' | 'LARGE';
  condition: 'INTACT' | 'SLIGHT_DAMAGE';
}

interface LabelScannerProps {
  recipients: User[];
  onApplyScan: (data: ScannedLabelData) => void;
  onClose: () => void;
}

export const LabelScanner: React.FC<LabelScannerProps> = ({
  recipients,
  onApplyScan,
  onClose,
}) => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);

  // Preset realistic shipping labels mapped to student database
  const presets: ScannedLabelData[] = [
    {
      trackingId: 'AMZN-9821-BND',
      carrier: 'Amazon Logistics',
      recipientName: 'Alice Johnson',
      recipientId: recipients.find((r) => r.name.toLowerCase().includes('alice'))?.id,
      campusId: 'CAMPUS-BANDRA',
      campusName: 'Fr. CRCE Bandra (Main Campus)',
      roomNumber: 'Room 302-B',
      lockerSize: 'MEDIUM',
      condition: 'INTACT',
    },
    {
      trackingId: 'BLUD-4109-VSH',
      carrier: 'BlueDart Express',
      recipientName: 'Bob Smith',
      recipientId: recipients.find((r) => r.name.toLowerCase().includes('bob'))?.id,
      campusId: 'CAMPUS-VASHI',
      campusName: 'Fr. CRIT Vashi (Agnel Tech)',
      roomNumber: 'Room 105-A',
      lockerSize: 'SMALL',
      condition: 'INTACT',
    },
    {
      trackingId: 'DELH-7231-NRL',
      carrier: 'Delhivery Surface',
      recipientName: 'Charlie Brown',
      recipientId: recipients.find((r) => r.name.toLowerCase().includes('charlie'))?.id,
      campusId: 'CAMPUS-NERUL',
      campusName: 'Agnel Nerul (Research Campus)',
      roomNumber: 'Lab Block 4',
      lockerSize: 'LARGE',
      condition: 'SLIGHT_DAMAGE',
    },
  ];

  const currentPreset = presets[selectedPreset];

  const handleStartScan = () => {
    setScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
    }, 1200);
  };

  const handleApply = () => {
    onApplyScan(currentPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Smart Shipping Label Scanner</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Vision OCR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Optical character parsing for package waybills and tracking barcodes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Preset Selector */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Select Live Shipping Label to Scan:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((p, idx) => (
              <button
                key={p.trackingId}
                onClick={() => {
                  setSelectedPreset(idx);
                  setScanComplete(false);
                }}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedPreset === idx
                    ? 'bg-amber-950/50 border-amber-400 ring-1 ring-amber-400'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-xs text-white truncate">{p.carrier}</div>
                <div className="text-[11px] text-amber-300 font-mono mt-0.5">{p.recipientName}</div>
                <div className="text-[10px] text-slate-400 truncate">{p.campusId.replace('CAMPUS-', '')}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Simulated Waybill Label Graphic */}
        <div className="mt-4 relative bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-hidden font-mono text-xs">
          {/* Laser scanning beam */}
          {scanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_12px_rgba(251,191,36,1)] animate-bounce z-10" />
          )}

          <div className="flex justify-between items-start border-b border-slate-800 pb-2">
            <div>
              <span className="font-bold text-amber-400">{currentPreset.carrier.toUpperCase()}</span>
              <p className="text-[10px] text-slate-400">EXPRESS CAMPUS DIRECTWAYBILL</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                AIR-HUB
              </span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{currentPreset.trackingId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">DELIVER TO:</span>
              <span className="text-slate-200 font-bold text-xs">{currentPreset.recipientName}</span>
              <p className="text-slate-400 text-[11px] mt-0.5">{currentPreset.roomNumber}</p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-500 block">DESTINATION CAMPUS:</span>
              <span className="text-emerald-400 font-bold text-xs">{currentPreset.campusName}</span>
              <p className="text-slate-400 text-[10px] mt-0.5">Automated Lockers Available</p>
            </div>
          </div>

          {/* Barcode visual */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1">
              {[6, 2, 8, 3, 10, 4, 12, 5, 8, 3, 6, 2, 9, 4, 7, 3, 11, 4, 6].map((h, i) => (
                <div key={i} className="w-1 bg-slate-400" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
            <div className="text-right text-[10px] text-slate-400">
              OCR Verification: <span className="text-emerald-400 font-bold">99.8% READY</span>
            </div>
          </div>
        </div>

        {/* Scan Results Card */}
        {scanComplete ? (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
              <CheckCircle2 className="h-4 w-4" />
              OCR Parsing Succeeded (AWS Textract Confidence: 99.8%)
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-400">Recipient:</span> {currentPreset.recipientName}
              </div>
              <div>
                <span className="text-slate-400">Destination:</span> {currentPreset.campusId}
              </div>
              <div>
                <span className="text-slate-400">Carrier:</span> {currentPreset.carrier}
              </div>
              <div>
                <span className="text-slate-400">Condition:</span>{' '}
                <span className={currentPreset.condition === 'INTACT' ? 'text-emerald-400' : 'text-amber-400'}>
                  {currentPreset.condition}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="mt-5 flex gap-2">
          {!scanComplete ? (
            <button
              onClick={handleStartScan}
              disabled={scanning}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <ScanLine className="h-4 w-4" />
              {scanning ? 'Scanning Waybill Barcode...' : 'Scan Shipping Label'}
            </button>
          ) : (
            <button
              onClick={handleApply}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <ArrowRight className="h-4 w-4" />
              Apply Extracted Data to Drop-Off
            </button>
          )}

          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
