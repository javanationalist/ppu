import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Plus, 
  RefreshCw, 
  MoreVertical, 
  Edit2, 
  Lock, 
  LogOut, 
  ShieldAlert, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getAllProfiles, 
  createBooth, 
  updateBooth, 
  resetBoothPassword, 
  deleteBooth, 
  toggleBoothActivation 
} from '../../lib/adminService';
import { updateBoothStatus, getBoothCode } from '../../lib/voteModeService';
import { Profile } from '../../types';

export default function KelolaBilik() {
  const { profile: adminProfile } = useAuth();
  const [booths, setBooths] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedBooth, setSelectedBooth] = useState<Profile | null>(null);

  // Add Form
  const [addName, setAddName] = useState('');
  const [addKeterangan, setAddKeterangan] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPassword, setAddConfirmPassword] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addBoothCode, setAddBoothCode] = useState('');

  // Edit Form
  const [editName, setEditName] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editBoothCode, setEditBoothCode] = useState('');

  // Password Form
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadBooths = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await getAllProfiles();
      const boothProfiles = data.filter(p => p.role === 'vote');
      setBooths(boothProfiles);
    } catch (err) {
      console.error('Failed to load booths:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Poll profiles for real-time status updates every 3 seconds
  useEffect(() => {
    loadBooths();
    const interval = setInterval(() => {
      loadBooths();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside clicks to close actions dropdown
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // CREATE BOOTH ACTION
  const handleCreateBoothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanCC = addBoothCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!addName.trim()) return setAddError('Nama Bilik harus diisi.');
    if (!addBoothCode.trim()) return setAddError('Kode Bilik (CC) harus diisi.');
    if (cleanCC !== addBoothCode.toUpperCase()) {
      return setAddError('Kode Bilik hanya boleh berisi huruf dan angka tanpa spasi atau strip.');
    }
    if (!addKeterangan.trim()) return setAddError('Keterangan Bilik harus diisi.');
    if (!addEmail.trim()) return setAddError('Email Login harus diisi.');
    if (addPassword.length < 6) return setAddError('Sandi minimal harus 6 karakter.');
    if (addPassword !== addConfirmPassword) return setAddError('Konfirmasi sandi tidak sesuai.');

    setActionLoading(true);
    try {
      const res = await createBooth(
        adminProfile?.email || 'admin@ppu.com',
        addName,
        addKeterangan,
        addEmail,
        addPassword,
        cleanCC
      );

      if (res.success) {
        triggerToast('success', `Bilik "${addName}" berhasil dibuat.`);
        setAddModalOpen(false);
        // Reset form
        setAddName('');
        setAddKeterangan('');
        setAddEmail('');
        setAddPassword('');
        setAddConfirmPassword('');
        setAddBoothCode('');
        loadBooths();
      } else {
        setAddError(res.error || 'Gagal menyimpan Bilik Suara.');
      }
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setActionLoading(false);
    }
  };

  // UPDATE BOOTH ACTION
  const handleUpdateBoothSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!selectedBooth) return;
    const cleanCC = editBoothCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!editName.trim()) return setEditError('Nama Bilik harus diisi.');
    if (!editBoothCode.trim()) return setEditError('Kode Bilik (CC) harus diisi.');
    if (cleanCC !== editBoothCode.toUpperCase()) {
      return setEditError('Kode Bilik hanya boleh berisi huruf dan angka tanpa spasi atau strip.');
    }
    if (!editKeterangan.trim()) return setEditError('Keterangan Bilik harus diisi.');

    setActionLoading(true);
    try {
      const success = await updateBooth(
        adminProfile?.email || 'admin@ppu.com',
        selectedBooth.id,
        editName,
        editKeterangan,
        cleanCC
      );

      if (success) {
        triggerToast('success', 'Informasi Bilik berhasil diperbarui.');
        setEditModalOpen(false);
        loadBooths();
      } else {
        setEditError('Gagal mengubah data Bilik Suara.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // RESET PASSWORD ACTION
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!selectedBooth) return;
    if (newPassword.length < 6) return setPasswordError('Sandi minimal harus 6 karakter.');
    if (newPassword !== confirmNewPassword) return setPasswordError('Konfirmasi sandi tidak sesuai.');

    setActionLoading(true);
    try {
      const success = await resetBoothPassword(
        adminProfile?.email || 'admin@ppu.com',
        selectedBooth.id,
        selectedBooth.email,
        newPassword
      );

      if (success) {
        triggerToast('success', `Sandi untuk "${selectedBooth.full_name}" berhasil diperbarui.`);
        setPasswordModalOpen(false);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setPasswordError('Gagal mereset sandi.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // REMOTE LOGOUT DEVICE ACTION
  const handleRemoteLogout = async (booth: Profile) => {
    try {
      // Set status in database/localStorage to offline
      await updateBoothStatus(booth.id, 'offline');
      triggerToast('success', `Sinyal logout berhasil dikirim ke perangkat "${booth.full_name}".`);
      loadBooths();
    } catch (err) {
      triggerToast('error', 'Gagal memutuskan sambungan perangkat.');
    }
  };

  // TOGGLE DISABLE / ENABLE BOOTH ACTION
  const handleToggleActivation = async (booth: Profile) => {
    try {
      const success = await toggleBoothActivation(
        adminProfile?.email || 'admin@ppu.com',
        booth.id,
        booth.full_name,
        !booth.is_deleted
      );

      if (success) {
        triggerToast(
          'success', 
          booth.is_deleted 
            ? `Bilik "${booth.full_name}" berhasil diaktifkan kembali.` 
            : `Bilik "${booth.full_name}" dinonaktifkan.`
        );
        loadBooths();
      } else {
        triggerToast('error', 'Gagal mengubah status aktivasi bilik.');
      }
    } catch (err) {
      triggerToast('error', 'Terjadi kesalahan sistem.');
    }
  };

  // DELETE BOOTH ACTION
  const handleDeleteBoothConfirm = async () => {
    if (!selectedBooth) return;
    setActionLoading(true);
    try {
      const success = await deleteBooth(
        adminProfile?.email || 'admin@ppu.com',
        selectedBooth.id,
        selectedBooth.full_name
      );

      if (success) {
        triggerToast('success', `Bilik "${selectedBooth.full_name}" berhasil dihapus secara permanen.`);
        setDeleteModalOpen(false);
        setSelectedBooth(null);
        loadBooths();
      } else {
        triggerToast('error', 'Gagal menghapus Bilik Suara.');
      }
    } catch (err) {
      triggerToast('error', 'Terjadi kesalahan.');
    } finally {
      setActionLoading(false);
    }
  };

  // Get booth display status
  const getBoothStatus = (booth: Profile) => {
    if (booth.is_deleted) {
      return { 
        statusLabel: 'Nonaktif', 
        sessionLabel: 'Nonaktif', 
        statusColor: 'bg-rose-50 text-rose-700 border-rose-100', 
        sessionColor: 'bg-rose-100 text-rose-800' 
      };
    }

    const s = booth.voting_status;
    if (s === 'waiting') {
      return { 
        statusLabel: 'Online', 
        sessionLabel: 'Menunggu Pemilih', 
        statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
        sessionColor: 'bg-amber-100 text-amber-800' 
      };
    } else if (s === 'connected') {
      return { 
        statusLabel: 'Online', 
        sessionLabel: 'Pemilih Terhubung', 
        statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
        sessionColor: 'bg-sky-100 text-sky-800' 
      };
    } else if (s === 'voting') {
      return { 
        statusLabel: 'Online', 
        sessionLabel: 'Voting Berlangsung', 
        statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
        sessionColor: 'bg-indigo-100 text-indigo-800 animate-pulse' 
      };
    } else {
      return { 
        statusLabel: 'Offline', 
        sessionLabel: 'Offline', 
        statusColor: 'bg-slate-50 text-slate-500 border-slate-100', 
        sessionColor: 'bg-slate-100 text-slate-600' 
      };
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat data bilik suara...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in text-left">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Monitor className="w-6 h-6 text-indigo-600" />
            <span>Kelola Bilik Suara</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Kelola seluruh perangkat Bilik Suara yang digunakan selama proses pemungutan suara.
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadBooths(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all duration-150 disabled:opacity-50"
            title="Refresh Status"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
          
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bilik</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      {booths.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center max-w-xl mx-auto space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-md font-bold text-slate-800">Belum Ada Bilik Suara</h3>
            <p className="text-slate-500 text-xs mt-1">
              Tambahkan perangkat Bilik Suara terlebih dahulu untuk memulai pemungutan suara menggunakan model Booth.
            </p>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-indigo-700 transition"
          >
            Tambah Bilik Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {booths.map((booth) => {
            const { statusLabel, sessionLabel, statusColor, sessionColor } = getBoothStatus(booth);
            
            return (
              <div 
                key={booth.id} 
                className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-200 relative ${
                  booth.is_deleted ? 'opacity-70 bg-slate-50/50' : ''
                }`}
              >
                {/* Upper row */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 tracking-tight leading-tight">{booth.full_name}</h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{booth.class}</p>
                  </div>
                  
                  {/* Action Menu button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === booth.id ? null : booth.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenuId === booth.id && (
                      <div className="absolute right-0 top-8 z-30 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-1 text-xs">
                        <button
                          onClick={() => {
                            setSelectedBooth(booth);
                            setEditName(booth.full_name);
                            setEditKeterangan(booth.class);
                            setEditBoothCode(booth.booth_code || getBoothCode(booth));
                            setEditModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>Edit Bilik</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedBooth(booth);
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setPasswordModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Reset Password</span>
                        </button>

                        {!booth.is_deleted && booth.voting_status !== 'offline' && (
                          <button
                            onClick={() => handleRemoteLogout(booth)}
                            className="w-full text-left px-3 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-medium border-t border-slate-100"
                          >
                            <LogOut className="w-3.5 h-3.5 text-amber-500" />
                            <span>Logout Device</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleActivation(booth)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 font-medium border-t border-slate-100 ${
                            booth.is_deleted ? 'text-emerald-700 hover:bg-emerald-50' : 'text-rose-700 hover:bg-rose-50'
                          }`}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{booth.is_deleted ? 'Aktifkan' : 'Nonaktifkan'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedBooth(booth);
                            setDeleteModalOpen(true);
                          }}
                          className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-semibold border-t border-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus Bilik</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kode Bilik Details */}
                <div className="text-[11px] font-mono bg-indigo-50/50 p-2 rounded-lg text-slate-600 flex items-center justify-between">
                  <span className="text-indigo-700 font-bold">KODE BILIK (CC):</span>
                  <span className="font-extrabold text-indigo-700">{booth.booth_code || getBoothCode(booth)}</span>
                </div>

                {/* Email details */}
                <div className="text-[11px] font-mono bg-slate-50 p-2 rounded-lg text-slate-600 flex items-center justify-between">
                  <span className="text-slate-400">EMAIL:</span>
                  <span className="font-semibold">{booth.email}</span>
                </div>

                {/* Bottom Status Rows */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-50">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider">STATUS KONEKSI</span>
                    <div className={`px-2 py-1.5 rounded-lg border text-center font-bold text-[11px] ${statusColor}`}>
                      {statusLabel}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold tracking-wider">SESI BILIK</span>
                    <div className={`px-2 py-1.5 rounded-lg text-center font-extrabold text-[11px] ${sessionColor}`}>
                      {sessionLabel}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD BOOTH MODAL */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Tambah Bilik Suara Baru</span>
              </h2>
              <button 
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateBoothSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-150 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KODE BILIK (CC) - KODE TETAP</label>
                <input
                  type="text"
                  placeholder="Contoh: 01, 02 (Maks 4 karakter, huruf & angka)"
                  value={addBoothCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (val.length <= 4) setAddBoothCode(val);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold text-indigo-600 tracking-wider"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">NAMA BILIK</label>
                <input
                  type="text"
                  placeholder="Contoh: Bilik Terminal 1"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KETERANGAN BILIK</label>
                <input
                  type="text"
                  placeholder="Contoh: Depan Lab Komputer Utama"
                  value={addKeterangan}
                  onChange={(e) => setAddKeterangan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">EMAIL LOGIN</label>
                <input
                  type="email"
                  placeholder="Contoh: bilik1@ppu.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 text-xs">
                  <label className="block text-slate-700 font-bold">KATA SANDI</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      placeholder="Min 6 karakter"
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="block text-slate-700 font-bold">KONFIRMASI SANDI</label>
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    placeholder="Ulangi sandi"
                    value={addConfirmPassword}
                    onChange={(e) => setAddConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Bilik'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BOOTH MODAL */}
      {editModalOpen && selectedBooth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>Edit Info Bilik</span>
              </h2>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateBoothSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-150 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KODE BILIK (CC) - KODE TETAP</label>
                <input
                  type="text"
                  placeholder="Contoh: 01"
                  value={editBoothCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (val.length <= 4) setEditBoothCode(val);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-bold text-indigo-600 tracking-wider"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">NAMA BILIK</label>
                <input
                  type="text"
                  placeholder="Nama Bilik"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KETERANGAN BILIK</label>
                <input
                  type="text"
                  placeholder="Keterangan Bilik"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold active:scale-95 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {passwordModalOpen && selectedBooth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <span>Reset Sandi Bilik</span>
              </h2>
              <button 
                onClick={() => setPasswordModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl border border-indigo-150 text-xs font-semibold">
                Mengubah kata sandi login untuk <strong>{selectedBooth.full_name}</strong> ({selectedBooth.email}).
              </div>

              {passwordError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-150 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KATA SANDI BARU</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-slate-700 font-bold">KONFIRMASI KATA SANDI BARU</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Ulangi kata sandi baru"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-medium"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold active:scale-95 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Mereset...' : 'Reset Sandi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE BOOTH MODAL */}
      {deleteModalOpen && selectedBooth && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md border border-slate-100 shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
                <span>Hapus Bilik Suara?</span>
              </h2>
              <button 
                onClick={() => setDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-rose-900/40 hover:bg-rose-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm">
                Apakah Anda yakin ingin menghapus Bilik Suara <strong>"{selectedBooth.full_name}"</strong> ({selectedBooth.email}) secara permanen?
              </p>
              
              <div className="bg-rose-50 text-rose-900/80 p-3 rounded-xl border border-rose-100 text-xs leading-relaxed font-medium">
                Tindakan ini tidak dapat dibatalkan. Perangkat yang sedang terhubung akan langsung terputus dan tidak dapat mengakses fitur Bilik Suara lagi.
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold active:scale-95 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteBoothConfirm}
                  disabled={actionLoading}
                  className="px-5 py-2.5 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold active:scale-95 transition disabled:opacity-50"
                >
                  {actionLoading ? 'Menghapus...' : 'Hapus Permanen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
