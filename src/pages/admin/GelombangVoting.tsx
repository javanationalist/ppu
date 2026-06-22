import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_CLASSES } from '../../lib/classConstants';
import { 
  getGelombangConfigActive, 
  setGelombangConfigActive, 
  getGelombangSesiList, 
  addGelombangSesi, 
  updateGelombangSesi, 
  deleteGelombangSesi, 
  validateBentrokanGelombang,
  GelombangSesi 
} from '../../lib/gelombangService';
import { 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Calendar,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function GelombangVoting() {
  const { user } = useAuth();
  const adminEmail = user?.email || 'admin@ppu.local';

  // Global Config State
  const [globalActive, setGlobalActive] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Sesi Table State
  const [sesiList, setSesiList] = useState<GelombangSesi[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSesiId, setEditingSesiId] = useState<string | null>(null);
  
  // Form input fields
  const [namaSesi, setNamaSesi] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [jamMulai, setJamMulai] = useState('07:00');
  const [jamSelesai, setJamSelesai] = useState('08:00');
  const [sesiStatusActive, setSesiStatusActive] = useState(true);

  // Error/Success feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Initial Data Loading
  const loadData = async () => {
    setLoadingConfig(true);
    setLoadingList(true);
    try {
      const active = await getGelombangConfigActive();
      setGlobalActive(active);

      const list = await getGelombangSesiList();
      setSesiList(list);
    } catch (err) {
      console.error('Error loading Gelombang data:', err);
    } finally {
      setLoadingConfig(false);
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Global Switch Change
  const handleToggleGlobal = async () => {
    const nextVal = !globalActive;
    setLoadingConfig(true);
    try {
      const success = await setGelombangConfigActive(nextVal, adminEmail);
      if (success) {
        setGlobalActive(nextVal);
        showSuccess(`Fitur Gelombang Voting berhasil ${nextVal ? 'Diaktifkan' : 'Dinonaktifkan'}`);
      } else {
        showError('Gagal menyimpan perubahan status global.');
      }
    } catch (err) {
      showError('Gagal mendeteksi koneksi.');
    } finally {
      setLoadingConfig(false);
    }
  };

  // Helper for alert auto-dismissal
  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!globalActive) return; // Prevent action if global feature is OFF
    setEditingSesiId(null);
    setNamaSesi('');
    setSelectedClasses([]);
    setJamMulai('07:00');
    setJamSelesai('08:00');
    setSesiStatusActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sesi: GelombangSesi) => {
    if (!globalActive) return; // Prevent action if global feature is OFF
    setEditingSesiId(sesi.id);
    setNamaSesi(sesi.nama_sesi);
    setSelectedClasses(sesi.kelas);
    setJamMulai(sesi.jam_mulai);
    setJamSelesai(sesi.jam_selesai);
    setSesiStatusActive(sesi.is_active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  // Toggle Single Session directly from summary card
  const handleToggleSesiActive = async (sesi: GelombangSesi) => {
    if (!globalActive) return;
    const nextActive = !sesi.is_active;

    // Check overlap if we are turning validation ON
    if (nextActive) {
      const bentrokMessage = validateBentrokanGelombang(
        sesi.kelas,
        sesi.jam_mulai,
        sesi.jam_selesai,
        sesi.id,
        sesiList
      );
      if (bentrokMessage) {
        showError(bentrokMessage);
        return;
      }
    }

    try {
      const success = await updateGelombangSesi(sesi.id, { is_active: nextActive }, adminEmail);
      if (success) {
        setSesiList(prev => prev.map(s => s.id === sesi.id ? { ...s, is_active: nextActive } : s));
        showSuccess(`Status sesi "${sesi.nama_sesi}" diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}`);
      } else {
        showError('Gagal mengubah status sesi.');
      }
    } catch {
      showError('Terjadi kesalahan sistem.');
    }
  };

  const handleDeleteSesi = async (id: string, name: string) => {
    if (!globalActive) return;
    if (!confirm(`Apakah Anda yakin ingin menghapus sesi Gelombang "${name}"?`)) {
      return;
    }

    try {
      const success = await deleteGelombangSesi(id, adminEmail);
      if (success) {
        setSesiList(prev => prev.filter(s => s.id !== id));
        showSuccess(`Gelombang Sesi "${name}" berhasil dihapus.`);
      } else {
        showError('Gagal menghapus gelombang.');
      }
    } catch {
      showError('Gagal merespons data.');
    }
  };

  // Handle Select All of general groups
  const selectAllGroupClasses = (grade: 'GTK' | 'X' | 'XI' | 'XII') => {
    let classesToToggle: string[] = [];
    if (grade === 'GTK') {
      classesToToggle = ['GTK'];
    } else {
      classesToToggle = ALL_CLASSES.filter(c => c.startsWith(`${grade}-`));
    }

    // Filter out classes already assigned to other sessions (except the current being edited)
    classesToToggle = classesToToggle.filter(cls => {
      const otherSesi = sesiList.find(s => s.kelas.includes(cls) && (!editingSesiId || s.id !== editingSesiId));
      return !otherSesi;
    });

    if (classesToToggle.length === 0) return;

    // If all target classes are already selected, let's de-select them. Otherwise, select them.
    const allSelected = classesToToggle.every(c => selectedClasses.includes(c));
    if (allSelected) {
      setSelectedClasses(prev => prev.filter(c => !classesToToggle.includes(c)));
    } else {
      setSelectedClasses(prev => {
        const union = new Set([...prev, ...classesToToggle]);
        return Array.from(union);
      });
    }
  };

  const handleToggleSingleClass = (clsName: string) => {
    setSelectedClasses(prev => {
      if (prev.includes(clsName)) {
        return prev.filter(c => c !== clsName);
      } else {
        return [...prev, clsName];
      }
    });
  };

  // Save changes
  const handleSaveSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validations
    if (!namaSesi.trim()) {
      setErrorMsg('Nama Sesi wajib diisi.');
      return;
    }
    if (selectedClasses.length === 0) {
      setErrorMsg('Minimal pilih satu kelas yang diberikan izin akses.');
      return;
    }
    if (!jamMulai || !jamSelesai) {
      setErrorMsg('Jam Mulai dan Jam Selesai wajib ditentukan.');
      return;
    }
    if (jamMulai >= jamSelesai) {
      setErrorMsg('Jam Mulai harus mendahului Jam Selesai.');
      return;
    }

    // Clash validation only if session is active
    if (sesiStatusActive) {
      const bentrokMessage = validateBentrokanGelombang(
        selectedClasses,
        jamMulai,
        jamSelesai,
        editingSesiId,
        sesiList
      );
      if (bentrokMessage) {
        setErrorMsg(bentrokMessage);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingSesiId) {
        // Edit flow
        const success = await updateGelombangSesi(editingSesiId, {
          nama_sesi: namaSesi,
          kelas: selectedClasses,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          is_active: sesiStatusActive,
        }, adminEmail);

        if (success) {
          setSesiList(prev => prev.map(s => s.id === editingSesiId ? {
            ...s,
            nama_sesi: namaSesi,
            kelas: selectedClasses,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            is_active: sesiStatusActive,
            updated_at: new Date().toISOString()
          } : s));
          showSuccess(`Sesi "${namaSesi}" berhasil diperbarui.`);
          setIsModalOpen(false);
        } else {
          setErrorMsg('Gagal memperbarui data pada server.');
        }
      } else {
        // Create flow
        const result = await addGelombangSesi({
          nama_sesi: namaSesi,
          kelas: selectedClasses,
          jam_mulai: jamMulai,
          jam_selesai: jamSelesai,
          is_active: sesiStatusActive,
        }, adminEmail);

        if (result) {
          setSesiList(prev => [result, ...prev]);
          showSuccess(`Sesi "${namaSesi}" berhasil dibuat.`);
          setIsModalOpen(false);
        } else {
          setErrorMsg('Gagal membuat sesi baru.');
        }
      }
    } catch {
      setErrorMsg('Terjadi gangguan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600 animate-spin-slow" />
              Kelola Sesi & Gelombang Voting
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
              Atur slot jadwal pemungutan suara per kelas untuk meminimalkan beban puncak pada server.
            </p>
          </div>
          
          {/* Switch Global */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 self-start sm:self-auto">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              {globalActive ? 'Fitur AKTIF' : 'Fitur NONAKTIF'}
            </span>
            <button
              onClick={handleToggleGlobal}
              disabled={loadingConfig}
              className="focus:outline-none transition-transform active:scale-95 cursor-pointer"
              title="Aktifkan/Nonaktifkan fitas gelombang secara menyeluruh"
            >
              {globalActive ? (
                <ToggleRight className="w-12 h-7 text-emerald-600" />
              ) : (
                <ToggleLeft className="w-12 h-7 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Information Alerts */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm text-xs font-bold leading-relaxed text-left animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3 shadow-sm text-xs font-bold leading-relaxed text-left animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* Status Description Banner */}
      {!globalActive ? (
        <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl flex items-start gap-3 text-left">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Mode Gelombang Tidak Aktif</h4>
            <p className="text-amber-700 text-xs font-medium mt-1 leading-relaxed">
              Mode Gelombang tidak aktif. Seluruh pemilih dapat menggunakan hak pilih sesuai aturan umum tanpa batas batasan jadwal per kelas.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3 text-left">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider">Metode Sinkronisasi Gelombang</h4>
            <p className="text-indigo-700 text-xs font-medium mt-1 leading-relaxed">
              Membatasi login DPT baru ke bilik suara. Hanya pemilih dari kelas yang terdaftar dalam sesi Gelombang aktif (berdasarkan waktu jam mulai & selesai saat ini) yang diperkenankan mengambil surat suara digital.
            </p>
          </div>
        </div>
      )}

      {/* Section body */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-700 flex items-center gap-1.5">
            Daftar Jadwal Gelombang ({sesiList.length})
          </h2>
          <button
            onClick={handleOpenAdd}
            disabled={!globalActive}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
              globalActive
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer hover:shadow-md'
                : 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
            }`}
          >
            <Plus className="w-4 h-4" />
            Tambah Sesi
          </button>
        </div>

        {loadingList ? (
          <div className="bg-white border rounded-2xl p-12 text-center text-slate-500 font-bold flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <span>Memindai konfigurasi penugasan gelombang...</span>
          </div>
        ) : sesiList.length === 0 ? (
          <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 font-bold text-sm">
            Belum ada jadwal sesi gelombang terdaftar. Klik "Tambah Sesi" untuk memetakan jadwal kelas.
          </div>
        ) : (
          <div 
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300 ${
              !globalActive ? 'opacity-50 select-none' : ''
            }`}
            style={{
              filter: !globalActive ? 'grayscale(0.6)' : 'none',
            }}
          >
            {sesiList.map((sesi) => (
              <div 
                key={sesi.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between text-left transition-all ${
                  sesi.is_active && globalActive
                    ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/10'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-slate-800 text-md truncate" title={sesi.nama_sesi}>
                      {sesi.nama_sesi}
                    </h3>

                    {/* Status badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0 ${
                      !globalActive 
                        ? 'bg-slate-100 text-slate-500 border-slate-250'
                        : sesi.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {!globalActive ? 'Fitur Off' : sesi.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  {/* Jam */}
                  <div className="flex items-center gap-2 mt-3 text-slate-500 text-xs font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>Jadwal:</span>
                    <span className="text-slate-800 font-extrabold select-all">{sesi.jam_mulai} - {sesi.jam_selesai}</span>
                  </div>

                  {/* List of classes */}
                  <div className="mt-4">
                    <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      Kelas Terdaftar ({sesi.kelas.length})
                    </h5>
                    <div className="flex flex-wrap gap-1 mt-1.5 max-h-24 overflow-y-auto pr-1">
                      {sesi.kelas.map(cls => (
                        <span key={cls} className="bg-slate-100 text-[10px] font-extrabold text-slate-600 px-1.5 py-0.5 rounded">
                          {cls}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card footer controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5 gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleSesiActive(sesi)}
                    disabled={!globalActive}
                    className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded transition-colors ${
                      !globalActive
                        ? 'text-slate-300 pointer-events-none'
                        : sesi.is_active
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 cursor-pointer'
                    }`}
                  >
                    {sesi.is_active ? 'Nonaktifkan Sesi' : 'Aktifkan Sesi'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(sesi)}
                      disabled={!globalActive}
                      className={`p-1.5 rounded border text-slate-600 transition-colors ${
                        globalActive
                          ? 'hover:text-indigo-600 hover:bg-indigo-50 border-slate-200 cursor-pointer'
                          : 'text-slate-300 border-slate-100 pointer-events-none'
                      }`}
                      title="Edit Sesi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSesi(sesi.id, sesi.nama_sesi)}
                      disabled={!globalActive}
                      className={`p-1.5 rounded border text-slate-600 transition-colors ${
                        globalActive
                          ? 'hover:text-red-600 hover:bg-red-50 border-slate-200 cursor-pointer'
                          : 'text-slate-300 border-slate-100 pointer-events-none'
                      }`}
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL JADWAL / SESI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto animate-fade-in-quick">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-slate-50 text-left shrink-0">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {editingSesiId ? 'Edit Sesi Gelombang' : 'Tambah Sesi Gelombang Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Modal body form */}
            <form onSubmit={handleSaveSesi} className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
              {/* Sesi Name Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                  Nama Sesi Gelombang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gelombang XII Pagi, Susulan, GTK"
                  value={namaSesi}
                  onChange={e => setNamaSesi(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm text-slate-800"
                  required
                />
              </div>

              {/* Sesi Schedule Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Jam Mulai Sesi
                  </label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={e => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm text-slate-800"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Jam Selesai Sesi
                  </label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={e => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Status Sesi toggle */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black text-slate-600 uppercase tracking-wide">Status Awal Sesi</h4>
                  <p className="text-[10px] text-slate-500 leading-normal font-medium mt-0.5">Apakah sesi langsung diaktifkan?</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSesiStatusActive(!sesiStatusActive)}
                  className="focus:outline-none cursor-pointer"
                >
                  {sesiStatusActive ? (
                    <ToggleRight className="w-11 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-11 h-6 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Classes multi-selector */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
                    Pilih Kelas (Single Source of Truth)
                  </label>
                  <div className="flex flex-wrap gap-1 text-[9px] font-black uppercase">
                    <button
                      type="button"
                      onClick={() => selectAllGroupClasses('GTK')}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-150 hover:bg-indigo-100 cursor-pointer"
                    >
                      GTK
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllGroupClasses('X')}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-150 hover:bg-indigo-100 cursor-pointer"
                    >
                      X
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllGroupClasses('XI')}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-150 hover:bg-indigo-100 cursor-pointer"
                    >
                      XI
                    </button>
                    <button
                      type="button"
                      onClick={() => selectAllGroupClasses('XII')}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-150 hover:bg-indigo-100 cursor-pointer"
                    >
                      XII
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 max-h-56 overflow-y-auto space-y-3">
                  {/* GTK */}
                  <div>
                    <span className="text-[9px] font-black text-indigo-800 uppercase tracking-widest block bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                      Sektor GTK
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(() => {
                        const cls = 'GTK';
                        const otherSesi = sesiList.find(s => s.kelas.includes(cls) && (!editingSesiId || s.id !== editingSesiId));
                        const isChecked = selectedClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            disabled={!!otherSesi}
                            onClick={() => handleToggleSingleClass(cls)}
                            title={otherSesi ? `Terdaftar di: ${otherSesi.nama_sesi}` : undefined}
                            className={`px-2 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              otherSesi
                                ? 'bg-slate-100/50 text-slate-300 border-transparent cursor-not-allowed opacity-50'
                                : isChecked
                                  ? 'bg-indigo-650 text-white border-indigo-650 shadow-sm'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            GTK {otherSesi && <span className="text-[9px] font-normal text-slate-400">({otherSesi.nama_sesi})</span>}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Class 10 */}
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block border-b pb-0.5 mb-2">
                      Kelas X
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ALL_CLASSES.filter(c => c.startsWith('X-')).map(cls => {
                        const otherSesi = sesiList.find(s => s.kelas.includes(cls) && (!editingSesiId || s.id !== editingSesiId));
                        const isChecked = selectedClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            disabled={!!otherSesi}
                            onClick={() => handleToggleSingleClass(cls)}
                            title={otherSesi ? `Terdaftar di: ${otherSesi.nama_sesi}` : undefined}
                            className={`py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                              otherSesi
                                ? 'bg-slate-100/10 text-slate-300 border-slate-100 cursor-not-allowed opacity-40'
                                : isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-650'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{cls}</span>
                            {otherSesi && (
                              <span className="text-[7px] font-normal text-slate-400 max-w-full truncate px-1" title={otherSesi.nama_sesi}>
                                {otherSesi.nama_sesi}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Class 11 */}
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block border-b pb-0.5 mb-2">
                      Kelas XI
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ALL_CLASSES.filter(c => c.startsWith('XI-')).map(cls => {
                        const otherSesi = sesiList.find(s => s.kelas.includes(cls) && (!editingSesiId || s.id !== editingSesiId));
                        const isChecked = selectedClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            disabled={!!otherSesi}
                            onClick={() => handleToggleSingleClass(cls)}
                            title={otherSesi ? `Terdaftar di: ${otherSesi.nama_sesi}` : undefined}
                            className={`py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                              otherSesi
                                ? 'bg-slate-100/10 text-slate-300 border-slate-100 cursor-not-allowed opacity-40'
                                : isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-650'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{cls}</span>
                            {otherSesi && (
                              <span className="text-[7px] font-normal text-slate-400 max-w-full truncate px-1" title={otherSesi.nama_sesi}>
                                {otherSesi.nama_sesi}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Class 12 */}
                  <div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block border-b pb-0.5 mb-2">
                      Kelas XII
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {ALL_CLASSES.filter(c => c.startsWith('XII-')).map(cls => {
                        const otherSesi = sesiList.find(s => s.kelas.includes(cls) && (!editingSesiId || s.id !== editingSesiId));
                        const isChecked = selectedClasses.includes(cls);
                        return (
                          <button
                            key={cls}
                            type="button"
                            disabled={!!otherSesi}
                            onClick={() => handleToggleSingleClass(cls)}
                            title={otherSesi ? `Terdaftar di: ${otherSesi.nama_sesi}` : undefined}
                            className={`py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                              otherSesi
                                ? 'bg-slate-100/10 text-slate-300 border-slate-100 cursor-not-allowed opacity-40'
                                : isChecked
                                  ? 'bg-indigo-600 text-white border-indigo-650'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{cls}</span>
                            {otherSesi && (
                              <span className="text-[7px] font-normal text-slate-400 max-w-full truncate px-1" title={otherSesi.nama_sesi}>
                                {otherSesi.nama_sesi}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-extrabold flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span>Dipilih: {selectedClasses.length} kelas</span>
                    <span>* Kelas GTK berada paling atas di dropdown sistem</span>
                  </div>
                  <div className="text-rose-500 font-black">
                    * Kelas yang sudah terdaftar di sesi lain dinonaktifkan (disabled) & tidak dapat dipilih ulang.
                  </div>
                </div>
              </div>

              {/* Form operations */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving ? 'Menyimpan...' : 'Simpan Sesi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
