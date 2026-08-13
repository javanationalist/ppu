import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle2, Link as LinkIcon, X, ShieldAlert } from 'lucide-react';
import { validateCandidatePhoto } from '../../lib/candidateStorageService';
import { M3ExpressiveLoadingIndicator } from '../ui/M3ExpressiveLoadingIndicator';

export type PhotoInputMode = 'url' | 'upload';

export function validatePhotoUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { valid: false, error: 'URL foto kandidat tidak boleh kosong.' };
  }
  if (!/^https?:\/\/.+/i.test(trimmed)) {
    return { 
      valid: false, 
      error: 'URL foto tidak valid. Gunakan URL gambar yang diawali http:// atau https://.' 
    };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'URL foto tidak valid. Gunakan URL gambar yang diawali http:// atau https://.'
      };
    }
  } catch (e) {
    return { 
      valid: false, 
      error: 'URL foto tidak valid. Gunakan URL gambar yang diawali http:// atau https://.' 
    };
  }
  return { valid: true };
}

interface CandidatePhotoUploaderProps {
  photoInputMode?: PhotoInputMode;
  onModeChange?: (mode: PhotoInputMode) => void;
  photoUrl: string;
  onPhotoUrlChange: (url: string) => void;
  urlError?: string | null;
  
  // Storage Upload Mode state (preserved for future enablement)
  currentPhotoUrl?: string;
  selectedFile?: File | null;
  onSelectFile?: (file: File | null) => void;
  isUploading?: boolean;
  uploadProgressText?: string;
  uploadError?: string | null;
  disabled?: boolean;
  onOpenDiagnostic?: () => void;
}

export const CandidatePhotoUploader: React.FC<CandidatePhotoUploaderProps> = ({
  photoInputMode = 'url',
  onModeChange,
  photoUrl,
  onPhotoUrlChange,
  urlError,
  currentPhotoUrl,
  selectedFile = null,
  onSelectFile,
  isUploading = false,
  uploadProgressText = 'Memproses foto kandidat...',
  uploadError,
  disabled = false,
  onOpenDiagnostic
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  // Generate local preview URL when selectedFile changes
  useEffect(() => {
    if (!selectedFile) {
      setLocalPreviewUrl(null);
      setValidationError(null);
      return;
    }

    const validation = validateCandidatePhoto(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.error || 'File tidak valid.');
      setLocalPreviewUrl(null);
      return;
    }

    setValidationError(null);
    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onSelectFile) {
      const file = files[0];
      const validation = validateCandidatePhoto(file);
      if (!validation.valid) {
        setValidationError(validation.error || 'File foto tidak valid.');
        onSelectFile(null);
      } else {
        setValidationError(null);
        onSelectFile(file);
      }
    }
  };

  const handleRemoveSelection = () => {
    if (onSelectFile) onSelectFile(null);
    setLocalPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTriggerSelect = () => {
    if (disabled || isUploading) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const previewSource = localPreviewUrl || currentPhotoUrl;
  const activeError = validationError || uploadError;
  const activeMode = photoInputMode;

  return (
    <div className="space-y-3">
      {/* 1. Sumber Foto Selection Section */}
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Sumber Foto Kandidat <span className="text-emerald-600 font-bold">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-[#202020] rounded-2xl border border-slate-200 dark:border-slate-800">
          {/* Option A: Link Foto (AKTIF) */}
          <label className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            activeMode === 'url'
              ? 'bg-white dark:bg-[#282828] border-emerald-500 shadow-xs text-slate-900 dark:text-slate-100 font-bold'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}>
            <input
              type="radio"
              name="photoInputMode"
              value="url"
              checked={activeMode === 'url'}
              onChange={() => onModeChange && onModeChange('url')}
              className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 dark:text-slate-100">
                <LinkIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Link Foto</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded font-extrabold ml-auto shrink-0">
                  AKTIF
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 leading-snug">
                Gunakan URL gambar dari internet
              </p>
            </div>
          </label>

          {/* Option B: Upload Foto (DISABLED) */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#181818]/50 opacity-60 cursor-not-allowed">
            <input
              type="radio"
              name="photoInputMode"
              value="upload"
              disabled={true}
              checked={activeMode === 'upload'}
              onChange={() => {}}
              className="mt-0.5 w-4 h-4 text-slate-400 accent-slate-400 cursor-not-allowed"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>Upload Foto</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-extrabold ml-auto shrink-0">
                  DINONAKTIFKAN
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 leading-snug">
                Upload langsung ke Supabase Storage
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* 2. MODE: LINK FOTO (ENABLED & PRIMARY) */}
      {activeMode === 'url' && (
        <div className="space-y-3 animate-fade-in">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                URL Foto Kandidat <span className="text-emerald-600 font-bold">*</span>
              </label>
              {photoUrl.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    onPhotoUrlChange('');
                    setImageLoadError(false);
                  }}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Hapus URL</span>
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => {
                  onPhotoUrlChange(e.target.value);
                  setImageLoadError(false);
                }}
                placeholder="https://example.com/foto-kandidat.jpg"
                disabled={disabled}
                className={`w-full pl-9 pr-3 py-2.5 text-xs border rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 outline-none font-mono transition-all ${
                  urlError || imageLoadError
                    ? 'border-rose-400 dark:border-rose-800 focus:ring-rose-500 bg-rose-50/20'
                    : 'border-slate-200 dark:border-slate-800 focus:ring-emerald-600'
                }`}
              />
            </div>
            
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Masukkan URL gambar yang diawali <code className="font-bold text-emerald-600 dark:text-emerald-400">http://</code> atau <code className="font-bold text-emerald-600 dark:text-emerald-400">https://</code>.
            </p>
          </div>

          {/* Validation & Load Error Display */}
          {(urlError || imageLoadError) && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">
                  {imageLoadError ? 'Preview Foto Gagal Dimuat' : 'URL Foto Tidak Valid'}
                </span>
                <span>
                  {imageLoadError
                    ? 'Preview foto gagal dimuat. Periksa kembali URL foto.'
                    : urlError}
                </span>
              </div>
            </div>
          )}

          {/* Image Live Preview */}
          {photoUrl.trim() && !urlError && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>Pratinjau Foto Kandidat</span>
                </div>
                {!imageLoadError && (
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-100/80 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Valid & Siap Disimpan
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-[#181818] p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="w-24 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center shadow-xs">
                  <img
                    src={photoUrl.trim()}
                    alt="Preview Foto"
                    onLoad={() => setImageLoadError(false)}
                    onError={() => setImageLoadError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 break-all font-mono line-clamp-2">
                    {photoUrl.trim()}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {imageLoadError
                      ? 'Gagal memuat file gambar dari server asal. Pastikan URL dapat diakses secara publik.'
                      : 'Gambar berhasil dimuat. URL ini akan disimpan ke profil kandidat.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. MODE: UPLOAD FOTO (PRESERVED CODE & ARCHITECTURE FOR FUTURE ENABLEMENT) */}
      {activeMode === 'upload' && (
        <div className="space-y-2 opacity-50 pointer-events-none">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp, image/jpg"
            onChange={handleFileChange}
            className="hidden"
            disabled={true}
          />

          <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all overflow-hidden ${
            activeError
              ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
              : previewSource
              ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/10'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#202020]'
          }`}>
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                <M3ExpressiveLoadingIndicator size="medium" className="text-emerald-600 mb-2" />
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  {uploadProgressText}
                </p>
              </div>
            )}

            {previewSource ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-24 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-md">
                    <img
                      src={previewSource}
                      alt="Preview Foto Kandidat"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2 min-w-0 w-full">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{selectedFile ? 'Foto Baru Dipilih' : 'Foto Kandidat Tersedia'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={handleTriggerSelect}
                className="cursor-not-allowed flex flex-col items-center justify-center py-6 px-4 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs font-extrabold text-slate-500">
                  Upload Foto Langsung Dinonaktifkan
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Gunakan metode "Link Foto" di atas untuk memasukkan URL foto.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Diagnostik Storage Access Button */}
      {onOpenDiagnostic && (
        <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <span>Pengujian infrastruktur Storage?</span>
          <button
            type="button"
            onClick={onOpenDiagnostic}
            className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Diagnostik Storage</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CandidatePhotoUploader;
