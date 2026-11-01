import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RotateCcw, Check, UploadCloud } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoSelected: (file: File) => void;
  selectedFile: File | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoSelected,
  selectedFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onPhotoSelected(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Create a synthetic sample parcel photo on laptop/desktop demo without camera
  const handleUseSamplePhoto = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw simulated parcel photo
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 640, 480);
      
      // Cardboard box
      ctx.fillStyle = '#b45309';
      ctx.fillRect(140, 120, 360, 260);

      // Shipping label
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(200, 180, 240, 140);

      // Barcode lines
      ctx.fillStyle = '#0f172a';
      for (let i = 220; i < 420; i += 8) {
        ctx.fillRect(i, 200, Math.random() > 0.4 ? 4 : 2, 50);
      }

      ctx.font = 'bold 16px monospace';
      ctx.fillText('DROPSECURE PARCEL PROOF', 210, 280);
      ctx.font = '12px sans-serif';
      ctx.fillText('Gate Verification Photo', 210, 305);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], `demo-parcel-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onPhotoSelected(sampleFile);
          setPreviewUrl(URL.createObjectURL(sampleFile));
        }
      }, 'image/jpeg');
    }
  };

  return (
    <div className="w-full">
      {/* Native Mobile Camera Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!selectedFile || !previewUrl ? (
        <div className="space-y-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 bg-slate-900/60 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-900 group"
          >
            <div className="h-16 w-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Camera className="h-8 w-8 stroke-[2.2]" />
            </div>
            <div className="text-center">
              <span className="text-sm font-semibold text-slate-100 group-hover:text-brand-300">
                Tap to Open Camera & Snap Proof
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Direct mobile capture (&lt;input type="file" capture&gt;)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2">
            <button
              type="button"
              onClick={handleUseSamplePhoto}
              className="text-xs text-slate-400 hover:text-brand-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Use Simulated Parcel Photo (Laptop Demo)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
          <img
            src={previewUrl}
            alt="Parcel Proof"
            className="w-full h-56 sm:h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-4">
            <div className="flex items-center space-x-2 text-emerald-400 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30 text-xs font-semibold">
              <Check className="h-4 w-4" />
              <span>Photo Attached ({(selectedFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 backdrop-blur-md transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retake</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
