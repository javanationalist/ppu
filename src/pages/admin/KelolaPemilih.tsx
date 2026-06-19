import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { 
  getAllProfiles, 
  resetVoterConfirmation, 
  resetVoterHistory, 
  softDeleteVoter, 
  restoreVoter 
} from '../../lib/adminService';
import { Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { 
  Users, 
  Search, 
  RefreshCw, 
  Trash2, 
  Undo, 
  Filter, 
  UserMinus, 
  CheckCircle, 
  X, 
  ShieldCheck,
  AlertTriangle,
  History,
  Calendar,
  Layers,
  ArrowUpDown
} from 'lucide-react';

type FilterType = 'semua' | 'dikonfirmasi' | 'memilih' | 'dihapus';

export default function KelolaPemilih() {
  const { profile: adminProfile } = useAuth();
  
  // State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('semua');
  
  // Notification / Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  useScrollLock(modalOpen);
  const [modalType, setModalType] = useState<'reset_konfirmasi' | 'reset_vote' | 'hapus_akun' | null>(null);
  const [selectedVoter, setSelectedVoter] = useState<Profile | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<keyof Profile>('created_at');
  const [sortAscending, setSortAscending] = useState(false);

  const loadVoters = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      // Only keep 'user' role profiles to separate admins from regular voters
      const voterProfiles = data.filter(p => p.role === 'user');
      setProfiles(voterProfiles);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal memuat daftar pemilih.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVoters();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Switch sorting order
  const handleSort = (field: keyof Profile) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Open modals helper
  const openModal = (type: 'reset_konfirmasi' | 'reset_vote' | 'hapus_akun', voter: Profile) => {
    setSelectedVoter(voter);
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
    setSelectedVoter(null);
  };

  // Reset Confirmation core handler
  const handleResetConfirmation = async () => {
    if (!selectedVoter || !adminProfile) return;
    setIsActionLoading(true);
    try {
      const success = await resetVoterConfirmation(
        adminProfile.email,
        selectedVoter.id,
        selectedVoter.full_name,
        selectedVoter.card_id
      );

      if (success) {
        showToast('success', 'Status konfirmasi berhasil di-reset.');
        await loadVoters();
        closeModal();
      } else {
        showToast('error', 'Gagal mereset konfirmasi.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Terjadi kesalahan sistem.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reset Vote core handler
  const handleResetVoteHistory = async () => {
    if (!selectedVoter || !adminProfile) return;
    setIsActionLoading(true);
    try {
      const success = await resetVoterHistory(
        adminProfile.email,
        selectedVoter.id,
        selectedVoter.full_name,
        selectedVoter.card_id
      );

      if (success) {
        showToast('success', 'Histori pilihan berhasil dihapus dan status voting di-reset.');
        await loadVoters();
        closeModal();
      } else {
        showToast('error', 'Gagal mereset histori pilihan.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Terjadi kesalahan sistem.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Soft delete account core handler
  const handleSoftDelete = async () => {
    if (!selectedVoter || !adminProfile) return;
    setIsActionLoading(true);
    try {
      const success = await softDeleteVoter(
        adminProfile.email,
        selectedVoter.id,
        selectedVoter.full_name,
        selectedVoter.card_id
      );

      if (success) {
        showToast('success', `Akun ${selectedVoter.full_name} berhasil dipindahkan ke riwayat dihapus.`);
        await loadVoters();
        closeModal();
      } else {
        showToast('error', 'Gagal menghapus akun.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Terjadi kesalahan sistem.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Restore deleted account action
  const handleRestoreAccount = async (voter: Profile) => {
    if (!adminProfile) return;
    try {
      const success = await restoreVoter(
        adminProfile.email,
        voter.id,
        voter.full_name,
        voter.card_id
      );

      if (success) {
        showToast('success', `Akun ${voter.full_name} berhasil dipulihkan.`);
        await loadVoters();
      } else {
        showToast('error', 'Gagal memulihkan akun.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Terjadi kesalahan sistem.');
    }
  };

  // Formatting date helper
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Dynamic filter and search processing
  const processedProfiles = profiles.filter(profile => {
    // 1. Search Query
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      profile.full_name.toLowerCase().includes(searchLower) ||
      (profile.class || '').toLowerCase().includes(searchLower) ||
      profile.email.toLowerCase().includes(searchLower) ||
      profile.card_id.includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Active filters configuration
    const isDeletedUser = !!profile.is_deleted;
    
    if (activeFilter === 'dihapus') {
      return isDeletedUser;
    }
    
    // Normal normal filters exclude soft-deleted users
    if (isDeletedUser) return false;

    if (activeFilter === 'dikonfirmasi') {
      return profile.account_status === 'dikonfirmasi';
    }

    if (activeFilter === 'memilih') {
      return profile.voting_status === 'sudah';
    }

    // Default "semua"
    return true;
  });

  // Sort processed profiles
  const sortedProfiles = [...processedProfiles].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAscending 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return sortAscending ? (valA === valB ? 0 : valA ? 1 : -1) : (valA === valB ? 0 : valA ? -1 : 1);
    }

    return 0;
  });

  // Count active stats
  const totalRegistered = profiles.filter(p => !p.is_deleted).length;
  const totalConfirmed = profiles.filter(p => !p.is_deleted && p.account_status === 'dikonfirmasi').length;
  const totalVoted = profiles.filter(p => !p.is_deleted && p.voting_status === 'sudah').length;
  const totalDeleted = profiles.filter(p => p.is_deleted).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert Banner */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl shadow-lg border text-xs font-bold transition-all transition-transform duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-150 shadow-emerald-500/10' 
            : 'bg-red-50 text-red-800 border-red-150 shadow-red-500/10'
        }`}>
          <CheckCircle className={`w-4 h-4 ${toast.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Summary Cards / Widgets */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-6 rounded-xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Kelola Pemilih
          </h1>
          <p className="text-slate-500 text-sm">
            Pantau partisipasi, verifikasi/konfirmasi status akun, hapus/soft delete, and reset rincian pemilu pemilih.
          </p>
        </div>
        <button 
          onClick={loadVoters}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all border border-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats Widgets Box */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Pemilih</p>
            <p className="text-lg font-black text-slate-800">{totalRegistered}</p>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dikonfirmasi</p>
            <p className="text-lg font-black text-slate-800">{totalConfirmed}</p>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Sudah Memilih</p>
            <p className="text-lg font-black text-slate-800">{totalVoted}</p>
          </div>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="p-3 bg-red-50 rounded-lg text-red-500">
            <UserMinus className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Dihapus (Audit)</p>
            <p className="text-lg font-black text-slate-800">{totalDeleted}</p>
          </div>
        </Card>
      </div>

      {/* Filter and Search Action Row */}
      <Card className="border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveFilter('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'semua'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Semua Akun
          </button>
          <button
            onClick={() => setActiveFilter('dikonfirmasi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'dikonfirmasi'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Sudah Dikonfirmasi
          </button>
          <button
            onClick={() => setActiveFilter('memilih')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeFilter === 'memilih'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Sudah Memilih
          </button>
          <button
            onClick={() => setActiveFilter('dihapus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              activeFilter === 'dihapus'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Riwayat Akun yang Dihapus
          </button>
        </div>

        {/* Dynamic Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, kelas, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>
      </Card>

      {/* Main voters spreadsheet layout table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs font-medium">Sedang memuat data pemilih...</p>
          </div>
        ) : sortedProfiles.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto text-slate-350 mb-3" />
            <p className="text-sm font-bold text-slate-600">Tidak ada data pemilih ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba gunakan kata sandi atau filter pencarian lainnya.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-5">
                    <button onClick={() => handleSort('card_id')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                      Card ID
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5">
                    <button onClick={() => handleSort('full_name')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                      Nama Lengkap
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5">
                    <button onClick={() => handleSort('class')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                      Kelas
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-5">Email</th>
                  
                  {activeFilter === 'dihapus' ? (
                    <th className="py-3 px-5">
                      <button onClick={() => handleSort('deleted_at')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        Tanggal Dihapus
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  ) : (
                    <>
                      <th className="py-3 px-5">Status Konfirmasi</th>
                      <th className="py-3 px-5">Status Memilih</th>
                      <th className="py-3 px-5">
                        <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                          Mulai Registrasi
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    </>
                  )}
                  
                  <th className="py-3 px-5 text-right w-[20%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                {sortedProfiles.map((voter) => (
                  <tr key={voter.id} className="hover:bg-slate-50/55 transition-colors">
                    {/* Card ID */}
                    <td className="py-3.5 px-5 select-all">
                      <span className="font-mono font-extrabold text-blue-700 bg-blue-50/70 border border-blue-100/60 px-2 py-0.5 rounded text-[11px]">
                        {voter.card_id}
                      </span>
                    </td>
                    {/* Full Name */}
                    <td className="py-3.5 px-5 font-bold text-slate-800">
                      {voter.full_name}
                    </td>
                    {/* Class */}
                    <td className="py-3.5 px-5">
                      <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                        {voter.class || '-'}
                      </span>
                    </td>
                    {/* Email */}
                    <td className="py-3.5 px-5 text-slate-500 font-normal">
                      {voter.email}
                    </td>

                    {activeFilter === 'dihapus' ? (
                      /* Deletion Date for Soft-deleted Accounts */
                      <td className="py-3.5 px-5 text-slate-400 font-normal">
                        {voter.deleted_at ? formatDate(voter.deleted_at) : '-'}
                      </td>
                    ) : (
                      <>
                        {/* Account Status */}
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            voter.account_status === 'dikonfirmasi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/80 shadow-sm shadow-emerald-500/5'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {voter.account_status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Belum Dikonfirmasi'}
                          </span>
                        </td>
                        {/* Voting Status */}
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            voter.voting_status === 'sudah'
                              ? 'bg-purple-50 text-purple-700 border border-purple-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {voter.voting_status === 'sudah' ? 'Sudah Memilih' : 'Belum Memilih'}
                          </span>
                        </td>
                        {/* Registration Date */}
                        <td className="py-3.5 px-5 text-slate-500 font-normal">
                          {formatDate(voter.created_at)}
                        </td>
                      </>
                    )}

                    {/* Actions Panel */}
                    <td className="py-3.5 px-5 text-right font-semibold">
                      {voter.is_deleted ? (
                        /* Deletion Actions: Restore */
                        <button
                          onClick={() => handleRestoreAccount(voter)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 px-2.5 py-1 rounded-md text-[11px] font-extrabold transition-colors shadow-sm"
                        >
                          <Undo className="w-3 h-3" />
                          Pulihkan Akun
                        </button>
                      ) : (
                        /* Standard Actions */
                        <div className="flex justify-end gap-1.5">
                          {/* Reset Confirmation */}
                          {voter.account_status === 'dikonfirmasi' && (
                            <button
                              onClick={() => openModal('reset_konfirmasi', voter)}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-150 rounded-md transition-all shadow-sm"
                              title="Reset status konfirmasi akun"
                            >
                              Reset Konfirmasi
                            </button>
                          )}
                          
                          {/* Reset Voting History */}
                          {voter.voting_status === 'sudah' && (
                            <button
                              onClick={() => openModal('reset_vote', voter)}
                              className="px-2 py-1 text-[11px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-150 rounded-md transition-all shadow-sm flex items-center gap-0.5"
                              title="Reset hak pilih & semua suara"
                            >
                              <History className="w-3 h-3" />
                              Reset Vote
                            </button>
                          )}

                          {/* Delete Account (Soft Delete) */}
                          <button
                            onClick={() => openModal('hapus_akun', voter)}
                            className="p-1 px-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-150 rounded-md transition-all text-[11px] inline-flex items-center gap-0.5 font-bold"
                            title="Hapus akun (soft-delete)"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dynamic Action Dialog / Modal Manager */}
      {modalOpen && selectedVoter && modalType && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center gap-2 ${
              modalType === 'hapus_akun' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
            }`}>
              {modalType === 'hapus_akun' ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : modalType === 'reset_vote' ? (
                <History className="w-5 h-5 text-purple-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              )}
              <h3 className="text-sm font-bold text-slate-800">
                {modalType === 'hapus_akun' && 'Konfirmasi Hapus Akun'}
                {modalType === 'reset_vote' && 'Konfirmasi Reset Histori'}
                {modalType === 'reset_konfirmasi' && 'Konfirmasi Reset Konfirmasi'}
              </h3>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {modalType === 'reset_konfirmasi' && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  Batalkan status konfirmasi akun ini?
                </p>
              )}

              {modalType === 'reset_vote' && (
                <p className="text-sm text-slate-600 leading-relaxed font-semibold">
                  Semua histori pilihan pemilih ini akan dihapus. Lanjutkan?
                </p>
              )}

              {modalType === 'hapus_akun' && (
                <p className="text-sm text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun ini? Akun akan dipindahkan ke riwayat dihapus untuk keperluan audit.
                </p>
              )}

              {/* Patient details block */}
              <div className="bg-slate-100 p-3.5 rounded-xl space-y-1 text-xs text-slate-500 border border-slate-200">
                <p>Nama: <span className="font-bold text-slate-700">{selectedVoter.full_name}</span></p>
                <p>Kelas: <span className="font-bold text-slate-700">{selectedVoter.class || '-'}</span></p>
                <p>Card ID: <span className="font-extrabold text-indigo-700 font-mono">#{selectedVoter.card_id}</span></p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={closeModal}
                className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Batal
              </button>

              {modalType === 'reset_konfirmasi' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleResetConfirmation}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-600/10 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Reset'}
                </button>
              )}

              {modalType === 'reset_vote' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleResetVoteHistory}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-600/10 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Reset'}
                </button>
              )}

              {modalType === 'hapus_akun' && (
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleSoftDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-600/10 flex items-center gap-1.5"
                >
                  {isActionLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Hapus'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
