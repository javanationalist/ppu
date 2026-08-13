import React from 'react';
import { X } from 'lucide-react';
import { Candidate } from '../../../../types';
import { CandidatePhotoUploader, PhotoInputMode } from '../../../../components/admin/CandidatePhotoUploader';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candMode: 'add' | 'edit';
  candEditing: Candidate | null;
  candNumber: number;
  setCandNumber: (num: number) => void;
  candChairman: string;
  setCandChairman: (val: string) => void;
  candVice: string;
  setCandVice: (val: string) => void;
  candVisi: string;
  setCandVisi: (val: string) => void;
  candMisi: string;
  setCandMisi: (val: string) => void;
  candPhotoUrl: string;
  setCandPhotoUrl: (val: string) => void;
  selectedPhotoFile: File | null;
  setSelectedPhotoFile: (file: File | null) => void;
  isUploadingPhoto?: boolean;
  photoUploadError?: string | null;
  photoInputMode?: PhotoInputMode;
  setPhotoInputMode?: (mode: PhotoInputMode) => void;
  isMpk: boolean;
  selectedMpkClass: string;
  onSubmit: (e: React.FormEvent) => void;
  onOpenDiagnostic?: () => void;
}

export function CandidateModal({
  isOpen,
  onClose,
  candMode,
  candEditing,
  candNumber,
  setCandNumber,
  candChairman,
  setCandChairman,
  candVice,
  setCandVice,
  candVisi,
  setCandVisi,
  candMisi,
  setCandMisi,
  candPhotoUrl,
  setCandPhotoUrl,
  selectedPhotoFile,
  setSelectedPhotoFile,
  isUploadingPhoto = false,
  photoUploadError = null,
  photoInputMode = 'url',
  setPhotoInputMode,
  isMpk,
  selectedMpkClass,
  onSubmit,
  onOpenDiagnostic
}: CandidateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold">{candMode === 'edit' ? 'Edit Pasangan / Kandidat' : 'Tambah Kandidat Baru'}</h3>
            <p className="text-xs text-emerald-100">{isMpk ? `Kandidat Perwakilan ${selectedMpkClass}` : 'Kandidat Pasangan Calon'}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            disabled={isUploadingPhoto}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nomor Urut</label>
              <input 
                type="number"
                min="1"
                value={candNumber}
                onChange={(e) => setCandNumber(parseInt(e.target.value) || 1)}
                required
                disabled={isUploadingPhoto}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-600 outline-none font-bold text-center"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                {isMpk ? 'Nama Perwakilan MPK' : 'Nama Calon Ketua'}
              </label>
              <input 
                type="text"
                value={candChairman}
                onChange={(e) => setCandChairman(e.target.value)}
                placeholder="Nama Lengkap..."
                required
                disabled={isUploadingPhoto}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
          </div>

          {!isMpk && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nama Calon Wakil (Opsional)</label>
              <input 
                type="text"
                value={candVice}
                onChange={(e) => setCandVice(e.target.value)}
                placeholder="Nama Wakil Paslon..."
                disabled={isUploadingPhoto}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-600 outline-none"
              />
            </div>
          )}

          {/* Photo Source & Uploader Component */}
          <CandidatePhotoUploader
            photoInputMode={photoInputMode}
            onModeChange={setPhotoInputMode}
            photoUrl={candPhotoUrl}
            onPhotoUrlChange={setCandPhotoUrl}
            urlError={photoUploadError}
            currentPhotoUrl={candPhotoUrl}
            selectedFile={selectedPhotoFile}
            onSelectFile={setSelectedPhotoFile}
            isUploading={isUploadingPhoto}
            uploadError={photoUploadError}
            disabled={isUploadingPhoto}
            onOpenDiagnostic={onOpenDiagnostic}
          />

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Visi Utama</label>
            <textarea 
              rows={2}
              value={candVisi}
              onChange={(e) => setCandVisi(e.target.value)}
              placeholder="Gagasan & Visi utama..."
              disabled={isUploadingPhoto}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-600 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Misi (Satu Misi Per Baris)</label>
            <textarea 
              rows={4}
              value={candMisi}
              onChange={(e) => setCandMisi(e.target.value)}
              placeholder="1. Misi Pertama&#10;2. Misi Kedua..."
              disabled={isUploadingPhoto}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-600 outline-none font-sans"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploadingPhoto}
              className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[#252525] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isUploadingPhoto}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploadingPhoto ? 'Mengunggah & Menyimpan...' : 'Simpan Kandidat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
