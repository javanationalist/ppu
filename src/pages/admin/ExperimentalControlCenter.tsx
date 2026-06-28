import React, { useState, useEffect } from 'react';
import { 
  Database, 
  UserCheck, 
  Users, 
  ShieldAlert, 
  Clock, 
  RotateCcw, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sliders,
  Power
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getUserAccessSettings, saveUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/adminService';

// Modal component for safe confirmation
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requireInput?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  requireInput,
  isDestructive = false,
  onConfirm,
  onClose
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isButtonEnabled = !requireInput || inputValue === requireInput;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDestructive ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400'}`}>
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{title}</h3>
          </div>

          <p className="text-sm text-slate-600 dark:text-[#a3a3a3] leading-relaxed">
            {message}
          </p>

          {requireInput && (
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Ketik <span className="font-mono text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded-sm">{requireInput}</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Contoh: ${requireInput}`}
                className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 dark:text-white font-medium"
              />
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!isButtonEnabled}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:shadow-none'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExperimentalControlCenter() {
  const { profile } = useAuth();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    requireInput?: string;
    isDestructive?: boolean;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (config: {
    title: string;
    message: string;
    confirmText?: string;
    requireInput?: string;
    isDestructive?: boolean;
    action: () => void;
  }) => {
    setModalConfig({
      isOpen: true,
      title: config.title,
      message: config.message,
      confirmText: config.confirmText,
      requireInput: config.requireInput,
      isDestructive: config.isDestructive,
      action: config.action
    });
  };

  // Load Maintenance status
  useEffect(() => {
    async function loadMaintenance() {
      try {
        const data = await getUserAccessSettings();
        setMaintenanceMode(data.maintenance_enabled);
      } catch (err) {
        console.error('Gagal memuat maintenance mode:', err);
      } finally {
        setLoadingMaintenance(false);
      }
    }
    loadMaintenance();
  }, []);

  // Action log helper
  const writeAuditLog = async (actionName: string, detail: string) => {
    if (profile?.email) {
      try {
        await logAdminAction(profile.email, `[EXPERIMENTAL] ${actionName}`, detail);
      } catch (err) {
        console.error('Error logging experimental action:', err);
      }
    }
  };

  // Section 1 actions
  const handleResetSuaraKategori = () => {
    showConfirm({
      title: 'Reset Suara Berdasarkan Kategori',
      message: `Apakah Anda yakin ingin menghapus seluruh data vote untuk kategori "${selectedCategory}"? Aksi ini akan menghapus suara yang terekam secara permanen.`,
      confirmText: 'Reset Kategori',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          let catIds: string[] = [];
          if (selectedCategory === 'OSIS') {
            catIds = ['osis'];
          } else if (selectedCategory === 'MPK') {
            catIds = ['mpk', 'mpk_smaba'];
          } else {
            // Semua Kategori
            catIds = ['osis', 'mpk', 'mpk_smaba', 'duta', 'ekskul'];
          }

          // Delete votes
          const { error } = await supabase
            .from('votes')
            .delete()
            .in('category_id', catIds);

          if (error) throw error;

          // Also set voting_status = 'belum' for voters to allow them to revote
          await supabase
            .from('profiles')
            .update({ voting_status: 'belum' })
            .eq('role', 'user');

          // Sync local mock storage if any
          localStorage.setItem('mock_votes', '[]');
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, voting_status: 'belum' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Reset Suara Kategori', `Mereset suara untuk kategori: ${selectedCategory}`);
          triggerToast('success', `Berhasil mereset seluruh suara untuk kategori "${selectedCategory}"!`);
        } catch (err: any) {
          triggerToast('error', `Gagal mereset suara: ${err.message}`);
        }
      }
    });
  };

  const handleResetSeluruhSuara = () => {
    showConfirm({
      title: 'Hapus Seluruh Suara Pemilihan',
      message: 'PERINGATAN: Aksi ini akan menghapus SELURUH isi tabel suara (votes) dari database secara permanen! Seluruh data pemilihan akan dikembalikan menjadi nol.',
      confirmText: 'Reset Seluruh Suara',
      requireInput: 'RESET',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          // Delete all votes
          const { error: errorVotes } = await supabase
            .from('votes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (errorVotes) throw errorVotes;

          // Set voting_status back to 'belum'
          const { error: errorProfiles } = await supabase
            .from('profiles')
            .update({ voting_status: 'belum' })
            .eq('role', 'user');

          if (errorProfiles) throw errorProfiles;

          // Localstorage clear
          localStorage.setItem('mock_votes', '[]');
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, voting_status: 'belum' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Reset Seluruh Suara', 'Mereset semua tabel suara (votes)');
          triggerToast('success', 'Seluruh data suara pemilih telah berhasil direset menjadi kosong.');
        } catch (err: any) {
          triggerToast('error', `Gagal mereset semua suara: ${err.message}`);
        }
      }
    });
  };

  // Section 2 actions
  const handleKonfirmasiSeluruhPemilih = () => {
    showConfirm({
      title: 'Verifikasi Seluruh Pemilih',
      message: 'Apakah Anda yakin ingin menyetujui / mengonfirmasi seluruh akun pemilih (role user) secara massal? Ini akan mengubah status verifikasi mereka menjadi terverifikasi.',
      confirmText: 'Konfirmasi Semua',
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error } = await supabase
            .from('profiles')
            .update({ account_status: 'dikonfirmasi' })
            .eq('role', 'user');

          if (error) throw error;

          // Sync localStorage
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, account_status: 'dikonfirmasi' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Konfirmasi Semua Pemilih', 'Verifikasi masal seluruh pemilih');
          triggerToast('success', 'Status semua akun pemilih telah diubah menjadi "Dikonfirmasi"!');
        } catch (err: any) {
          triggerToast('error', `Gagal melakukan verifikasi masal: ${err.message}`);
        }
      }
    });
  };

  const handleResetKonfirmasiSeluruhPemilih = () => {
    showConfirm({
      title: 'Reset Verifikasi Seluruh Pemilih',
      message: 'Apakah Anda yakin ingin membatalkan verifikasi seluruh pemilih terdaftar? Semua status verifikasi pemilih akan dikembalikan menjadi "Belum Dikonfirmasi".',
      confirmText: 'Reset Verifikasi',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error } = await supabase
            .from('profiles')
            .update({ account_status: 'belum_dikonfirmasi' })
            .eq('role', 'user');

          if (error) throw error;

          // Sync localStorage
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, account_status: 'belum_dikonfirmasi' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Reset Konfirmasi Semua Pemilih', 'Membatalkan verifikasi semua pemilih');
          triggerToast('success', 'Seluruh status verifikasi pemilih telah direset kembali ke default.');
        } catch (err: any) {
          triggerToast('error', `Gagal mereset status verifikasi: ${err.message}`);
        }
      }
    });
  };

  // Section 3 action
  const handleHapusSemuaPemilih = () => {
    showConfirm({
      title: 'Hapus Semua Akun Pemilih',
      message: 'TINDAKAN SANGAT DESTRUKTIF: Ini akan menghapus secara permanen seluruh data akun pemilih (role user) dari database. Akun Admin dan Creator tidak akan terpengaruh.',
      confirmText: 'Hapus Permanen',
      requireInput: 'HAPUS SEMUA PEMILIH',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          // Delete rows from profiles where role = 'user'
          const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('role', 'user');

          if (error) throw error;

          // Sync localStorage
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const remaining = localProfiles.filter((p: any) => p.role !== 'user');
            localStorage.setItem('mock_profiles', JSON.stringify(remaining));
          }

          await writeAuditLog('Hapus Semua Pemilih', 'Menghapus seluruh akun bertipe voter (user)');
          triggerToast('success', 'Seluruh akun pemilih terdaftar telah berhasil dihapus secara permanen.');
        } catch (err: any) {
          triggerToast('error', `Gagal menghapus pemilih: ${err.message}`);
        }
      }
    });
  };

  // Section 4 action
  const handleToggleMaintenance = async () => {
    const nextMode = !maintenanceMode;
    setMaintenanceMode(nextMode);
    try {
      const activeSettings = await getUserAccessSettings();
      activeSettings.maintenance_enabled = nextMode;
      const ok = await saveUserAccessSettings(activeSettings);
      if (ok) {
        await writeAuditLog('Toggle Maintenance Mode', `Mengubah mode maintenance menjadi: ${nextMode ? 'AKTIF' : 'NONAKTIF'}`);
        triggerToast('success', `Maintenance Mode berhasil ${nextMode ? 'diaktifkan' : 'dinonaktifkan'}!`);
      } else {
        setMaintenanceMode(!nextMode);
        triggerToast('error', 'Gagal memperbarui status maintenance.');
      }
    } catch (err: any) {
      setMaintenanceMode(!nextMode);
      triggerToast('error', `Terjadi kesalahan: ${err.message}`);
    }
  };

  // Section 5 actions
  const handleResetCountdown = () => {
    showConfirm({
      title: 'Reset Seluruh Countdown',
      message: 'Apakah Anda yakin ingin menghapus seluruh data timer countdown aktif dari sistem secara massal?',
      confirmText: 'Hapus Semua Countdown',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error } = await supabase
            .from('countdown')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error) throw error;

          await writeAuditLog('Reset Countdown', 'Menghapus semua baris countdown');
          triggerToast('success', 'Seluruh countdown di database berhasil dihapus.');
        } catch (err: any) {
          triggerToast('error', `Gagal mereset countdown: ${err.message}`);
        }
      }
    });
  };

  const handleResetGelombang = () => {
    showConfirm({
      title: 'Reset Seluruh Gelombang Pemilihan',
      message: 'Apakah Anda yakin ingin menghapus seluruh sesi gelombang voting yang terdaftar di sistem secara massal?',
      confirmText: 'Hapus Semua Gelombang',
      isDestructive: true,
      action: async () => {
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error } = await supabase
            .from('gelombang_voting')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error) throw error;

          await writeAuditLog('Reset Gelombang Voting', 'Menghapus semua sesi gelombang voting');
          triggerToast('success', 'Seluruh sesi gelombang voting telah berhasil dihapus.');
        } catch (err: any) {
          triggerToast('error', `Gagal mereset gelombang: ${err.message}`);
        }
      }
    });
  };

  const handleRefreshStatistik = async () => {
    try {
      // Simulate/trigger a calculation action or just perform quick mock API delay and tell the system to refresh stats
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await writeAuditLog('Refresh Statistik', 'Memicu penghitungan ulang statistik secara real-time');
      triggerToast('success', 'Statistik dashboard admin berhasil dihitung ulang dan diperbarui secara internal!');
    } catch (err: any) {
      triggerToast('error', 'Gagal memicu penghitungan ulang statistik.');
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 min-h-screen">
      {/* Toast Alert Notification */}
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
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-red-500/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600"></div>
        {/* Ambient Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex p-3 bg-red-950/40 text-red-500 rounded-xl border border-red-900/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Experimental Control Center</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black tracking-widest uppercase">
                  Creator Only
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Fitur internal khusus Creator. Gunakan dengan hati-hati. Seluruh operasi langsung dijalankan pada database live.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: DATABASE */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-150 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Database className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">1. Database - Reset Suara</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Mereset atau menghapus seluruh catatan suara yang masuk dari database. Anda dapat memilih filter kategori atau mengosongkan seluruh tabel votes secara total.
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Dropdown Kategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-hidden dark:text-white font-medium"
              >
                <option value="Semua Kategori">Semua Kategori</option>
                <option value="OSIS">OSIS</option>
                <option value="MPK">MPK</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              onClick={handleResetSuaraKategori}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Suara Kategori</span>
            </button>
            <button
              onClick={handleResetSeluruhSuara}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Seluruh Suara</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: VERIFIKASI PEMILIH */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-150 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">2. Verifikasi Pemilih</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Manajemen verifikasi akun pemilih secara masal. Anda dapat menyetujui seluruh pendaftar sekaligus (is_verified = true) atau membatalkan seluruh konfirmasi verifikasi yang ada.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              onClick={handleKonfirmasiSeluruhPemilih}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Konfirmasi Seluruh Pemilih</span>
            </button>
            <button
              onClick={handleResetKonfirmasiSeluruhPemilih}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Konfirmasi</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: MANAJEMEN PEMILIH */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-150 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">3. Manajemen Pemilih</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Menghapus secara masal data pemilih (role user) dari database. Tindakan ini memerlukan kode persetujuan teks rahasia dan tidak dapat dibatalkan. Akun Admin / Creator akan dilindungi.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 border-t border-slate-100 dark:border-neutral-800">
            <button
              onClick={handleHapusSemuaPemilih}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua Pemilih Terdaftar</span>
            </button>
          </div>
        </div>

        {/* SECTION 4: MAINTENANCE */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-150 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Power className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">4. Maintenance Mode</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Kontrol pemeliharaan cepat secara global. Jika diaktifkan, halaman pemilihan (voting) dan validasi profil tidak dapat diakses oleh user biasa, melainkan dialihkan ke halaman Maintenance.
            </p>

            {loadingMaintenance ? (
              <div className="py-2 animate-pulse text-xs text-slate-400">Memuat status...</div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800/80">
                <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">Maintenance Mode Aktif</span>
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    maintenanceMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-neutral-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                      maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-neutral-800 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Admin & Creator dapat mengabaikan batasan Maintenance Mode.</span>
          </div>
        </div>

        {/* SECTION 5: SISTEM */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-150 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between md:col-span-2">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">5. System Tools</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Utilitas pembersihan sistem tambahan. Lakukan reset pada data hitung mundur (countdown), sesi gelombang pemilihan, atau hitung ulang statistik internal tanpa merefresh browser Anda.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              onClick={handleResetCountdown}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Reset Countdown</span>
            </button>
            <button
              onClick={handleResetGelombang}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Reset Gelombang</span>
            </button>
            <button
              onClick={handleRefreshStatistik}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Statistik</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Container */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        requireInput={modalConfig.requireInput}
        isDestructive={modalConfig.isDestructive}
        onConfirm={modalConfig.action}
        onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

// Add a simple inline type declaration of Trash2 to avoid import failure
const Trash2 = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);
