import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  RefreshCw, 
  Lock, 
  X,
  Eye,
  EyeOff,
  UserCheck,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllProfiles, createAdminOrCreator } from '../../lib/adminService';
import { Profile } from '../../types';
import { Card } from '../../components/ui/Card';

export default function KelolaAdmin() {
  const { profile: currentAdminProfile } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'creator'>('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAdmins = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await getAllProfiles();
      const adminProfiles = data.filter(p => (p.role === 'admin' || p.role === 'creator'));
      setAdmins(adminProfiles);
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) return setAddError('Nama lengkap harus diisi.');
    if (!addEmail.trim()) return setAddError('Email Login harus diisi.');
    if (addPassword.length < 6) return setAddError('Sandi minimal harus 6 karakter.');
    if (addPassword !== addConfirmPassword) return setAddError('Konfirmasi sandi tidak sesuai.');
    if (addRole === 'creator') return setAddError('Peran Creator saat ini dinonaktifkan.');

    setActionLoading(true);
    try {
      const res = await createAdminOrCreator(
        currentAdminProfile?.email || 'admin@ppu.com',
        addName,
        addEmail,
        addPassword,
        addRole
      );

      if (res.success) {
        triggerToast('success', `Akun ${addRole === 'creator' ? 'Creator' : 'Admin'} "${addName}" berhasil dibuat.`);
        setAddModalOpen(false);
        // Reset form
        setAddName('');
        setAddEmail('');
        setAddPassword('');
        setAddConfirmPassword('');
        setAddRole('admin');
        loadAdmins();
      } else {
        setAddError(res.error || 'Gagal menyimpan akun.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-150 shadow-emerald-500/10' 
            : 'bg-red-50 text-red-800 border-red-150 shadow-red-500/10'
        }`}>
          <CheckCircle className={`w-4 h-4 ${toast.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-6 rounded-xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Kelola Akun Admin & Creator
          </h1>
          <p className="text-slate-500 text-sm">
            Tinjau seluruh akun dengan hak akses administratif (Admin dan Creator) atau daftarkan akun baru.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadAdmins(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all border border-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-all border border-indigo-700 active:scale-[0.98] shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Admin/Creator
          </button>
        </div>
      </div>

      {/* Table Section */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-medium">Memuat data administrator...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-350 mb-3" />
            <p className="text-sm font-bold text-slate-600">Tidak ada akun administrator ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-5">Nama Lengkap</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Peran (Role)</th>
                  <th className="py-3 px-5">Status Akun</th>
                  <th className="py-3 px-5">Mulai Registrasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-800">{admin.full_name}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">{admin.email}</td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        admin.role === 'creator' 
                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-emerald-700">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Terverifikasi
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-400 font-mono">
                      {new Date(admin.created_at || '').toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tambah Akun Baru</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">Buat akun dengan hak akses admin atau creator</p>
              </div>
              <button 
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateAdminSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Farhan Ramadhan, S.Pd"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Login</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: farhan@sekolah.sch.id"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Peran / Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Peran (Role)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddRole('admin')}
                    className={`p-3 border rounded-xl flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                      addRole === 'admin' 
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700' 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-black">ADMINISTRATOR</span>
                    <span className="text-[9px] font-normal text-slate-400">Hak akses standar admin panel</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="p-3 border border-slate-200 bg-slate-100/80 text-slate-400 rounded-xl flex flex-col items-center gap-1 text-center cursor-not-allowed opacity-50 relative select-none"
                    title="Peran Creator saat ini dinonaktifkan"
                  >
                    <span className="text-xs font-black">CREATOR</span>
                    <span className="text-[9px] font-normal text-slate-400">Hak akses penuh control center</span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5">(Dinonaktifkan)</span>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sandi Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimal 6 karakter"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Konfirmasi Sandi Baru</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi sandi baru"
                  value={addConfirmPassword}
                  onChange={(e) => setAddConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/30 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 border border-indigo-700 rounded-lg shadow-sm shadow-indigo-600/15 cursor-pointer"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
