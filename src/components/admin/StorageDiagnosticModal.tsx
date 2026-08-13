import React, { useState, useRef } from 'react';
import { 
  X, Activity, CheckCircle2, XCircle, AlertTriangle, 
  Upload, Terminal, Copy, Check, RefreshCw, ShieldCheck, Database, FileText, ExternalLink
} from 'lucide-react';
import { 
  runStorageDiagnosticFlow, 
  DiagnosticStepResult, 
  CANDIDATE_STORAGE_BUCKET 
} from '../../lib/candidateStorageService';

interface StorageDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageDiagnosticModal: React.FC<StorageDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DiagnosticStepResult[]>([]);
  const [copiedSql, setCopiedSql] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartDiagnostic = async () => {
    if (!selectedFile) return;
    setIsRunning(true);
    setSteps([]);

    try {
      const results = await runStorageDiagnosticFlow(selectedFile, (updatedStep) => {
        setSteps((prev) => {
          const next = [...prev];
          const idx = next.findIndex((s) => s.stepNumber === updatedStep.stepNumber);
          if (idx !== -1) {
            next[idx] = updatedStep;
          } else {
            next.push(updatedStep);
          }
          return next;
        });
      });
      setSteps(results);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const sqlFixSnippet = `-- ========================================================
-- PERBAIKAN SUPABASE STORAGE BUCKET & RLS POLICIES
-- Jalankan di: Supabase Dashboard -> SQL Editor
-- ========================================================

-- 1. Buat / Pastikan Bucket 'candidate-photos' publik
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'candidate-photos',
  'candidate-photos',
  true,
  5242880, -- 5 MB
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

-- 2. Hapus policy lama agar bersih tanpa konflik
DROP POLICY IF EXISTS "Public Read Access for Candidate Photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update candidate photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete candidate photos" ON storage.objects;

-- 3. Policy SELECT: Publik BISA membaca/melihat foto kandidat
CREATE POLICY "Public Read Access for Candidate Photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'candidate-photos');

-- 4. Policy INSERT: Hanya Admin / Creator terautentikasi BISA mengunggah
CREATE POLICY "Admins can upload candidate photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 5. Policy UPDATE: Admin / Creator BISA memperbarui foto
CREATE POLICY "Admins can update candidate photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
)
WITH CHECK (
  bucket_id = 'candidate-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 6. Policy DELETE: Admin / Creator BISA menghapus foto
CREATE POLICY "Admins can delete candidate photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'candidate-photos'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlFixSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Diagnostik Supabase Storage</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-900">
                  Real-Time Inspector
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Uji coba alur upload foto kandidat secara bertahap dari Auth, Role, Bucket, hingga Storage Objects.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* File Selector */}
          <div className="bg-slate-50 dark:bg-[#252525] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Pilih Foto Uji Coba:</span>
              </label>
              {selectedFile && (
                <span className="text-[11px] font-mono text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isRunning}
                className="px-4 py-2 bg-white dark:bg-[#303030] hover:bg-slate-100 dark:hover:bg-[#3a3a3a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                {selectedFile ? 'Ganti File' : 'Pilih Gambar'}
              </button>

              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate flex-1">
                {selectedFile ? selectedFile.name : 'Belum ada gambar yang dipilih'}
              </span>

              <button
                type="button"
                onClick={handleStartDiagnostic}
                disabled={!selectedFile || isRunning}
                className={`px-5 py-2 font-bold text-xs rounded-xl text-white shadow-md transition-all flex items-center gap-2 ${
                  !selectedFile || isRunning
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-indigo-600/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Mulai Diagnostik</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Diagnostic Steps Log */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Hasil Eksekusi Diagnostic Flow</span>
                <span className="font-mono text-[10px] text-slate-400">
                  Target Bucket: '{CANDIDATE_STORAGE_BUCKET}'
                </span>
              </h3>

              <div className="space-y-2">
                {steps.map((step) => {
                  let badgeBg = 'bg-slate-100 text-slate-600 border-slate-200';
                  let icon = <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />;

                  if (step.status === 'SUCCESS') {
                    badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900';
                    icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
                  } else if (step.status === 'FAILED') {
                    badgeBg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
                    icon = <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
                  } else if (step.status === 'RUNNING') {
                    badgeBg = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900';
                    icon = <RefreshCw className="w-4 h-4 animate-spin text-sky-600 shrink-0" />;
                  }

                  return (
                    <div
                      key={step.stepNumber}
                      className={`p-3.5 rounded-2xl border transition-all ${badgeBg}`}
                    >
                      <div className="flex items-start gap-3">
                        {icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                              Tahap {step.stepNumber}: {step.name}
                            </span>
                            <span className="text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/80 dark:bg-black/30 border">
                              {step.status}
                            </span>
                          </div>
                          <p className="text-xs mt-1 font-mono font-medium break-words">
                            {step.message}
                          </p>

                          {step.details && (
                            <details className="mt-2 text-[11px] font-mono text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-black/5">
                              <summary className="cursor-pointer font-bold hover:underline">
                                Lihat Detail Respons Object
                              </summary>
                              <pre className="mt-1 whitespace-pre-wrap overflow-x-auto text-[10px]">
                                {JSON.stringify(step.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SQL Policy Snippet Section */}
          <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-slate-200">SQL Perbaikan Bucket & Storage Policy</span>
              </div>
              <button
                type="button"
                onClick={copySql}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-48 overflow-y-auto text-[11px] leading-relaxed text-slate-300 p-2 bg-slate-950 rounded-xl border border-slate-800">
              {sqlFixSnippet}
            </pre>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 font-sans">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                Jalankan SQL ini di <strong>Supabase Dashboard $\rightarrow$ SQL Editor</strong> untuk memastikan bucket <code>candidate-photos</code> publik dan RLS policy diaktifkan.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#252525] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-[#333] hover:bg-slate-300 dark:hover:bg-[#444] text-slate-800 dark:text-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Tutup Diagnostik
          </button>
        </div>
      </div>
    </div>
  );
};
