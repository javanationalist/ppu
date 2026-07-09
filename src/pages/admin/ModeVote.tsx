import React, { useState, useEffect } from 'react';
import { Settings, ShieldAlert, CheckCircle, Save, Vote, ShieldCheck, Monitor } from 'lucide-react';
import { getVoteMode, saveVoteMode, VoteMode } from '../../lib/voteModeService';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/adminService';

export default function ModeVote() {
  const { profile: adminProfile } = useAuth();
  const [mode, setMode] = useState<VoteMode>('regular');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadMode() {
      try {
        const currentMode = await getVoteMode();
        setMode(currentMode);
      } catch (err) {
        console.error('Failed to load vote mode:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMode();
  }, []);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await saveVoteMode(mode);
      if (success) {
        triggerToast('success', `Mode voting berhasil diubah menjadi: ${mode === 'regular' ? 'Vote Reguler' : 'Bilik Suara'}`);
        if (adminProfile) {
          await logAdminAction(
            adminProfile.email,
            `Mengubah mode voting menjadi ${mode.toUpperCase()}`,
            'SYSTEM CONFIG'
          );
        }
      } else {
        triggerToast('error', 'Gagal menyimpan konfigurasi ke database.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('error', 'Terjadi kesalahan sistem saat menyimpan konfigurasi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat konfigurasi mode...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 animate-fade-in text-left">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-3 transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-850 border-emerald-100' 
            : 'bg-rose-50 text-rose-850 border-rose-100'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>Mode Vote</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Atur dan ganti sistem otorisasi gerbang portal pemilihan umum secara global.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Pilih Mode Operasional</h2>
          <p className="text-slate-400 text-xs mt-0.5">Hanya satu mode yang diperbolehkan aktif pada satu waktu.</p>
        </div>

        {/* Segmented Control Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Option: Regular Mode */}
          <button
            type="button"
            onClick={() => setMode('regular')}
            className={`flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer focus:outline-none relative overflow-hidden ${
              mode === 'regular'
                ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-1 ring-indigo-600/30'
                : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
            }`}
          >
            {mode === 'regular' && (
              <span className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-1">
                <CheckCircle className="w-4 h-4 fill-indigo-600 text-white" />
              </span>
            )}
            <div className={`p-3 rounded-xl max-w-max mb-4 ${mode === 'regular' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Vote className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Vote Reguler</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Siswa dapat langsung berpartisipasi dan memberikan suara langsung dari dashboard user di gadget mereka masing-masing tanpa terminal perantara.
            </p>
            <ul className="text-[10px] text-slate-450 mt-4 space-y-1.5 list-disc pl-4 font-medium">
              <li>Menu Scan QR di dashboard tidak aktif secara operasional</li>
              <li>Siswa login dan membuka halaman pemilihan secara independen</li>
              <li>Halaman Bilik Suara terproteksi dan tidak dapat diakses</li>
            </ul>
          </button>

          {/* Card Option: Booth Mode */}
          <button
            type="button"
            onClick={() => setMode('booth')}
            className={`flex flex-col p-6 rounded-2xl border-2 text-left transition-all duration-300 cursor-pointer focus:outline-none relative overflow-hidden ${
              mode === 'booth'
                ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-1 ring-indigo-600/30'
                : 'border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200'
            }`}
          >
            {mode === 'booth' && (
              <span className="absolute top-4 right-4 bg-indigo-600 text-white rounded-full p-1">
                <CheckCircle className="w-4 h-4 fill-indigo-600 text-white" />
              </span>
            )}
            <div className={`p-3 rounded-xl max-w-max mb-4 ${mode === 'booth' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <Monitor className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Bilik Suara (Booth)</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Sistem bilik terminal terpusat. Siswa wajib memindai token generator di Bilik Suara untuk melakukan otorisasi login pemilih sebelum dipindahkan ke layar vote.
            </p>
            <ul className="text-[10px] text-slate-450 mt-4 space-y-1.5 list-disc pl-4 font-medium">
              <li>Layar pemilih terkunci, hanya dapat melakukan Scan QR</li>
              <li>Akun panitia kesiswaan/bilik (role: vote) diaktifkan untuk login terminal</li>
              <li>Layar terminal bilik otomatis meredirect ke form surat suara</li>
            </ul>
          </button>
        </div>

        {/* Action and Disclaimer Warning */}
        <div className="pt-6 border-t border-slate-100 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-amber-850">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-extrabold uppercase tracking-wider text-[10px]">Perhatian Sistem</p>
              <p className="mt-1 font-semibold text-slate-700">
                Mengubah mode operasional akan langsung berdampak pada perilaku aplikasi di seluruh device pemilih yang sedang aktif secara seketika. Pastikan panitia di lapangan telah diinformasikan sebelum beralih ke mode Bilik Suara.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
