import React, { useState, useEffect } from 'react';
import { 
  Shield, Save, AlertCircle, Sparkles, CheckCircle2, 
  UserCheck, Eye, Download, Edit, Power, Settings, ShieldAlert,
  LogIn, UserPlus, BarChart3
} from 'lucide-react';
import { getUserAccessSettings, saveUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { 
  getVotingStatus, setVotingStatus, 
  getMaintenanceMode, setMaintenanceMode, 
  getCriticalSetting, setCriticalSetting 
} from '../../lib/criticalService';
import { logAdminAction } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';

export default function PengaturanLanjutan() {
  const { profile: adminProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Combine both setting sets
  const [settings, setSettings] = useState<UserAccessSettings & { 
    voting_active: boolean;
    login_enabled: boolean;
  }>({
    signup_enabled: true,
    lihat_hasil_enabled: true,
    edit_profil_enabled: true,
    download_kartu_enabled: true,
    visibilitas_kartu_enabled: true,
    maintenance_enabled: false,
    voting_active: false,
    login_enabled: true
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [accessData, vActive, mMode, lEnabled, sEnabled, hEnabled] = await Promise.all([
          getUserAccessSettings(),
          getVotingStatus(),
          getMaintenanceMode(),
          getCriticalSetting('login_enabled'),
          getCriticalSetting('signup_enabled'),
          getCriticalSetting('hasil_enabled')
        ]);

        setSettings({
          ...accessData,
          signup_enabled: sEnabled ?? accessData.signup_enabled,
          lihat_hasil_enabled: hEnabled ?? accessData.lihat_hasil_enabled,
          maintenance_enabled: mMode ?? accessData.maintenance_enabled,
          voting_active: vActive,
          login_enabled: lEnabled ?? true
        });
      } catch (err) {
        console.error('Gagal memuat pengaturan lanjutan:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = (key: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to both service layers to ensure redundancy/compatibility
      const [accessOk, votingOk, maintOk, loginOk, signupOk, hasilOk] = await Promise.all([
        saveUserAccessSettings({
          signup_enabled: settings.signup_enabled,
          lihat_hasil_enabled: settings.lihat_hasil_enabled,
          edit_profil_enabled: settings.edit_profil_enabled,
          download_kartu_enabled: settings.download_kartu_enabled,
          visibilitas_kartu_enabled: settings.visibilitas_kartu_enabled,
          maintenance_enabled: settings.maintenance_enabled,
        }),
        setVotingStatus(settings.voting_active),
        setMaintenanceMode(settings.maintenance_enabled),
        setCriticalSetting('login_enabled', settings.login_enabled),
        setCriticalSetting('signup_enabled', settings.signup_enabled),
        setCriticalSetting('hasil_enabled', settings.lihat_hasil_enabled)
      ]);

      if (accessOk && votingOk && maintOk && loginOk && signupOk && hasilOk) {
        triggerToast('success', 'Seluruh pengaturan sistem berhasil diperbarui dan disinkronkan!');
        if (adminProfile) {
          await logAdminAction(
            adminProfile.email,
            'Sistem merubah konfigurasi advanced (critical + visibility)',
            JSON.stringify(settings)
          );
        }
      } else {
        triggerToast('error', 'Gagal menyimpan beberapa pengaturan ke database cloud.');
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
        <p className="text-slate-500 font-medium text-sm mt-3 animate-pulse">Memuat pengaturan sistem...</p>
      </div>
    );
  }

  const sections = [
    {
      title: 'Status Operasional Utama',
      description: 'Kontrol gerbang utama sistem voting dan aksesibilitas publik.',
      items: [
        {
          key: 'voting_active',
          label: 'Status Bilik Suara (Voting)',
          description: 'Membuka atau menutup akses voting bagi seluruh pemilih secara global.',
          icon: Power,
          iconColor: 'text-rose-600',
          iconBg: 'bg-rose-50'
        },
        {
          key: 'maintenance_enabled',
          label: 'Mode Pemeliharaan (Maintenance)',
          description: 'Mengaktifkan layar pemeliharaan. Akses publik akan ditutup sementara kecuali untuk Admin.',
          icon: Settings,
          iconColor: 'text-amber-600',
          iconBg: 'bg-amber-50'
        }
      ]
    },
    {
      title: 'Visibilitas Antarmuka Publik',
      description: 'Atur elemen navigasi yang muncul pada halaman depan PPU.',
      items: [
        {
          key: 'login_enabled',
          label: 'Tombol Login ke Akun',
          description: 'Menampilkan atau menyembunyikan akses masuk sistem di halaman landing.',
          icon: LogIn,
          iconColor: 'text-indigo-600',
          iconBg: 'bg-indigo-50'
        },
        {
          key: 'signup_enabled',
          label: 'Tombol Registrasi Baru',
          description: 'Kontrol pendaftaran akun baru bagi pemilih yang belum terdata.',
          icon: UserPlus,
          iconColor: 'text-emerald-600',
          iconBg: 'bg-emerald-50'
        },
        {
          key: 'lihat_hasil_enabled',
          label: 'Tombol Lihat Hasil Pemilu',
          description: 'Menampilkan rekapitulasi suara sementara ke publik jika diizinkan.',
          icon: BarChart3,
          iconColor: 'text-violet-600',
          iconBg: 'bg-violet-50'
        }
      ]
    },
    {
      title: 'Hak Akses & Fitur Pemilih',
      description: 'Kelola preferensi fitur yang dapat digunakan oleh user di dashboard mereka.',
      items: [
        {
          key: 'edit_profil_enabled',
          label: 'Izin Perubahan Nama Profil',
          description: 'Izinkan pemilih memodifikasi nama lengkap mereka demi validitas sertifikat.',
          icon: Edit,
          iconColor: 'text-blue-600',
          iconBg: 'bg-blue-50'
        },
        {
          key: 'visibilitas_kartu_enabled',
          label: 'Tampilan Kartu Pemilih Premium',
          description: 'Menampilkan desain kartu pemilih digital lengkap dengan QR code dan serial.',
          icon: Sparkles,
          iconColor: 'text-indigo-600',
          iconBg: 'bg-indigo-50'
        },
        {
          key: 'download_kartu_enabled',
          label: 'Opsi Unduh Kartu Pemilih (PNG)',
          description: 'Menampilkan tombol download kartu digital dalam format gambar resolusi tinggi.',
          icon: Download,
          iconColor: 'text-indigo-600',
          iconBg: 'bg-indigo-50'
        }
      ]
    }
  ];

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8 min-h-screen">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white text-xs font-bold border ${
            toast.type === 'success' 
              ? 'bg-emerald-600 border-emerald-500 shadow-emerald-500/10' 
              : 'bg-rose-600 border-rose-500 shadow-rose-500/10'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-150 shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600"></div>
        <div className="space-y-2">
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pengaturan Lanjutan</h1>
            <p className="text-slate-500 text-sm mt-1 max-w-xl">
              Pusat kendali operasional kritis dan visibilitas akses antarmuka sistem PPU secara menyeluruh.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="sm:self-end inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Menyimpan...' : 'Terapkan Perubahan'}</span>
        </button>
      </div>

      {/* Sections Grid */}
      <div className="space-y-8">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-4">
            <div className="px-1">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{section.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{section.description}</p>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden divide-y divide-slate-100">
              {section.items.map((item) => (
                <div key={item.key} className="p-6 sm:p-8 flex items-start gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className={`p-3 ${item.iconBg} ${item.iconColor} rounded-xl shrink-0`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-slate-800 text-base">{item.label}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      (settings as any)[item.key] ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        (settings as any)[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info Alert Box */}
      <div className="flex items-start gap-3 bg-[#f8fafc] border border-slate-200 p-4 rounded-xl text-[10px] sm:text-xs text-slate-500 leading-relaxed italic">
        <Shield className="w-4 h-4 text-slate-400 shrink-0" />
        <p>
          Mode Pengaturan Lanjutan menggabungkan modul kontrol visibilitas dan pusat kendali kritis. Perubahan pada Status Operasional Utama dapat mengunci akses sistem secara instan bagi seluruh pengguna. Gunakan dengan penuh pertimbangan.
        </p>
      </div>
    </div>
  );
}
