import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Edit2, Trash2, CheckCircle, Save, X, ArrowUp, ArrowDown, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import { getCategories, saveCategory, deleteCategory } from '../../lib/votingService';
import { getCandidates, deleteCandidate } from '../../lib/votingService';
import { logAdminAction } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Category } from '../../types';

export default function KelolaKategori() {
  const { profile: adminProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  useScrollLock(isModalOpen);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🏫');
  const [catType, setCatType] = useState<'regular' | 'mpk_smaba'>('regular');
  const [catOrder, setCatOrder] = useState<number>(0);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const cList = await getCategories();
      setCategories(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setCatEditing(null);
    setCatId('');
    setCatName('');
    setCatIcon('🏫');
    setCatType('regular');
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
    setCatOrder(maxOrder + 1);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setCatEditing(cat);
    setCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatType(cat.type === 'mpk_smaba' ? 'mpk_smaba' : 'regular');
    setCatOrder(cat.order || 1);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      triggerToast('error', 'Nama kategori tidak boleh kosong.');
      return;
    }

    const targetId = catEditing ? catEditing.id : (catId.trim() || catName.trim().toLowerCase().replace(/\s+/g, '_'));
    
    if (!catEditing && categories.some(c => c.id === targetId || c.name.toLowerCase() === catName.trim().toLowerCase())) {
      triggerToast('error', `Kategori "${catName}" atau ID "${targetId}" sudah digunakan.`);
      return;
    }

    const updatedModel: Category = {
      id: targetId,
      name: catName.trim(),
      icon: catIcon.trim(),
      type: catType,
      order: catOrder
    };

    try {
      console.log("=== PAYLOAD FRONTEND KATEGORI ===");
      console.log(updatedModel);
      console.log("=================================");
      await saveCategory(updatedModel);
      triggerToast('success', `Kategori "${catName}" berhasil ${catEditing ? 'diperbarui' : 'ditambahkan'}.`);
      setIsModalOpen(false);
      await loadCategories();
      
      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `${catEditing ? 'Mengubah' : 'Menambahkan'} kategori "${catName}"`,
          `Category ID: ${targetId}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal menyimpan kategori.'}`);
      console.error(err);
    }
  };

  const handleDeleteClick = async (cat: Category) => {
    // Note: check candidates first
    try {
      const inCategory = await getCandidates(cat.id);
      
      if (inCategory.length > 0) {
        if (!confirm(`Peringatan: Kategori "${cat.name}" masih digunakan oleh ${inCategory.length} kandidat.\n\nApakah Anda yakin ingin menghapus kategori ini? Seluruh data kandidat di dalamnya akan ikut terhapus atau kehilangan kategorinya! Tekan 'OK' untuk melanjutkan penghapusan.`)) {
          return;
        }
        
        // Delete candidates inside it
        for (const candidate of inCategory) {
          await deleteCandidate(candidate.id);
        }
      } else {
        if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
          return;
        }
      }

      await deleteCategory(cat.id);
      triggerToast('success', `Kategori "${cat.name}" berhasil dihapus.`);
      await loadCategories();

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `Menghapus kategori "${cat.name}" beserta kandidatnya`,
          `Category ID: ${cat.id}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal menghapus kategori.'}`);
      console.error(err);
    }
  };

  const handleMoveUpDown = async (index: number, direction: 'up' | 'down') => {
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;

    const currentCat = { ...categories[index] };
    const targetCat = { ...categories[swapIdx] };

    const currentOrder = typeof currentCat.order === 'number' ? currentCat.order : index + 1;
    const targetOrder = typeof targetCat.order === 'number' ? targetCat.order : swapIdx + 1;

    currentCat.order = targetOrder;
    targetCat.order = currentOrder;

    try {
      await Promise.all([
        saveCategory(currentCat),
        saveCategory(targetCat)
      ]);
      triggerToast('success', 'Urutan kategori diperbarui.');
      await loadCategories();
    } catch (err) {
      triggerToast('error', 'Gagal memindahkan urutan kategori.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[100] p-4 rounded-xl shadow-2xl border text-sm font-bold flex items-center gap-3 transition-all animate-scale-up ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Kelola Kategori</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Tambah, ubah nama, hapus, dan atur urutan kategori pemilihan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCategories()}
            disabled={loading}
            className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white transition-all cursor-pointer disabled:opacity-50"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/admin/scanner-pro"
            className="bg-slate-900 hover:bg-slate-800 text-white hover:text-indigo-300 px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 shadow-md hover:shadow-lg transition-all border border-indigo-500/20 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400 animate-pulse" />
            <span>Scanner (PRO)</span>
          </Link>
          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* List Categories */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {categories.length === 0 ? (
          <div className="p-12 pl-6 text-center text-slate-500 flex flex-col items-center justify-center">
            <Layers className="w-12 h-12 text-slate-300 mb-3" />
            <p>Belum ada kategori. Silakan tambahkan kategori untuk mengatur pemilihan.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {categories.map((cat, index) => (
              <div key={cat.id} className="p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-3xl filter drop-shadow">{cat.icon}</span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                      {cat.name}
                      {cat.type === 'mpk_smaba' && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-mono tracking-wider">MPK SMABA</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">ID: {cat.id} &bull; Urutan: {typeof cat.order === 'number' ? cat.order : index + 1}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button 
                    onClick={() => handleMoveUpDown(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleMoveUpDown(index, 'down')}
                    disabled={index === categories.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-2"></div>
                  <button
                    onClick={() => openEditModal(cat)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteClick(cat)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Insert/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              {catEditing ? 'Edit Kategori' : 'Tambah Kategori'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Icon & Name Row */}
              <div className="flex gap-3">
                <div className="w-20">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ikon</label>
                  <input
                    type="text"
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center text-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    placeholder="🏫"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nama Kategori</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                    placeholder="Contoh: Ketua OSIS"
                    required
                  />
                </div>
              </div>

              {/* ID Input (Visible only completely on create, readOnly on edit unless strict override if preferred) */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">ID Kategori (Slug)</label>
                <input
                  type="text"
                  value={catEditing ? catId : (catId || catName.trim().toLowerCase().replace(/\s+/g, '_'))}
                  onChange={(e) => { if (!catEditing) setCatId(e.target.value); }}
                  disabled={!!catEditing}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 font-mono focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Misal: ketua_osis"
                />
                {!catEditing && (
                  <p className="text-[10px] text-slate-400 mt-1">Akan terisi otomatis jika dikosongkan. Gunakan format tanpa spasi.</p>
                )}
              </div>

              {/* Type Category */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Format Pemilihan (Type)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCatType('regular')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      catType === 'regular' 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Normal (Langsung)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatType('mpk_smaba')}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      catType === 'mpk_smaba' 
                        ? 'bg-amber-50 border-amber-200 text-amber-700 ring-2 ring-amber-500/20' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Sistem Perwakilan (MPK)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer mt-4"
              >
                <Save className="w-5 h-5" />
                {catEditing ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
