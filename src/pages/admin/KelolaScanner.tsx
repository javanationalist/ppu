import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  RefreshCw, 
  Lock, 
  Unlock,
  X, 
  Eye, 
  EyeOff, 
  Trash2, 
  Edit2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  UserCheck,
  UserX,
  Power,
  ShieldAlert,
  Copy,
  Check,
  Key,
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getScannerProfiles, 
  createScannerAccount, 
  updateScannerAccount, 
  toggleScannerActivation, 
  deleteScannerAccount,
  verifyAdminPassword 
} from '../../lib/adminService';
import { Profile } from '../../types';
import { Card } from '../../components/ui/Card';

export default function KelolaScanner() {
  const { profile: currentAdminProfile } = useAuth();
  const [scanners, setScanners] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const [selectedScanner, setSelectedScanner] = useState<Profile | null>(null);
  const [isPinRevealed, setIsPinRevealed] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Re-auth Admin State
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Form States (Add/Edit)
  const [actionLoading, setActionLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadScanners = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await getScannerProfiles();
      setScanners(data);
      // Update selected scanner if opened
      if (selectedScanner) {
        const updated = data.find(s => s.id === selectedScanner.id);
        if (updated) setSelectedScanner(updated);
      }
    } catch (err: any) {
      console.error('Failed to load scanner profiles:', err);
      triggerToast('error', err.message || 'Gagal memuat daftar scanner.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadScanners();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' });
    setShowPassword(false);
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const handleOpenDetailModal = (scanner: Profile) => {
    setSelectedScanner(scanner);
    setIsPinRevealed(false);
    setCopiedPin(false);
    setDetailModalOpen(true);
  };

  const handleOpenEditModal = (scanner: Profile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetForm();
    setSelectedScanner(scanner);
    setFormData({
      name: scanner.full_name || '',
      email: scanner.email || '',
      password: '',
    });
    setEditModalOpen(true);
  };

  const handleOpenDeleteModal = (scanner: Profile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedScanner(scanner);
    setDeleteModalOpen(true);
  };

  const handlePasswordInputChange = (val: string) => {
    // Strictly restrict input to digits 0-9 and maximum 6 digits
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
    setFormData(prev => ({ ...prev, password: cleaned }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    if (!name) return setFormError('Nama lengkap scanner harus diisi.');
    if (!email) return setFormError('Email login harus diisi.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Format email login tidak valid.');
    
    if (!password) {
      return setFormError('Password/PIN Scanner harus diisi.');
    }
    if (!/^[0-9]{6}$/.test(password)) {
      return setFormError('Password Scanner harus tepat 6 angka (0–9).');
    }

    setActionLoading(true);
    try {
      const res = await createScannerAccount(
        currentAdminProfile?.email || 'admin@ppu.com',
        name,
        email,
        password
      );

      if (res.success) {
        triggerToast('success', `Akun Scanner "${name}" berhasil dibuat.`);
        setAddModalOpen(false);
        resetForm();
        loadScanners();
      } else {
        setFormError(res.error || 'Gagal menambahkan akun scanner.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScanner) return;
    setFormError(null);

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    if (!name) return setFormError('Nama lengkap scanner harus diisi.');
    if (!email) return setFormError('Email login harus diisi.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Format email login tidak valid.');

    if (password && !/^[0-9]{6}$/.test(password)) {
      return setFormError('Password Scanner baru harus tepat 6 angka (0–9).');
    }

    setActionLoading(true);
    try {
      const res = await updateScannerAccount(
        currentAdminProfile?.email || 'admin@ppu.com',
        selectedScanner.id,
        name,
        email,
        password || undefined
      );

      if (res.success) {
        triggerToast('success', `Akun Scanner "${name}" berhasil diperbarui.`);
        setEditModalOpen(false);
        resetForm();
        loadScanners();
      } else {
        setFormError(res.error || 'Gagal memperbarui akun scanner.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActivation = async (scanner: Profile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyActive = !scanner.is_deleted;
    const actionName = isCurrentlyActive ? 'menonaktifkan' : 'mengaktifkan';
    
    setActionLoading(true);
    try {
      const ok = await toggleScannerActivation(
        currentAdminProfile?.email || 'admin@ppu.com',
        scanner.id,
        scanner.full_name,
        isCurrentlyActive
      );

      if (ok) {
        triggerToast(
          'success',
          `Berhasil ${actionName} akun scanner "${scanner.full_name}".`
        );
        loadScanners();
      } else {
        triggerToast('error', `Gagal ${actionName} akun scanner.`);
      }
    } catch (err: any) {
      triggerToast('error', err.message || `Gagal ${actionName} akun scanner.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedScanner) return;

    setActionLoading(true);
    try {
      const ok = await deleteScannerAccount(
        currentAdminProfile?.email || 'admin@ppu.com',
        selectedScanner.id,
        selectedScanner.full_name,
        selectedScanner.email
      );

      if (ok) {
        triggerToast('success', `Akun Scanner "${selectedScanner.full_name}" berhasil dihapus.`);
        setDeleteModalOpen(false);
        setDetailModalOpen(false);
        setSelectedScanner(null);
        resetForm();
        loadScanners();
      } else {
        triggerToast('error', 'Gagal menghapus akun scanner.');
      }
    } catch (err: any) {
      triggerToast('error', err.message || 'Terjadi kesalahan saat menghapus.');
    } finally {
      setActionLoading(false);
    }
  };

  // Re-authentication for Viewing Scanner PIN
  const handleOpenVerifyModal = () => {
    setAdminPasswordInput('');
    setShowAdminPassword(false);
    setVerifyError(null);
    setVerifyModalOpen(true);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordInput) {
      setVerifyError('Masukkan password akun Admin Anda.');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);

    try {
      const adminEmail = currentAdminProfile?.email || 'admin@ppu.com';
      const res = await verifyAdminPassword(adminEmail, adminPasswordInput);

      if (res.success) {
        setIsPinRevealed(true);
        setVerifyModalOpen(false);
        setAdminPasswordInput('');
        triggerToast('success', 'Verifikasi Admin berhasil. PIN Scanner ditampilkan.');
      } else {
        setVerifyError(res.error || 'Password Admin tidak benar. Verifikasi gagal.');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Gagal memverifikasi password Admin.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2500);
  };

  // Filter & Search Logic
  const filteredScanners = scanners.filter(s => {
    const matchesSearch = 
      s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return !s.is_deleted;
    if (statusFilter === 'inactive') return !!s.is_deleted;
    return true;
  });

  const totalScanners = scanners.length;
  const activeScanners = scanners.filter(s => !s.is_deleted).length;
  const inactiveScanners = scanners.filter(s => s.is_deleted).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Manajemen Petugas Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Kelola Scanner</h1>
          <p className="text-indigo-200 text-sm max-w-2xl">
            Kelola akun petugas scanner QR / Barcode untuk verfirmasi pendaftaran akun pemilih. Tekan card akun scanner untuk melihat detail dan PIN.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadScanners(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Scanner</span>
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center justify-between border-slate-200/80 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Scanner</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalScanners}</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border-slate-200/80 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scanner Aktif</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeScanners}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between border-slate-200/80 shadow-sm">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scanner Nonaktif</p>
            <h3 className="text-2xl font-bold text-slate-500 mt-1">{inactiveScanners}</h3>
          </div>
          <div className="p-3 bg-slate-100 text-slate-500 rounded-xl">
            <UserX className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Filter & Search Controls */}
      <Card className="p-4 border-slate-200/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau email scanner..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Sahaja</option>
              <option value="inactive">Nonaktif Sahaja</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Scanner List - Card Grid */}
      {loading ? (
        <Card className="p-12 text-center text-slate-500 border-slate-200/80 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm">Memuat data scanner...</p>
        </Card>
      ) : filteredScanners.length === 0 ? (
        <Card className="p-12 text-center border-slate-200/80 shadow-sm">
          <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Tidak Ada Akun Scanner</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Tidak ada akun scanner yang sesuai dengan pencarian atau filter Anda.'
              : 'Belum ada akun scanner yang terdaftar. Klik "+ Tambah Scanner" untuk membuat akun baru.'}
          </p>
          {searchTerm || statusFilter !== 'all' ? (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 font-medium text-xs rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Reset Filter
            </button>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredScanners.map(scanner => {
            const isActive = !scanner.is_deleted;
            return (
              <div
                key={scanner.id}
                onClick={() => handleOpenDetailModal(scanner)}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group flex flex-col justify-between space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-xs ${
                      isActive 
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white' 
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {scanner.full_name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {scanner.full_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Petugas Scanner</p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Email Login:</span>
                    <span className="font-mono font-bold text-slate-700 truncate max-w-[170px]">{scanner.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">PIN Scanner:</span>
                    <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      <Lock className="w-3 h-3 text-amber-500" />
                      <span>••••••</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-indigo-600 font-medium flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <Info className="w-3.5 h-3.5" />
                    <span>Lihat Detail & PIN</span>
                  </span>

                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={e => handleToggleActivation(scanner, e)}
                      disabled={actionLoading}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isActive
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                      title={isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={e => handleOpenEditModal(scanner, e)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                      title="Edit Akun"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={e => handleOpenDeleteModal(scanner, e)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETAIL SCANNER */}
      {detailModalOpen && selectedScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Detail Akun Scanner</h3>
                  <p className="text-xs text-slate-500">Informasi profil & verifikasi kredensial</p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-indigo-600/20">
                  {selectedScanner.full_name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{selectedScanner.full_name}</h4>
                  <p className="text-xs text-slate-500 font-mono truncate">{selectedScanner.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                  !selectedScanner.is_deleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {!selectedScanner.is_deleted ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* PIN Scanner Box */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl space-y-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between text-xs text-indigo-200 font-semibold tracking-wider uppercase">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-amber-400" />
                    PIN Scanner (6 Digit)
                  </span>
                  {isPinRevealed && (
                    <span className="text-emerald-400 text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      Terverifikasi
                    </span>
                  )}
                </div>

                <div className="bg-black/30 rounded-xl p-3.5 border border-white/10 flex items-center justify-between">
                  <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-amber-300">
                    {isPinRevealed ? (
                      selectedScanner.booth_code || '123456'
                    ) : (
                      '••••••'
                    )}
                  </div>

                  {isPinRevealed ? (
                    <button
                      onClick={() => handleCopyPin(selectedScanner.booth_code || '123456')}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                    >
                      {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPin ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-indigo-300 font-mono italic">
                      Terkunci
                    </span>
                  )}
                </div>

                {!isPinRevealed ? (
                  <button
                    onClick={handleOpenVerifyModal}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Lihat PIN Scanner</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                    Gunakan PIN 6 digit ini untuk melakukan login akun petugas scanner.
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleOpenDeleteModal(selectedScanner)}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedScanner)}
                  className="px-3.5 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI ADMIN */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Verifikasi Admin</h3>
                  <p className="text-xs text-slate-500">Autentikasi keamanan akses PIN</p>
                </div>
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Untuk menampilkan PIN Scanner, silakan verifikasi ulang dengan memasukkan password akun Admin Anda (<strong className="text-slate-900 font-mono">{currentAdminProfile?.email || 'admin@ppu.com'}</strong>).
            </p>

            {verifyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password Akun Admin <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Masukkan password admin anda..."
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {verifyLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Verifikasi & Tampilkan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SCANNER */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Tambah Scanner Baru</h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Petugas Scanner 01"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="scanner01@ppu.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password / PIN Scanner (Tepat 6 Angka) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={formData.password}
                    onChange={e => handlePasswordInputChange(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aturan: Password harus tepat 6 angka (0–9), misal: 123456 atau 827391.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Simpan Scanner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT SCANNER */}
      {editModalOpen && selectedScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Edit Akun Scanner</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama scanner..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="email@contoh.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password / PIN Baru (Opsional - Tepat 6 Angka)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Kosongkan jika tidak ingin diubah"
                    value={formData.password}
                    onChange={e => handlePasswordInputChange(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aturan: Biarkan kosong untuk mempertahankan password saat ini, atau masukkan tepat 6 angka baru.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Perbarui Scanner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HAPUS SCANNER */}
      {deleteModalOpen && selectedScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Hapus Akun Scanner?</h3>
              <p className="text-sm text-slate-600">
                Apakah Anda yakin ingin menghapus akun scanner <span className="font-semibold text-slate-900">{selectedScanner.full_name}</span> ({selectedScanner.email})?
              </p>
              <p className="text-xs text-rose-600 font-medium pt-1">
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Hapus Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
