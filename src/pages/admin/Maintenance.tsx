import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { getUserAccessSettings, saveUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { logAdminAction } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';

export default function Maintenance() {
  const { profile: adminProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserAccessSettings>({
    signup_enabled: true,
    lihat_hasil_enabled: true,
    edit_profil_enabled: true,
    download_kartu_enabled: true,
    visibilitas_kartu_enabled: true,
    maintenance_enabled: false,
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getUserAccessSettings();
        setSettings(data);
      } catch (err) {
        console.error('Gagal memuat pengaturan maintenance:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = () => {
    setSettings((prev) => ({
      ...prev,
      maintenance_enabled: !prev.maintenance_enabled,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await saveUserAccessSettings(settings);
      if (ok) {
        triggerToast('success', 'Status Maintenance Mode berhasil diperbarui!');
        if (adminProfile) {
          await logAdminAction(
            adminProfile.email,
            `Sistem merubah Status Maintenance Mode menjadi: ${settings.maintenance_enabled ? 'AKTIF' : 'NONAKTIF'}`,
            JSON.stringify(settings)
          );
        }
      } else {
        triggerToast('error', 'Gagal menyimpan pengaturan.');
      }
    } catch (err: any) {
      triggerToast('error', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm mt-3 animate-pulse">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white text-xs font-bold border ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500' 
              : 'bg-rose-600 border-rose-500'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className={`absolute top-0 left-0 w-full h-1.5 ${settings.maintenance_enabled ? 'bg-amber-500' : 'bg-indigo-600'}`}></div>
        <div className="space-y-2">
          <div className={`inline-flex p-3 ${settings.maintenance_enabled ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'} rounded-xl`}>
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Maintenance Mode</h1>
            <p className="text-slate-500 text-sm mt-1 max-w-xl">
              Mengatur status operasional aplikasi. Jika diaktifkan, semua akses pengguna akan diarahkan ke halaman pemeliharaan.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="sm:self-end inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Simpan Status'}</span>
        </button>
      </div>

      {/* Toggle Card */}
      <div className={`bg-white rounded-2xl border ${settings.maintenance_enabled ? 'border-amber-200' : 'border-slate-150'} shadow-sm overflow-hidden`}>
        <div className="p-8 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className={`p-4 ${settings.maintenance_enabled ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'} rounded-2xl`}>
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-lg">Aktifkan Maintenance Mode</h3>
              <p className="text-slate-500 text-sm max-w-lg">
                {settings.maintenance_enabled 
                 ? 'Aplikasi sedang dalam mode pemeliharaan. Pengguna akan diarahkan ke halaman maintenance.' 
                 : 'Aplikasi beroperasi normal. Pengguna dapat mengakses semua fitur.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              settings.maintenance_enabled ? 'bg-amber-500' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                settings.maintenance_enabled ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
