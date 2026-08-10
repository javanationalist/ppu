import React, { useState, useEffect, useCallback } from 'react';
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
  Sliders,
  Power,
  Loader2,
  Trash2,
  Globe,
  UserPlus,
  Eye,
  FileText,
  CreditCard,
  UserCog
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getUserAccessSettings, saveUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { useAuth } from '../../contexts/AuthContext';
import { logAdminAction } from '../../lib/adminService';
import { getCategories } from '../../lib/votingService';
import { Category } from '../../types/candidate';

// Modal component for safe confirmation
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requireInput?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
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
  isLoading = false,
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
                disabled={isLoading}
                className="w-full px-4 py-2 text-sm bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 dark:text-white font-medium disabled:opacity-50"
              />
            </div>
          )}
        </div>

        <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={!isButtonEnabled || isLoading}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-sm cursor-pointer flex items-center gap-2 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:shadow-none'
                : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:shadow-none'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface TelemetryData {
  totalVotes: number;
  totalVoters: number;
  confirmedVoters: number;
  activeCountdowns: number;
  activeGelombang: number;
}

export default function ExperimentalControlCenter() {
  const { profile } = useAuth();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Category selection for reset
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Access Settings
  const [accessSettings, setAccessSettings] = useState<UserAccessSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [updatingSettingKey, setUpdatingSettingKey] = useState<string | null>(null);

  // Telemetry Dashboard
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  // Action Loading States
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    requireInput?: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {}
  });

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const setActionState = (key: string, isLoading: boolean) => {
    setActionLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const showConfirm = (config: {
    title: string;
    message: string;
    confirmText?: string;
    requireInput?: string;
    isDestructive?: boolean;
    action: () => Promise<void>;
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

  // Helper write audit log
  const writeAuditLog = async (actionName: string, detail: string) => {
    if (profile?.email) {
      try {
        await logAdminAction(profile.email, `[EXPERIMENTAL] ${actionName}`, detail);
      } catch (err) {
        console.error('Error logging experimental action:', err);
      }
    }
  };

  // Fetch Telemetry stats live from Supabase
  const fetchTelemetry = useCallback(async () => {
    setLoadingTelemetry(true);
    try {
      if (!isSupabaseConfigured) {
        setTelemetry({
          totalVotes: 0,
          totalVoters: 0,
          confirmedVoters: 0,
          activeCountdowns: 0,
          activeGelombang: 0,
        });
        return;
      }

      const [
        { count: totalVotes },
        { count: totalVoters },
        { count: confirmedVoters },
        { count: activeCountdowns },
        { count: activeGelombang }
      ] = await Promise.all([
        supabase.from('votes').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('account_status', 'dikonfirmasi'),
        supabase.from('countdown').select('*', { count: 'exact', head: true }),
        supabase.from('gelombang_voting').select('*', { count: 'exact', head: true })
      ]);

      setTelemetry({
        totalVotes: totalVotes || 0,
        totalVoters: totalVoters || 0,
        confirmedVoters: confirmedVoters || 0,
        activeCountdowns: activeCountdowns || 0,
        activeGelombang: activeGelombang || 0,
      });
    } catch (err: any) {
      console.error('Failed to fetch system telemetry:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  }, []);

  // Fetch categories from database
  const loadCategoriesData = useCallback(async () => {
    setLoadingCategories(true);
    try {
      if (isSupabaseConfigured) {
        const catList = await getCategories();
        setCategories(catList);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Load Access Settings
  const loadAccessSettingsData = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const data = await getUserAccessSettings();
      setAccessSettings(data);
    } catch (err: any) {
      console.error('Error loading access settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    loadCategoriesData();
    loadAccessSettingsData();
  }, [fetchTelemetry, loadCategoriesData, loadAccessSettingsData]);

  // Section 1 actions
  const handleResetSuaraKategori = () => {
    const selectedCatObj = categories.find(c => c.id === selectedCategory);
    const catName = selectedCategory === 'all' ? 'Semua Kategori' : (selectedCatObj?.name || selectedCategory);

    showConfirm({
      title: 'Reset Suara Kategori',
      message: `Apakah Anda yakin ingin menghapus seluruh data vote untuk kategori "${catName}"? Aksi ini akan menghapus suara yang terekam secara permanen.`,
      confirmText: 'Reset Kategori',
      isDestructive: true,
      action: async () => {
        setActionState('reset_cat', true);
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          if (selectedCategory === 'all') {
            // Reset all votes
            const { error: errVotes } = await supabase
              .from('votes')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');

            if (errVotes) throw errVotes;

            // Reset profile voting status
            const { error: errProf } = await supabase
              .from('profiles')
              .update({ voting_status: 'belum' })
              .eq('role', 'user');

            if (errProf) throw errProf;
          } else {
            // Delete votes for specific category
            const { error: errVotes } = await supabase
              .from('votes')
              .delete()
              .eq('category_id', selectedCategory);

            if (errVotes) throw errVotes;

            // Update voting_status for voters who now have 0 remaining votes
            const { data: remainingVotes } = await supabase
              .from('votes')
              .select('voter_id');

            const votersWithVotes = new Set((remainingVotes || []).map(v => v.voter_id));

            const { data: userProfiles } = await supabase
              .from('profiles')
              .select('id')
              .eq('role', 'user');

            const usersToReset = (userProfiles || [])
              .filter(u => !votersWithVotes.has(u.id))
              .map(u => u.id);

            if (usersToReset.length > 0) {
              await supabase
                .from('profiles')
                .update({ voting_status: 'belum' })
                .in('id', usersToReset);
            }
          }

          // Sync localStorage if any
          localStorage.setItem('mock_votes', '[]');
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, voting_status: 'belum' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Reset Suara Kategori', `Mereset suara untuk kategori: ${catName}`);
          triggerToast('success', `Berhasil mereset seluruh suara untuk kategori "${catName}"!`);
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal mereset suara: ${err.message || err}`);
        } finally {
          setActionState('reset_cat', false);
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
        setActionState('reset_all_votes', true);
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error: errorVotes } = await supabase
            .from('votes')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (errorVotes) throw errorVotes;

          const { error: errorProfiles } = await supabase
            .from('profiles')
            .update({ voting_status: 'belum' })
            .eq('role', 'user');

          if (errorProfiles) throw errorProfiles;

          // Clear localStorage sync
          localStorage.setItem('mock_votes', '[]');
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, voting_status: 'belum' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Reset Seluruh Suara', 'Mereset semua tabel suara (votes)');
          triggerToast('success', 'Seluruh data suara pemilih telah berhasil direset menjadi kosong.');
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal mereset semua suara: ${err.message || err}`);
        } finally {
          setActionState('reset_all_votes', false);
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
        setActionState('confirm_all_voters', true);
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const nowIso = new Date().toISOString();
          const { error } = await supabase
            .from('profiles')
            .update({ account_status: 'dikonfirmasi', confirmed_at: nowIso })
            .eq('role', 'user');

          if (error) throw error;

          // Local storage sync
          const localProfilesStr = localStorage.getItem('mock_profiles');
          if (localProfilesStr) {
            const localProfiles = JSON.parse(localProfilesStr);
            const updated = localProfiles.map((p: any) => p.role === 'user' ? { ...p, account_status: 'dikonfirmasi' } : p);
            localStorage.setItem('mock_profiles', JSON.stringify(updated));
          }

          await writeAuditLog('Konfirmasi Semua Pemilih', 'Verifikasi masal seluruh pemilih');
          triggerToast('success', 'Status semua akun pemilih telah diubah menjadi "Dikonfirmasi"!');
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal melakukan verifikasi masal: ${err.message || err}`);
        } finally {
          setActionState('confirm_all_voters', false);
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
        setActionState('reset_voter_confirm', true);
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          const { error } = await supabase
            .from('profiles')
            .update({ account_status: 'belum_dikonfirmasi', confirmed_at: null })
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
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal mereset status verifikasi: ${err.message || err}`);
        } finally {
          setActionState('reset_voter_confirm', false);
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
        setActionState('delete_all_voters', true);
        try {
          if (!isSupabaseConfigured) {
            triggerToast('error', 'Koneksi database tidak terkonfigurasi.');
            return;
          }

          // Delete votes first to maintain integrity
          await supabase.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal menghapus pemilih: ${err.message || err}`);
        } finally {
          setActionState('delete_all_voters', false);
        }
      }
    });
  };

  // Toggle Access Setting Helper
  const handleToggleAccessSetting = async (key: keyof UserAccessSettings, label: string) => {
    if (!accessSettings) return;
    setUpdatingSettingKey(key);
    const newValue = !accessSettings[key];
    const updated = { ...accessSettings, [key]: newValue };

    try {
      setAccessSettings(updated);
      const ok = await saveUserAccessSettings(updated);
      if (ok) {
        await writeAuditLog(`Toggle ${label}`, `Status ${label} diubah menjadi: ${newValue ? 'AKTIF' : 'NONAKTIF'}`);
        triggerToast('success', `Status ${label} berhasil ${newValue ? 'diaktifkan' : 'dinonaktifkan'}!`);
      } else {
        // Revert
        setAccessSettings(accessSettings);
        triggerToast('error', `Gagal menyimpan pengaturan ${label}.`);
      }
    } catch (err: any) {
      setAccessSettings(accessSettings);
      triggerToast('error', `Terjadi kesalahan: ${err.message || err}`);
    } finally {
      setUpdatingSettingKey(null);
      await fetchTelemetry();
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
        setActionState('reset_countdown', true);
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
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal mereset countdown: ${err.message || err}`);
        } finally {
          setActionState('reset_countdown', false);
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
        setActionState('reset_gelombang', true);
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

          // Disable gelombang_config if exists
          await supabase.from('gelombang_config').upsert({ id: 'default', is_active: false });

          await writeAuditLog('Reset Gelombang Voting', 'Menghapus semua sesi gelombang voting');
          triggerToast('success', 'Seluruh sesi gelombang voting telah berhasil dihapus.');
          await fetchTelemetry();
        } catch (err: any) {
          triggerToast('error', `Gagal mereset gelombang: ${err.message || err}`);
        } finally {
          setActionState('reset_gelombang', false);
        }
      }
    });
  };

  const handleRefreshStatistik = async () => {
    setActionState('refresh_telemetry', true);
    try {
      await fetchTelemetry();
      await loadCategoriesData();
      await loadAccessSettingsData();
      await writeAuditLog('Refresh Telemetry', 'Memperbarui metrik sistem live dari Supabase');
      triggerToast('success', 'Statistik & Telemetry berhasil diperbarui dari Supabase!');
    } catch (err: any) {
      triggerToast('error', 'Gagal memicu penghitungan ulang statistik.');
    } finally {
      setActionState('refresh_telemetry', false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 min-h-screen pb-16">
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
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black tracking-widest uppercase">
                  Creator Only
                </span>
              </h1>
              <p className="text-slate-400 text-sm mt-1 max-w-xl">
                Fitur internal khusus Creator. Seluruh operasi langsung terhubung dan mengeksekusi aksi pada database Supabase live secara real-time.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefreshStatistik}
            disabled={actionLoading['refresh_telemetry']}
            className="self-start sm:self-center px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading['refresh_telemetry'] ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* System Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Suara</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            {loadingTelemetry ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {telemetry?.totalVotes.toLocaleString('id-ID') || 0}
              </span>
            )}
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">di tabel votes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Pemilih</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            {loadingTelemetry ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {telemetry?.totalVoters.toLocaleString('id-ID') || 0}
              </span>
            )}
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">akun role user</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Terkonfirmasi</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            {loadingTelemetry ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {telemetry?.confirmedVoters.toLocaleString('id-ID') || 0}
              </span>
            )}
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">status dikonfirmasi</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Timer Active</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            {loadingTelemetry ? (
              <div className="h-7 w-12 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-md" />
            ) : (
              <span className="text-2xl font-black text-slate-800 dark:text-white">
                {telemetry?.activeCountdowns || 0}
              </span>
            )}
            <span className="block text-[10px] text-slate-400 font-medium mt-0.5">countdown aktif</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1f1f1f] p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Maintenance</span>
            <Power className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            {loadingSettings ? (
              <div className="h-7 w-16 bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-md" />
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                accessSettings?.maintenance_enabled 
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {accessSettings?.maintenance_enabled ? 'Aktif' : 'Off'}
              </span>
            )}
            <span className="block text-[10px] text-slate-400 font-medium mt-1">mode sistem</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: DATABASE - RESET SUARA */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Database className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">1. Database - Reset Suara</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Mereset atau menghapus seluruh catatan suara yang masuk dari database. Pilih kategori tertentu atau kosongkan seluruh tabel suara secara menyeluruh.
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Filter Kategori Database
              </label>
              {loadingCategories ? (
                <div className="h-9 w-full bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-hidden dark:text-white font-medium"
                >
                  <option value="all">Semua Kategori ({telemetry?.totalVotes || 0} Suara)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.type?.toUpperCase() || 'REGULER'})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleResetSuaraKategori}
              disabled={actionLoading['reset_cat']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['reset_cat'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Reset Suara Kategori</span>
            </button>
            <button
              type="button"
              onClick={handleResetSeluruhSuara}
              disabled={actionLoading['reset_all_votes']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['reset_all_votes'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Reset Seluruh Suara</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: VERIFIKASI PEMILIH */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <UserCheck className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">2. Verifikasi Pemilih Massal</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Manajemen verifikasi akun pemilih secara masal di Supabase. Anda dapat menyetujui seluruh pendaftar sekaligus (account_status = dikonfirmasi) atau membatalkan seluruh konfirmasi.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleKonfirmasiSeluruhPemilih}
              disabled={actionLoading['confirm_all_voters']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['confirm_all_voters'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Konfirmasi Seluruh Pemilih</span>
            </button>
            <button
              type="button"
              onClick={handleResetKonfirmasiSeluruhPemilih}
              disabled={actionLoading['reset_voter_confirm']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['reset_voter_confirm'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>Reset Konfirmasi</span>
            </button>
          </div>
        </div>

        {/* SECTION 3: MANAJEMEN PEMILIH */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Users className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">3. Hapus Seluruh Pemilih</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Menghapus secara masal data pemilih (role user) dari database Supabase. Tindakan ini memerlukan verifikasi teks rahasia dan tidak dapat dibatalkan. Akun Admin / Creator tetap dilindungi.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleHapusSemuaPemilih}
              disabled={actionLoading['delete_all_voters']}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['delete_all_voters'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>Hapus Semua Pemilih Terdaftar</span>
            </button>
          </div>
        </div>

        {/* SECTION 4: KONTROL AKSES & MAINTENANCE SYSTEM */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Power className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">4. Kontrol Akses & Maintenance</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Sakelar kontrol akses utama sistem. Perubahan akan langsung disimpan ke Supabase tabel <code className="text-xs font-mono bg-slate-100 dark:bg-neutral-800 px-1 py-0.5 rounded-xs">user_access_settings</code>.
            </p>

            {loadingSettings || !accessSettings ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 w-full bg-slate-100 dark:bg-neutral-800 animate-pulse rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {/* Maintenance Mode Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Power className={`w-4 h-4 ${accessSettings.maintenance_enabled ? 'text-rose-500' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Maintenance Mode</span>
                      <span className="text-[10px] text-slate-400">Pengalihan otomatis user ke halaman Maintenance</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingSettingKey === 'maintenance_enabled'}
                    onClick={() => handleToggleAccessSetting('maintenance_enabled', 'Maintenance Mode')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      accessSettings.maintenance_enabled ? 'bg-rose-600' : 'bg-slate-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        accessSettings.maintenance_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Akses Voting Global Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Globe className={`w-4 h-4 ${accessSettings.voting_global_enabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Voting Global</span>
                      <span className="text-[10px] text-slate-400">Izin akses alur pemungutan suara</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingSettingKey === 'voting_global_enabled'}
                    onClick={() => handleToggleAccessSetting('voting_global_enabled', 'Akses Voting Global')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      accessSettings.voting_global_enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        accessSettings.voting_global_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Pendaftaran Akun Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <UserPlus className={`w-4 h-4 ${accessSettings.signup_enabled ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Pendaftaran Baru</span>
                      <span className="text-[10px] text-slate-400">Registrasi akun baru untuk pemilih</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingSettingKey === 'signup_enabled'}
                    onClick={() => handleToggleAccessSetting('signup_enabled', 'Pendaftaran Baru')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      accessSettings.signup_enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        accessSettings.signup_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Lihat Hasil Pemilihan Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Eye className={`w-4 h-4 ${accessSettings.lihat_hasil_enabled ? 'text-blue-500' : 'text-slate-400'}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Lihat Hasil</span>
                      <span className="text-[10px] text-slate-400">Visibilitas perolehan suara publik</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={updatingSettingKey === 'lihat_hasil_enabled'}
                    onClick={() => handleToggleAccessSetting('lihat_hasil_enabled', 'Lihat Hasil')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      accessSettings.lihat_hasil_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-neutral-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        accessSettings.lihat_hasil_enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 text-[10px] text-slate-400 border-t border-slate-100 dark:border-neutral-800 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Admin & Creator dapat mengabaikan beberapa pembatasan sistem di atas.</span>
          </div>
        </div>

        {/* SECTION 5: SYSTEM TOOLS */}
        <div className="bg-white dark:bg-[#1f1f1f] rounded-2xl border border-slate-200 dark:border-neutral-800 shadow-xs overflow-hidden flex flex-col justify-between md:col-span-2">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
              <Sliders className="w-5 h-5 text-indigo-500" />
              <h2 className="font-bold text-slate-800 dark:text-white text-md">5. System Utilities</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed">
              Utilitas pembersihan sistem tambahan. Lakukan reset pada data hitung mundur (countdown), sesi gelombang pemilihan, atau hitung ulang statistik internal tanpa merefresh browser Anda.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-neutral-900 px-6 py-4 flex flex-col sm:flex-row gap-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleResetCountdown}
              disabled={actionLoading['reset_countdown']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['reset_countdown'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              <span>Reset Countdown</span>
            </button>
            <button
              type="button"
              onClick={handleResetGelombang}
              disabled={actionLoading['reset_gelombang']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['reset_gelombang'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
              <span>Reset Gelombang</span>
            </button>
            <button
              type="button"
              onClick={handleRefreshStatistik}
              disabled={actionLoading['refresh_telemetry']}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {actionLoading['refresh_telemetry'] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Refresh Telemetry</span>
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
