import React, { useState, useEffect, useRef } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { 
  Settings, Trash2, ShieldAlert, CheckCircle, 
  Save, Lock, Unlock, Database, ArrowUp, ArrowDown, Plus, Edit2, X, PlusCircle, Check
} from 'lucide-react';
import { getCategories, resetAllVotingData, saveCategory, deleteCategory, getDapils, saveDapil, deleteDapil } from '../../lib/votingService';
import { getAllProfiles, logAdminAction } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { Category, Profile, Dapil } from '../../types';
import { ALL_CLASSES } from '../../lib/classConstants';

export default function PengaturanVoting() {
  const { profile: adminProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [activeMpkTabId, setActiveMpkTabId] = useState('');
  const [dapilCategoryId, setDapilCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reset verification input
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [isResetVerifying, setIsResetVerifying] = useState(false);

  // Dapil Modal states
  const [isDapilModalOpen, setIsDapilModalOpen] = useState(false);
  useScrollLock(isDapilModalOpen);
  const [dapilEditing, setDapilEditing] = useState<Dapil | null>(null);
  const [dapilName, setDapilName] = useState('');
  const [dapilPhotoUrl, setDapilPhotoUrl] = useState('');
  const [dapilClasses, setDapilClasses] = useState<string[]>([]);

  // Multi-select Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-'));

  const toggleDropdown = () => {
    if (!dropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setDropdownOpen(!dropdownOpen);
  };

  // Handle click outside dropdown and positioning
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    function updatePosition() {
        if (dropdownOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom + window.scrollY,
              left: rect.left + window.scrollX,
              width: rect.width,
            });
        }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
    };
  }, [dropdownOpen]);


  useEffect(() => {
    async function loadData() {
      try {
        const [cList, pList, dList] = await Promise.all([
          getCategories(),
          getAllProfiles(),
          getDapils()
        ]);
        setCategories(cList);
        setProfiles(pList);
        setDapils(dList || []);

        const mpkCats = cList.filter(c => c.type === 'mpk_smaba');
        if (mpkCats.length > 0) {
          setActiveMpkTabId(mpkCats[0].id);
        }
      } catch (err) {
        console.error(err);
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

  const openAddDapil = () => {
    setDapilEditing(null);
    setDapilName('');
    setDapilPhotoUrl('');
    setDapilClasses([]);
    const mpkCats = categories.filter(c => c.type === 'mpk_smaba');
    setDapilCategoryId(activeMpkTabId || mpkCats[0]?.id || 'mpk_smaba');
    setIsDapilModalOpen(true);
  };

  const openEditDapil = (dapil: Dapil) => {
    setDapilEditing(dapil);
    setDapilName(dapil.name);
    setDapilPhotoUrl(dapil.photo_url || '');
    setDapilClasses(dapil.eligible_classes || []);
    setDapilCategoryId(dapil.category_id || activeMpkTabId || 'mpk_smaba');
    setIsDapilModalOpen(true);
  };

  const handleSaveDapilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dapilName.trim()) {
      triggerToast('error', 'Nama Dapil wajib diisi.');
      return;
    }

    // Verify duplicate classes
    const otherDapils = dapils.filter(d => !dapilEditing || d.id !== dapilEditing.id);
    const duplicated: string[] = [];
    for (const cls of dapilClasses) {
      const assigned = otherDapils.find(d => d.eligible_classes.includes(cls));
      if (assigned) {
        duplicated.push(`${cls} (di ${assigned.name})`);
      }
    }

    if (duplicated.length > 0) {
      triggerToast('error', `Kelas berikut telah dialokasikan ke Dapil lain: ${duplicated.join(', ')}`);
      return;
    }

    const updatedDapil: Dapil = {
      id: dapilEditing ? dapilEditing.id : `dapil-${Date.now()}`,
      category_id: dapilCategoryId || 'mpk_smaba',
      name: dapilName.trim(),
      photo_url: dapilPhotoUrl.trim() || undefined,
      eligible_classes: dapilClasses,
      order: dapilEditing ? (dapilEditing.order || 1) : (activeMpkTabId ? dapils.filter(d => d.category_id === activeMpkTabId).length + 1 : dapils.length + 1)
    };

    try {
      await saveDapil(updatedDapil);
      triggerToast('success', `Dapil "${dapilName}" berhasil disimpan.`);
      setIsDapilModalOpen(false);
      const dList = await getDapils();
      setDapils(dList || []);

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `${dapilEditing ? 'Mengubah' : 'Menambahkan'} Dapil "${dapilName}"`,
          `Dapil ID: ${updatedDapil.id}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal menyimpan Dapil.'}`);
    }
  };

  const handleDeleteDapilClick = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Dapil "${name}"? Calon/Kandidat di model ini akan dibebaskan tanpa daerah pemilihan.`)) {
      return;
    }
    try {
      await deleteDapil(id);
      triggerToast('success', `Dapil "${name}" berhasil dihapus.`);
      const dList = await getDapils();
      setDapils(dList || []);

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `Menghapus Dapil "${name}"`,
          `Dapil ID: ${id}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal menghapus Dapil.'}`);
    }
  };

  const displayedDapils = activeMpkTabId 
    ? dapils.filter(d => d.category_id === activeMpkTabId)
    : dapils;

  const handleMoveDapilUpDown = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= displayedDapils.length) return;

    const currentDapil = { ...displayedDapils[index] };
    const targetDapil = { ...displayedDapils[swapIdx] };

    const currentOrder = typeof currentDapil.order === 'number' ? currentDapil.order : index + 1;
    const targetOrder = typeof targetDapil.order === 'number' ? targetDapil.order : swapIdx + 1;

    currentDapil.order = targetOrder;
    targetDapil.order = currentOrder;

    try {
      await Promise.all([
        saveDapil(currentDapil),
        saveDapil(targetDapil)
      ]);
      triggerToast('success', 'Urutan Dapil diperbarui.');
      const dList = await getDapils();
      setDapils(dList || []);
    } catch (err) {
      triggerToast('error', 'Gagal memindah urutan Dapil.');
    }
  };

  const handleResetAllData = async () => {
    if (resetCodeInput.toLowerCase() !== 'bersihkan') {
      triggerToast('error', 'Kata konfirmasi salah! Ketik "BERSIHKAN" untuk memverifikasi tindakan.');
      return;
    }

    setIsResetVerifying(true);
    try {
      if (adminProfile) {
        const ok = await resetAllVotingData(adminProfile.email);
        if (ok) {
          triggerToast('success', 'Seluruh rekapitulasi suara masuk berhasil dibersihkan! Status DPT diatur ulang.');
          setResetCodeInput('');
          
          await logAdminAction(
            adminProfile.email,
            'RESET SYSTEM RECORDS (Purged all votes, reset voting status)',
            'SYSTEM WIDE'
          );
        } else {
          triggerToast('error', 'Gagal memulihkan status database.');
        }
      }
    } catch (err) {
      console.error(err);
      triggerToast('error', 'Sistem gagal mengeksekusi perintah reset.');
    } finally {
      setIsResetVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat pengaturan konseptual...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
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
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>Pengaturan Portal Pemilu</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Konfigurasi gerbang akses, format kategori bilik suara, dan utilitas reset data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6 md:col-span-2">
          {/* Section 2.5: Manage Dapil details */}
          {categories.some(c => c.type === 'mpk_smaba') && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Manajemen Dapil MPK SMABA</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Kelola Daerah Pemilihan beserta alokasi siswa DPT kelas bersangkutan.</p>
                </div>
                <button
                  onClick={openAddDapil}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-150"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Dapil</span>
                </button>
              </div>

              {/* Category tabs if multiple MPK categories exist */}
              {categories.filter(c => c.type === 'mpk_smaba').length > 1 && (
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl max-w-max my-2">
                  {categories.filter(c => c.type === 'mpk_smaba').map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveMpkTabId(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeMpkTabId === cat.id
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cat.icon || '🗳️'} {cat.name}
                    </button>
                  ))}
                </div>
              )}

              {displayedDapils.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/20">
                  <span className="text-2xl">🗳️</span>
                  <p className="text-xs font-bold text-slate-500 mt-2">Belum ada Dapil yang terkonfigurasi.</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Siswa tidak dapat memilih MPK SMABA sebelum kelas mereka didaftarkan ke dalam salah satu Dapil operasional untuk kategori ini.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/10">
                  {displayedDapils.map((dap, index) => (
                    <div key={dap.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {dap.photo_url ? (
                          <img 
                             src={dap.photo_url} 
                             alt={dap.name} 
                             referrerPolicy="no-referrer"
                             className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-lg">
                            🖼️
                          </div>
                        )}
                        <div>
                          <span className="block font-black text-slate-800 text-sm flex items-center gap-2">
                            <span>{dap.name}</span>
                            {categories.filter(c => c.type === 'mpk_smaba').length > 1 && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                {categories.find(c => c.id === dap.category_id)?.name || dap.category_id}
                              </span>
                            )}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1 max-w-lg">
                            {dap.eligible_classes && dap.eligible_classes.length > 0 ? (
                              dap.eligible_classes.map(cls => (
                                <span key={cls} className="text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                  {cls}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 animate-pulse">
                                Belum ada kelas teralokasi!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
 
                      <div className="flex items-center gap-2">
                        {/* Reorder Buttons */}
                        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                          <button
                            onClick={() => handleMoveDapilUpDown(index, 'up')}
                            disabled={index === 0}
                            title="Geser Dapil Atas"
                            className="p-1 text-slate-500 hover:text-indigo-650 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDapilUpDown(index, 'down')}
                            disabled={index === displayedDapils.length - 1}
                            title="Geser Dapil Bawah"
                            className="p-1 text-slate-500 hover:text-indigo-650 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Action buttons */}
                        <button
                          onClick={() => openEditDapil(dap)}
                          title="Ubah Dapil"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDapilClick(dap.id, dap.name)}
                          title="Hapus Dapil"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Destructive utility resets */}
        <div className="space-y-6">
          <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-rose-100 text-rose-700 p-2 rounded-xl shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-rose-950 text-sm">Katastrofe Risiko Tinggi</h3>
                <p className="text-rose-600 text-xs mt-0.5 leading-relaxed">
                  Semua suara pemilih asli maupun uji coba akan lenyap secara permanen dari database. Gunakan dengan penuh tanggung jawab!
                </p>
              </div>
            </div>

            <div className="border-t border-rose-100 pt-4 space-y-3">
              <div>
                <label className="block text-rose-900 text-[10px] font-bold uppercase tracking-wider mb-1">Ketik kata "BERSIHKAN" untuk konfirmasi</label>
                <input 
                  type="text" 
                  value={resetCodeInput}
                  onChange={e => setResetCodeInput(e.target.value)}
                  placeholder="Ketik di sini..."
                  className="w-full px-3 py-2 rounded-xl border border-rose-200 focus:outline-rose-500 text-sm font-bold bg-white text-rose-800 placeholder:text-rose-300"
                />
              </div>

              <button
                onClick={handleResetAllData}
                disabled={isResetVerifying || !resetCodeInput}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isResetVerifying ? 'Sedang Mereset...' : 'Wipe & Reset Seluruh Suara'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-slate-800 font-bold text-sm">Informasi Sandbox</h4>
            <div className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Total Akun:</span>
                <span className="font-semibold text-slate-700 font-mono">{profiles.length} (Admin + User)</span>
              </div>
              <div className="flex justify-between">
                <span>Database Engine:</span>
                <span className="font-semibold text-indigo-650 flex items-center gap-1 font-mono">
                  SUPABASE CLOUD
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Tindakan wipe data hanya mengosongkan log kertas suara dimasukkan siswa, profile biodata siswa tetap aman di sistem.
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Add / Edit Dapil Dialog Modal */}
      {isDapilModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up my-8">
            <div className="bg-indigo-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold">{dapilEditing ? 'Ubah Dapil MPK' : 'Tambah Dapil MPK'}</h3>
                <p className="text-xs text-indigo-200 font-medium">Satukan kelas-kelas siswa ke dalam Daerah Pemilihan spesifik</p>
              </div>
              <button 
                onClick={() => setIsDapilModalOpen(false)} 
                className="text-white hover:text-indigo-200 transition-colors cursor-pointer border-none bg-transparent"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDapilSubmit} className="p-6 space-y-4">
              {/* Category selector in Modal */}
              {categories.filter(c => c.type === 'mpk_smaba').length > 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kategori Rumpun Pemilihan MPK</label>
                  <select
                    value={dapilCategoryId}
                    onChange={(e) => setDapilCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    required
                  >
                    {categories.filter(c => c.type === 'mpk_smaba').map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || '🗳️'} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Dapil</label>
                  <input 
                    type="text" 
                    value={dapilName}
                    onChange={(e) => setDapilName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contoh: Dapil I, Dapil Kelas X"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shared Photo URL (Foto Dapil Bersama)</label>
                  <input 
                    type="url" 
                    value={dapilPhotoUrl}
                    onChange={(e) => setDapilPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                    placeholder="Contoh: https://images.unsplash.com/photo-..."
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Kosongkan jika ingin memakai lambang default untuk kandidat Dapil.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Alokasi Kelas DPT ({dapilClasses.length} Terpilih)</label>
                <p className="text-[10px] text-slate-400 mb-3 block italic">Metode pengamanan kelas ganda aktif: kelas yang telah dialokasikan ke Dapil lain secara otomatis akan terkunci.</p>
                
                <button
                  type="button"
                  ref={triggerRef}
                  onClick={toggleDropdown}
                  className="w-full min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex flex-wrap gap-1.5 items-center"
                >
                  {dapilClasses.length === 0 ? (
                    <span className="text-slate-400">Pilih Kelas...</span>
                  ) : (
                    dapilClasses.map(cls => (
                      <span key={cls} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg">
                        {cls}
                        <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setDapilClasses(prev => prev.filter(c => c !== cls)); }} />
                      </span>
                    ))
                  )}
                  <span className="ml-auto text-slate-400 text-xs">▼</span>
                </button>
              </div>

              {/* Multi-Select Dropdown Portal */}
              {dropdownOpen && (
                <div 
                  ref={dropdownRef}
                  className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-h-60 overflow-y-auto"
                  style={{
                    top: dropdownPosition.top + 'px',
                    left: dropdownPosition.left + 'px',
                    width: dropdownPosition.width + 'px',
                  }}
                >
                  {/* Special Classes (GTK) Section */}
                  {specialClasses.length > 0 && (
                    <div className="mb-3 pb-2 border-b border-slate-100 flex flex-wrap gap-2">
                       {specialClasses.map(cls => {
                         const otherAssigned = dapils.find(d => d.eligible_classes.includes(cls) && (!dapilEditing || d.id !== dapilEditing.id));
                         const isChecked = dapilClasses.includes(cls);
                         return (
                           <button
                             key={cls}
                             type="button"
                             disabled={!!otherAssigned}
                             onClick={() => {
                               if (isChecked) {
                                 setDapilClasses(prev => prev.filter(c => c !== cls));
                               } else {
                                 setDapilClasses(prev => [...prev, cls]);
                               }
                             }}
                             className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-between gap-3 transition-all cursor-pointer ${
                               otherAssigned 
                                 ? 'bg-slate-100/50 text-slate-300 border border-transparent cursor-not-allowed' 
                                 : isChecked
                                   ? 'bg-indigo-650 text-white shadow-xs border border-indigo-700'
                                   : 'text-slate-800 bg-white border border-slate-200 hover:bg-slate-50'
                             }`}
                           >
                             <span>{cls}</span>
                             {otherAssigned ? (
                               <span className="text-[8px] font-extrabold text-slate-400 bg-slate-200/50 px-1 rounded truncate max-w-[50px]">
                                 {otherAssigned.name}
                               </span>
                             ) : isChecked ? (
                               <Check className="w-3 h-3 text-white shrink-0" />
                             ) : null}
                           </button>
                         );
                       })}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {['X', 'XI', 'XII'].map((grade, idx) => {
                      const cols = [col1, col2, col3];
                      return (
                        <div key={grade} className="space-y-1">
                          <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1 text-center font-mono">{grade}</div>
                          {cols[idx].map(cls => {
                            const otherAssigned = dapils.find(d => d.eligible_classes.includes(cls) && (!dapilEditing || d.id !== dapilEditing.id));
                            const isChecked = dapilClasses.includes(cls);
                            return (
                              <button
                                key={cls}
                                type="button"
                                disabled={!!otherAssigned}
                                onClick={() => {
                                  if (isChecked) {
                                    setDapilClasses(prev => prev.filter(c => c !== cls));
                                  } else {
                                    setDapilClasses(prev => [...prev, cls]);
                                  }
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                  otherAssigned 
                                    ? 'bg-slate-100/50 text-slate-300 border border-transparent cursor-not-allowed' 
                                    : isChecked
                                      ? 'bg-indigo-650 text-white shadow-xs border border-indigo-700'
                                      : 'text-slate-600 hover:bg-slate-150 border border-slate-150'
                                }`}
                              >
                                <span>{cls}</span>
                                {otherAssigned ? (
                                  <span className="text-[8px] font-extrabold text-slate-400 bg-slate-200/50 px-1 rounded truncate max-w-[50px]">
                                    {otherAssigned.name}
                                  </span>
                                ) : isChecked ? (
                                  <Check className="w-3 h-3 text-white shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsDapilModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-150 cursor-pointer"
                >
                  Simpan Dapil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
