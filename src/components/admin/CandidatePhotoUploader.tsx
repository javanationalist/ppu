import React, { useRef, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { validateCandidatePhoto, MAX_FILE_SIZE_BYTES } from '../../lib/candidateStorageService';
import { M3ExpressiveLoadingIndicator } from '../ui/M3ExpressiveLoadingIndicator';

interface CandidatePhotoUploaderProps {
  currentPhotoUrl?: string;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  isUploading?: boolean;
  uploadProgressText?: string;
  uploadError?: string | null;
  disabled?: boolean;
}

export const CandidatePhotoUploader: React.FC<CandidatePhotoUploaderProps> = ({
  currentPhotoUrl,
  selectedFile,
  onSelectFile,
  isUploading = false,
  uploadProgressText = 'Memproses foto kandidat...',
  uploadError,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

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
    if (files && files.length > 0) {
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
    onSelectFile(null);
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

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Foto Profil Kandidat <span className="text-emerald-600 font-bold">*</span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/jpg"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Main Upload Box */}
      <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all overflow-hidden ${
        activeError
          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20'
          : previewSource
          ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/10'
          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#202020] hover:border-emerald-500/60 dark:hover:border-emerald-500/60'
      }`}>
        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
            <M3ExpressiveLoadingIndicator size="medium" className="text-emerald-600 mb-2" />
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {uploadProgressText || 'Mengunggah foto ke Supabase Storage...'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 animate-pulse">
              Mengompresi ke format WebP & mengamankan file...
            </p>
          </div>
        )}

        {previewSource ? (
          /* Preview Mode */
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-md">
                <img
                  src={previewSource}
                  alt="Preview Foto Kandidat"
                  className="w-full h-full object-cover object-center"
                />
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerSelect}
                  disabled={disabled || isUploading}
                  className="p-1.5 bg-white text-slate-800 rounded-lg shadow-sm hover:bg-slate-100 text-xs font-bold"
                  title="Ganti Foto"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0 w-full">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{selectedFile ? 'Foto Baru Dipilih' : 'Foto Kandidat Tersedia'}</span>
                </div>
                
                {selectedFile ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2">
                      <span>Ukuran: {formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      <span className="uppercase">{selectedFile.type.replace('image/', '')}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={currentPhotoUrl}>
                    Tersimpan di Supabase Storage
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerSelect}
                  disabled={disabled || isUploading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ganti Foto</span>
                </button>

                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleRemoveSelection}
                    disabled={disabled || isUploading}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-[#303030] hover:bg-slate-300 dark:hover:bg-[#404040] text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Batal Pilih</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Upload Prompt State */
          <div
            onClick={handleTriggerSelect}
            className={`cursor-pointer flex flex-col items-center justify-center py-6 px-4 text-center group transition-transform ${
              disabled || isUploading ? 'cursor-not-allowed opacity-60' : 'hover:scale-[0.99]'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors shadow-xs">
              <Upload className="w-6 h-6" />
            </div>
            
            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
              Klik atau Seret Foto Kandidat ke Sini
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Format: JPG, PNG, atau WebP (Maksimal 5 MB)
            </p>
            <span className="mt-2 inline-block px-3 py-1 bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 text-[11px] font-extrabold rounded-lg shadow-2xs group-hover:border-emerald-500">
              Pilih Foto Perangkat
            </span>
          </div>
        )}
      </div>

      {/* Error Alert Display */}
      {activeError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block">Gagal Memproses Foto:</span>
            <span>{activeError}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatePhotoUploader;
