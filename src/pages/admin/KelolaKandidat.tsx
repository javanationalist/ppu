import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, Sliders, Users, Plus, Edit2, Trash2, CheckCircle, Save, X, ArrowUp, ArrowDown, 
  RefreshCw, Eye, Info, ChevronRight, ChevronLeft, User, FileText, Check, AlertCircle, ShieldAlert
} from 'lucide-react';
import { 
  getCategories, saveCategory, deleteCategory, 
  getCandidates, saveCandidate, deleteCandidate, 
  getDapils, saveDapil, deleteDapil 
} from '../../lib/votingService';
import { logAdminAction } from '../../lib/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { Category, Candidate, Dapil } from '../../types';
import { ALL_CLASSES, CANDIDATE_CLASSES } from '../../lib/classConstants';

export default function KelolaPemilihan() {
  const { profile: adminProfile } = useAuth();
  
  // Navigation level states
  // 'category' : lists all categories
  // 'dapil'    : lists dapils of selected category (only for MPK SMABA)
  // 'candidate': lists candidates in selected category (or selected class of selected dapil)
  const [currentLevel, setCurrentLevel] = useState<'category' | 'dapil' | 'candidate'>('category');

  // Loaders and alerts
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core collections
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);

  // Selection states
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedDapilId, setSelectedDapilId] = useState<string>('');
  const [selectedMpkClass, setSelectedMpkClass] = useState<string>('');

  // ────────────────────────────────────────────────────────
  // MODALS STATE
  // ────────────────────────────────────────────────────────
  
  // Modal 1: Category (Add/Edit)
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🏫');
  const [catType, setCatType] = useState<'regular' | 'mpk_smaba'>('regular');
  const [catOrder, setCatOrder] = useState<number>(1);

  // Modal 2: Dapil (Add/Edit)
  const [isDapilModalOpen, setIsDapilModalOpen] = useState(false);
  const [dapilEditing, setDapilEditing] = useState<Dapil | null>(null);
  const [dapilName, setDapilName] = useState('');
  const [dapilPhotoUrl, setDapilPhotoUrl] = useState('');
  const [dapilClasses, setDapilClasses] = useState<string[]>([]);
  
  // Dapil Multi-select class dropdown trigger
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-'));

  // Modal 3: Candidate (Add/Edit)
  const [isCandModalOpen, setIsCandModalOpen] = useState(false);
  const [candEditing, setCandEditing] = useState<Candidate | null>(null);
  const [candMode, setCandMode] = useState<'add' | 'edit'>('add');
  const [candNumber, setCandNumber] = useState<number>(1);
  const [candChairman, setCandChairman] = useState('');
  const [candVice, setCandVice] = useState('');
  const [candVisi, setCandVisi] = useState('');
  const [candMisi, setCandMisi] = useState(''); // text separated by newline
  const [candPhotoUrl, setCandPhotoUrl] = useState('');
  
  // Modal 4: Candidate Detail Preview (Mobile/Full Details popup)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  // Scroll prevention hook during open modals
  useScrollLock(isCatModalOpen || isDapilModalOpen || isCandModalOpen || isDetailModalOpen);

  // ────────────────────────────────────────────────────────
  // LIFECYCLE & LOADING DATA
  // ────────────────────────────────────────────────────────
  
  const loadWorkspaceData = async (catId?: string) => {
    setLoading(true);
    try {
      const activeCatId = catId !== undefined ? catId : selectedCatId;
      const [catsList, dpsList] = await Promise.all([
        getCategories(),
        getDapils(activeCatId || undefined)
      ]);
      setCategories(catsList);
      setDapils(dpsList || []);
    } catch (err) {
      console.error('Error fetching baseline configurations:', err);
      triggerToast('error', 'Sistem gagal menghubungi database pemilu.');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidatesForCategory = async (categoryId: string) => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const cands = await getCandidates(categoryId);
      setCandidates(cands);
    } catch (err) {
      console.error('Error loading candidates:', err);
      triggerToast('error', 'Gagal menyinkronkan data kandidat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData('');
  }, []);

  useEffect(() => {
    if (selectedCatId) {
      loadCandidatesForCategory(selectedCatId);
      loadWorkspaceData(selectedCatId);
    } else {
      loadWorkspaceData('');
    }
  }, [selectedCatId]);

  // Handle outside click for class dropdown selector in Dapil modal
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

  // Toast notifier
  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  // Quick navigation states
  const selectedCategory = categories.find(c => c.id === selectedCatId);
  const isMpk = selectedCategory?.type === 'mpk_smaba';
  const selectedDapil = dapils.find(d => d.id === selectedDapilId);

  // Synchronize dynamic active perwakilan class on selecting a new Dapil
  useEffect(() => {
    if (isMpk && selectedDapilId) {
      const activeDap = dapils.find(d => d.id === selectedDapilId);
      if (activeDap && activeDap.eligible_classes.length > 0) {
        if (!activeDap.eligible_classes.includes(selectedMpkClass)) {
          setSelectedMpkClass(activeDap.eligible_classes[0]);
        }
      }
    }
  }, [isMpk, selectedDapilId, dapils]);

  // ────────────────────────────────────────────────────────
  // ACTION HANDLERS: CATEGORIES
  // ────────────────────────────────────────────────────────
  
  const openAddCategory = () => {
    setCatEditing(null);
    setCatId('');
    setCatName('');
    setCatIcon('🏫');
    setCatType('regular');
    const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), 0);
    setCatOrder(maxOrder + 1);
    setIsCatModalOpen(true);
  };

  const openEditCategory = (cat: Category) => {
    setCatEditing(cat);
    setCatId(cat.id);
    setCatName(cat.name);
    setCatIcon(cat.icon);
    setCatType(cat.type === 'mpk_smaba' ? 'mpk_smaba' : 'regular');
    setCatOrder(cat.order || 1);
    setIsCatModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      triggerToast('error', 'Nama kategori wajib diisi.');
      return;
    }

    const tId = catEditing ? catEditing.id : (catId.trim() || catName.trim().toLowerCase().replace(/\s+/g, '_'));

    if (!catEditing && categories.some(c => c.id === tId || c.name.toLowerCase() === catName.trim().toLowerCase())) {
      triggerToast('error', `ID "${tId}" atau nama kategori "${catName}" sudah digunakan.`);
      return;
    }

    const payload: Category = {
      id: tId,
      name: catName.trim(),
      icon: catIcon.trim(),
      type: catType,
      order: catOrder
    };

    try {
      const ok = await saveCategory(payload);
      if (ok) {
        triggerToast('success', `Kategori "${catName}" siap digunakan.`);
        setIsCatModalOpen(false);
        await loadWorkspaceData();

        if (adminProfile) {
          await logAdminAction(
            adminProfile.email,
            `${catEditing ? 'Mengubah' : 'Menambahkan'} kategori "${catName}"`,
            `Category ID: ${tId}`
          );
        }
      } else {
        triggerToast('error', 'Gagal menyimpan kategori ke database.');
      }
    } catch (err: any) {
      triggerToast('error', err.message || 'Error saat menyimpan data kategori.');
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    try {
      const internalCandidates = await getCandidates(cat.id);
      
      if (internalCandidates.length > 0) {
        if (!confirm(`PERINGATAN: Kategori "${cat.name}" memiliki ${internalCandidates.length} kandidat.\n\nMenghapus kategori ini akan menghapus semua kandidat tersebut secara permanen. Lanjutkan?`)) {
          return;
        }
        for (const candidate of internalCandidates) {
          await deleteCandidate(candidate.id);
        }
      } else {
        if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${cat.name}"?`)) {
          return;
        }
      }

      const ok = await deleteCategory(cat.id);
      if (ok) {
        triggerToast('success', `Kategori "${cat.name}" telah dihapus.`);
        await loadWorkspaceData();
        
        if (adminProfile) {
          await logAdminAction(
            adminProfile.email,
            `Menghapus kategori "${cat.name}" beserta relasinya`,
            `Category ID: ${cat.id}`
          );
        }
      } else {
        triggerToast('error', 'Gagal menghapus kategori.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('error', 'Gagal memproses penghapusan kategori.');
    }
  };

  const handleMoveCategoryOrder = async (index: number, direction: 'up' | 'down') => {
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= categories.length) return;

    const currentCat = { ...categories[index] };
    const targetCat = { ...categories[swapWith] };

    const currentOrder = typeof currentCat.order === 'number' ? currentCat.order : index + 1;
    const targetOrder = typeof targetCat.order === 'number' ? targetCat.order : swapWith + 1;

    currentCat.order = targetOrder;
    targetCat.order = currentOrder;

    try {
      await Promise.all([
        saveCategory(currentCat),
        saveCategory(targetCat)
      ]);
      triggerToast('success', 'Urutan kategori diperbarui.');
      await loadWorkspaceData();
    } catch (err) {
      triggerToast('error', 'Urutan kategori gagal dipertukarkan.');
    }
  };

  // ────────────────────────────────────────────────────────
  // ACTION HANDLERS: DAPIL
  // ────────────────────────────────────────────────────────
  
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

  const openAddDapil = () => {
    setDapilEditing(null);
    setDapilName('');
    setDapilPhotoUrl('');
    setDapilClasses([]);
    setIsDapilModalOpen(true);
  };

  const openEditDapil = (dapil: Dapil) => {
    setDapilEditing(dapil);
    setDapilName(dapil.name);
    setDapilPhotoUrl(dapil.photo_url || '');
    setDapilClasses(dapil.eligible_classes || []);
    setIsDapilModalOpen(true);
  };

  const handleDapilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dapilName.trim()) {
      triggerToast('error', 'Nama Dapil wajib diisi.');
      return;
    }

    // Verify duplicate classes across other Dapils
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

    const payload: Dapil = {
      id: dapilEditing ? dapilEditing.id : `dapil-${Date.now()}`,
      category_id: selectedCatId, // bind specifically to current working category
      name: dapilName.trim(),
      photo_url: dapilPhotoUrl.trim() || undefined,
      eligible_classes: dapilClasses,
      order: dapilEditing ? (dapilEditing.order || 1) : dapils.length + 1
    };

    try {
      await saveDapil(payload);
      triggerToast('success', `Dapil "${dapilName}" berhasil dikonfigurasi.`);
      setIsDapilModalOpen(false);
      await loadWorkspaceData();

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `${dapilEditing ? 'Mengubah' : 'Menambahkan'} Dapil "${dapilName}"`,
          `Dapil ID: ${payload.id}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal menyimpan perubahan Dapil.'}`);
    }
  };

  const handleDeleteDapil = async (d: Dapil) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus Dapil "${d.name}"? Calon/Kandidat di Dapil ini akan kehilangan alokasi daerah pemilihannya.`)) {
      return;
    }
    try {
      await deleteDapil(d.id);
      triggerToast('success', `Dapil "${d.name}" telah dihapus.`);
      await loadWorkspaceData();

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          `Menghapus Dapil "${d.name}"`,
          `Dapil ID: ${d.id}`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal mengeksekusi penghapusan Dapil.'}`);
    }
  };

  const handleMoveDapilOrder = async (index: number, direction: 'up' | 'down') => {
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= dapils.length) return;

    const currentDap = { ...dapils[index] };
    const targetDap = { ...dapils[swapWith] };

    const currentOrder = typeof currentDap.order === 'number' ? currentDap.order : index + 1;
    const targetOrder = typeof targetDap.order === 'number' ? targetDap.order : swapWith + 1;

    currentDap.order = targetOrder;
    targetDap.order = currentOrder;

    try {
      await Promise.all([
        saveDapil(currentDap),
        saveDapil(targetDap)
      ]);
      triggerToast('success', 'Urutan Dapil diperbarui.');
      await loadWorkspaceData();
    } catch (err) {
      triggerToast('error', 'Gagal memindah urutan Dapil.');
    }
  };

  // ────────────────────────────────────────────────────────
  // ACTION HANDLERS: CANDIDATES
  // ────────────────────────────────────────────────────────
  
  const openAddCandidate = (mpkClass?: string) => {
    setCandMode('add');
    setCandEditing(null);
    setCandChairman('');
    setCandVice('');
    setCandVisi('');
    setCandMisi('');
    setCandPhotoUrl('');

    if (isMpk) {
      const curDap = dapils.find(d => d.id === selectedDapilId);
      setCandPhotoUrl(curDap?.photo_url || '');
      setCandChairman('');
      setCandVisi('');
    }

    const matchedClass = mpkClass || selectedMpkClass;
    const relevantCandidates = isMpk
      ? candidates.filter(c => c.dapil_id === selectedDapilId && (c.class_name === matchedClass || c.candidate_class === matchedClass))
      : candidates;

    setCandNumber(relevantCandidates.length > 0 ? Math.max(...relevantCandidates.map(c => c.number)) + 1 : 1);
    setIsCandModalOpen(true);
  };

  const openEditCandidate = (cand: Candidate) => {
    setCandMode('edit');
    setCandEditing(cand);
    setCandNumber(cand.number);
    setCandChairman(cand.chairman);
    setCandVice(cand.vice || '');
    setCandVisi(cand.visi);
    setCandMisi(cand.misi ? cand.misi.join('\n') : '');
    setCandPhotoUrl(cand.photo_url || '');
    setIsCandModalOpen(true);
  };

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candChairman.trim() || (!isMpk && (!candVisi.trim() || !candMisi.trim()))) {
      triggerToast('error', 'Harap lengkapi semua isian wajib mendasar.');
      return;
    }

    const compileMisi = candMisi
      ? candMisi.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      : [];

    const generateSafeId = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'cand-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
    };

    const payload: Candidate = {
      id: candEditing ? candEditing.id : generateSafeId(),
      category_id: selectedCatId,
      number: Number(candNumber),
      chairman: candChairman.trim(),
      vice: isMpk ? undefined : (candVice.trim() || undefined),
      visi: candVisi.trim(),
      misi: compileMisi,
      photo_url: candPhotoUrl.trim() || undefined,
      dapil_id: isMpk ? selectedDapilId : undefined,
      class_name: isMpk ? selectedMpkClass : undefined,
      candidate_class: isMpk ? selectedMpkClass : undefined,
    };

    try {
      await saveCandidate(payload);
      setIsCandModalOpen(false);
      triggerToast('success', `Profil kandidat "${candChairman}" berhasil disimpan.`);
      await loadCandidatesForCategory(selectedCatId);

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          candEditing ? 'Mengubah profil kandidat' : 'Menambah kandidat baru',
          `${candChairman} (No: ${candNumber}, Kategori: ${selectedCategory?.name})`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Sistem gagal mengeksekusi penyimpanan kandidat.'}`);
    }
  };

  const handleDeleteCandidate = async (cand: Candidate) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kandidat "${cand.chairman}"?`)) {
      return;
    }
    try {
      await deleteCandidate(cand.id);
      triggerToast('success', `Kandidat "${cand.chairman}" berhasil dihapus.`);
      await loadCandidatesForCategory(selectedCatId);

      if (adminProfile) {
        await logAdminAction(
          adminProfile.email,
          'Menghapus kandidat',
          `${cand.chairman} (ID: ${cand.id})`
        );
      }
    } catch (err: any) {
      triggerToast('error', `Gagal: ${err.message || err.details || 'Gagal mengeksekusi perintah hapus.'}`);
    }
  };

  const openCandidateDetail = (cand: Candidate) => {
    setDetailCandidate(cand);
    setIsDetailModalOpen(true);
  };

  // ────────────────────────────────────────────────────────
  // LAYOUT RENDERER
  // ────────────────────────────────────────────────────────
  
  if (loading && categories.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-slate-500 font-bold text-sm">Menghubungkan ke Portal Pemilu...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Toast Notifier */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[150] p-4 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-3 animate-scale-up ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* breadcrumb path tracker */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-4 py-3 rounded-2xl border border-slate-150 shadow-xs">
        <button 
          onClick={() => { setCurrentLevel('category'); setSelectedCatId(''); setSelectedDapilId(''); }} 
          className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Kelola Pemilihan</span>
        </button>
        {selectedCatId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <button 
              onClick={() => { 
                if (isMpk) { 
                  setCurrentLevel('dapil'); 
                  setSelectedDapilId(''); 
                } else { 
                  setCurrentLevel('candidate'); 
                } 
              }} 
              className={`hover:text-indigo-600 font-bold transition-colors flex items-center gap-1 ${currentLevel === 'category' ? 'text-slate-400' : 'text-slate-800'}`}
            >
              <span className="text-sm">{selectedCategory?.icon}</span>
              <span>{selectedCategory?.name}</span>
            </button>
          </>
        )}
        {selectedCatId && isMpk && selectedDapilId && (
          <>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              <span>{selectedDapil?.name}</span>
            </span>
          </>
        )}
      </div>

      {/* LEVEL 1: CATEGORY SELECTION & MANAGEMENT */}
      {currentLevel === 'category' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-indigo-500" />
                <span>Rumpun Pemilihan Umum</span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Pilih atau kelola rumpun pemilihan untuk mengatur dapil dan kandidat pemilu sekolah.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={loadWorkspaceData}
                className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white transition-all cursor-pointer"
                title="Muat Ulang"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={openAddCategory}
                className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Rumpun</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {categories.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <Layers className="w-12 h-12 text-slate-200 mb-3" />
                <p className="font-medium text-sm">Belum ada rumpun pemilihan yang terdaftar.</p>
                <button onClick={openAddCategory} className="text-indigo-600 text-xs font-bold mt-2 hover:underline">Tambah Sekarang &rarr;</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((cat, index) => (
                  <div key={cat.id} className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    {/* Brand Info */}
                    <div 
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        if (cat.type === 'mpk_smaba') {
                          setCurrentLevel('dapil');
                        } else {
                          setCurrentLevel('candidate');
                        }
                      }}
                      className="flex items-center gap-4 cursor-pointer flex-1 min-w-0 group"
                    >
                      <span className="text-3xl bg-slate-50 p-2.5 rounded-2xl border border-slate-100 group-hover:scale-105 transition-all filter drop-shadow">
                        {cat.icon}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                          <span className="truncate">{cat.name}</span>
                          {cat.type === 'mpk_smaba' ? (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 font-mono tracking-wider font-black uppercase shrink-0">MPK SMABA</span>
                          ) : (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-mono tracking-wider font-black uppercase shrink-0">Reguler</span>
                          )}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {cat.id} &bull; Urutan: {cat.order || index + 1}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-none border-slate-100">
                      <button 
                        onClick={() => handleMoveCategoryOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 px-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleMoveCategoryOrder(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-1 px-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                      <button
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          if (cat.type === 'mpk_smaba') {
                            setCurrentLevel('dapil');
                          } else {
                            setCurrentLevel('candidate');
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Atur Rumpun</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => openEditCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                        title="Ubah Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 2: DAPIL SELECTION & MANAGEMENT */}
      {currentLevel === 'dapil' && selectedCategory && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <button 
                onClick={() => { setCurrentLevel('category'); setSelectedCatId(''); }}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 mb-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Kategori</span>
              </button>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Daerah Pemilihan (Dapil)</span>
              </h1>
              <p className="text-slate-500 text-sm">
                Rumpun pemilihan: <span className="font-extrabold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{selectedCategory.icon} {selectedCategory.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={loadWorkspaceData}
                className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 bg-white transition-all cursor-pointer"
                title="Muat Ulang"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={openAddDapil}
                className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Dapil</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {dapils.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <Sliders className="w-12 h-12 text-slate-200 mb-2" />
                <p className="font-medium text-sm">Belum ada Daerah Pemilihan (Dapil) yang dikonfigurasi.</p>
                <button onClick={openAddDapil} className="text-indigo-600 text-xs font-bold mt-2 hover:underline">Tambah Dapil &rarr;</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {dapils.map((dap, index) => (
                  <div key={dap.id} className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    {/* Brand Dapil */}
                    <div 
                      onClick={() => {
                        setSelectedDapilId(dap.id);
                        if (dap.eligible_classes.length > 0) {
                          setSelectedMpkClass(dap.eligible_classes[0]);
                        }
                        setCurrentLevel('candidate');
                      }}
                      className="flex items-center gap-4 cursor-pointer flex-1 min-w-0 group"
                    >
                      {dap.photo_url ? (
                        <img 
                          src={dap.photo_url} 
                          alt={dap.name}
                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 filter drop-shadow group-hover:scale-105 transition-all"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold group-hover:scale-105 transition-all">
                          🗳️
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5 group-hover:text-indigo-600 transition-colors">
                          <span>{dap.name}</span>
                        </h4>
                        {/* Render Class integration limits */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dap.eligible_classes.map(c => (
                            <span key={c} className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-none border-slate-100">
                      <button 
                        onClick={() => handleMoveDapilOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 px-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleMoveDapilOrder(index, 'down')}
                        disabled={index === dapils.length - 1}
                        className="p-1 px-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>

                      <button
                        onClick={() => {
                          setSelectedDapilId(dap.id);
                          if (dap.eligible_classes.length > 0) {
                            setSelectedMpkClass(dap.eligible_classes[0]);
                          }
                          setCurrentLevel('candidate');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span>Kelola Kandidat</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => openEditDapil(dap)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                        title="Ubah Dapil"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDapil(dap)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                        title="Hapus Dapil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEVEL 3: CANDIDATE SELECTION & DETAILS MANAGEMENT */}
      {currentLevel === 'candidate' && selectedCategory && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <button 
                onClick={() => {
                  if (isMpk) {
                    setCurrentLevel('dapil');
                    setSelectedDapilId('');
                  } else {
                    setCurrentLevel('category');
                    setSelectedCatId('');
                  }
                }}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 mb-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{isMpk ? 'Kembali ke Pilih Dapil' : 'Kembali ke Rumpun Pemilihan'}</span>
              </button>
              
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Profil Calon Pemilihan</span>
              </h1>
              
              <p className="text-slate-500 text-sm">
                Rumpun: <span className="font-bold text-slate-800 font-mono">{selectedCategory.icon} {selectedCategory.name}</span>
                {isMpk && selectedDapil && (
                  <>
                    {' '}&bull; Dapil:{' '}
                    <span className="font-extrabold text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{selectedDapil.name}</span>
                  </>
                )}
              </p>
            </div>

            {/* Render Add Candidate Directly for Normal categories */}
            {!isMpk && (
              <button 
                onClick={() => openAddCandidate()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all w-full md:w-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kandidat</span>
              </button>
            )}
          </div>

          {/* Candidates for MPK SMABA (filtered by selected class) */}
          {isMpk && selectedDapil && (
            <div className="space-y-6">
              {/* Class selector */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-650 uppercase tracking-wider font-mono">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Pilih Kelas untuk Mengelola Kandidat ({selectedDapil.name}):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDapil.eligible_classes
                    .filter(cls => cls !== 'GTK') // GTK cannot be a candidate class
                    .map(cls => {
                    const cnt = candidates.filter(c => c.dapil_id === selectedDapilId && (c.class_name === cls || c.candidate_class === cls)).length;
                    const isActive = selectedMpkClass === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => setSelectedMpkClass(cls)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/10'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>Kelas {cls}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-500'}`}>{cnt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Candidates list for selected class */}
              {selectedMpkClass && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-500" />
                      <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">Kandidat Utusan Kelas {selectedMpkClass}</h4>
                    </div>
                    <button 
                      onClick={() => openAddCandidate(selectedMpkClass)}
                      className="bg-amber-550 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Calon Kelas {selectedMpkClass}</span>
                    </button>
                  </div>

                  {candidates.filter(c => c.dapil_id === selectedDapilId && (c.class_name === selectedMpkClass || c.candidate_class === selectedMpkClass)).length === 0 ? (
                    <div className="p-8 text-center text-xs italic text-slate-400 bg-slate-50 rounded-xl font-semibold">
                      Belum ada utusan kandidat yang ditambahkan ke Kelas {selectedMpkClass}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-white">
                      {candidates
                        .filter(c => c.dapil_id === selectedDapilId && (c.class_name === selectedMpkClass || c.candidate_class === selectedMpkClass))
                        .map(cand => (
                          <div key={cand.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                            <div 
                              onClick={() => openCandidateDetail(cand)}
                              className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group"
                            >
                              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px] font-black flex items-center justify-center shrink-0 border border-slate-200">
                                {cand.number}
                              </span>
                              <div className="truncate">
                                <h5 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors truncate">
                                  {cand.chairman}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">Dapil: {selectedDapil.name} &bull; Kelas: {cand.class_name || cand.candidate_class || selectedMpkClass}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => openCandidateDetail(cand)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                title="Lihat Profil"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openEditCandidate(cand)}
                                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                title="Ubah Data"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteCandidate(cand)}
                                className="p-2 rounded-lg text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Regular category lists */}
          {!isMpk && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm p-4 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-800 text-base">Daftar Kandidat Paslon</h3>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center p-12 text-slate-400 font-medium text-sm italic">
                  Belum ada kandidat/paslon yang dicalonkan dalam rumpun pemilihan ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-150 rounded-2xl overflow-hidden bg-white">
                  {candidates.map(candidate => (
                    <div key={candidate.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div 
                        onClick={() => openCandidateDetail(candidate)}
                        className="flex items-center gap-4 cursor-pointer min-w-0 flex-1 group"
                      >
                        <span className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-150 text-indigo-700 font-mono text-sm font-black flex items-center justify-center shrink-0">
                          {candidate.number}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-slate-800 text-sm sm:text-base truncate group-hover:text-indigo-600 transition-colors">
                            {candidate.chairman}
                          </h4>
                          {candidate.vice && (
                            <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                              Wakil: <span className="font-bold text-slate-700">{candidate.vice}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => openCandidateDetail(candidate)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-indigo-600 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Detail</span>
                        </button>
                        <button 
                          onClick={() => openEditCandidate(candidate)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCandidate(candidate)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
           MODAL 1: CATEGORY CREATION / REFACTOR
         ──────────────────────────────────────────────────────── */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 relative animate-scale-up">
            <button 
              onClick={() => setIsCatModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>{catEditing ? 'Edit Kategori' : 'Tambah Kategori'}</span>
            </h2>

            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="flex gap-3">
                <div className="w-20">
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-2">Ikon</label>
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
                  <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-2">Nama Rumpun Kategori</label>
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

              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-2">ID Kategori (Slug unik, huruf kecil)</label>
                <input
                  type="text"
                  value={catEditing ? catId : (catId || catName.trim().toLowerCase().replace(/\s+/g, '_'))}
                  onChange={(e) => { if (!catEditing) setCatId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')); }}
                  disabled={!!catEditing}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 font-mono focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  placeholder="Misal: ketua_osis"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-450 uppercase tracking-wider mb-2">Format Tipe Pemilu</label>
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
                    Reguler
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
                    Sistem Dapil (MPK SMABA)
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer mt-4"
              >
                <Save className="w-5 h-5" />
                <span>Simpan Kategori</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
           MODAL 2: DAPIL CREATION / INTEGRATION
         ──────────────────────────────────────────────────────── */}
      {isDapilModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 relative animate-scale-up my-8">
            <button 
              onClick={() => setIsDapilModalOpen(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-black text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <span>{dapilEditing ? 'Ubah Dapil' : 'Tambah Dapil'}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6 font-medium">Buat segmen wilayah pemilihan dan alokasikan kelas siswa (DPT).</p>

            <form onSubmit={handleDapilSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 font-mono">Nama Daerah Pemilihan (Dapil) *</label>
                <input
                  type="text"
                  value={dapilName}
                  onChange={(e) => setDapilName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-850 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="Contoh: Dapil MIPA A"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 font-mono">Foto Banner / Lambang Dapil (URL)</label>
                <input
                  type="url"
                  value={dapilPhotoUrl}
                  onChange={(e) => setDapilPhotoUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 font-mono focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                  placeholder="https://images.unsplash.com/photo-..."
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alokasi Kelas DPT ({dapilClasses.length} Terpilih)</label>
                <p className="text-[10px] text-slate-400 mb-3 block italic">Silakan centang kelas kelayakan. Satu kelas hanya diperkenankan untuk masuk ke satu Dapil tunggal.</p>
                
                <button
                  type="button"
                  ref={triggerRef}
                  onClick={toggleDropdown}
                  className="w-full min-h-[42px] px-3 py-2 border border-slate-200 rounded-xl text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex flex-wrap gap-1.5 items-center cursor-pointer shadow-xs"
                >
                  {dapilClasses.length === 0 ? (
                    <span className="text-slate-400">Pilih Kelas...</span>
                  ) : (
                    dapilClasses.map(cls => (
                      <span key={cls} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-1 rounded-lg">
                        {cls}
                        <X className="w-3 h-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); setDapilClasses(prev => prev.filter(c => c !== cls)); }} />
                      </span>
                    ))
                  )}
                  <span className="ml-auto text-slate-450 text-xs">▼</span>
                </button>
              </div>

              {/* Multi-Select Dropdown Portal */}
              {dropdownOpen && (
                <div 
                  ref={dropdownRef}
                  className="fixed z-[180] bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-h-60 overflow-y-auto"
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
                             className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-between gap-3 transition-all cursor-pointer ${
                               otherAssigned 
                                 ? 'bg-slate-100/50 text-slate-300 border border-transparent cursor-not-allowed' 
                                 : isChecked
                                   ? 'bg-indigo-650 text-white shadow-xs border border-indigo-700'
                                   : 'text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white'
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
                    {['KELAS X', 'KELAS XI', 'KELAS XII'].map((grade, idx) => {
                      const cols = [col1, col2, col3];
                      const labelText = grade;
                      return (
                        <div key={grade} className="space-y-1">
                          <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1 text-center font-mono">{labelText}</div>
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
                                className={`w-full text-left px-1.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                  otherAssigned 
                                    ? 'bg-slate-100/50 text-slate-300 border border-transparent cursor-not-allowed text-[9px]' 
                                    : isChecked
                                      ? 'bg-indigo-650 text-white shadow-xs border border-indigo-700'
                                      : 'text-slate-600 hover:bg-slate-150 border border-slate-150'
                                }`}
                              >
                                <span>{cls}</span>
                                {otherAssigned ? (
                                  <span className="text-[7px] font-extrabold text-slate-400 bg-slate-200/50 px-0.5 rounded truncate max-w-[40px]">
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

              <button
                type="submit"
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg flex justify-center items-center gap-1.5 cursor-pointer mt-4"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Daerah Pemilihan</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
           MODAL 3: CANDIDATE DESIGN INJECTION / UPDATES
         ──────────────────────────────────────────────────────── */}
      {isCandModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-8 animate-scale-up">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-indigo-900 text-white shrink-0">
              <div>
                <h3 className="font-extrabold text-white text-base">
                  {candMode === 'edit' ? 'Ubah Data Pasangan Calon' : 'Tambah Kandidat Pemilihan'}
                  {isMpk && ` (Kelas ${selectedMpkClass})`}
                </h3>
                <p className="text-[11px] text-indigo-200 mt-0.5">Isi detail kelayakan, visi, misi, dan asimilasi visual kandidat.</p>
              </div>
              <button 
                onClick={() => setIsCandModalOpen(false)} 
                className="text-white hover:text-indigo-200 p-1 rounded-full border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCandidateSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">No Urut *</label>
                  <input 
                    type="number" 
                    value={candNumber} 
                    onChange={e => setCandNumber(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">Pasfoto URL</label>
                  <input 
                    type="url" 
                    placeholder="https://example.com/photo.jpg"
                    value={candPhotoUrl} 
                    onChange={e => setCandPhotoUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  {isMpk ? 'Nama Lengkap Utusan' : 'Nama Lengkap Calon Ketua'} *
                </label>
                <input 
                  type="text" 
                  value={candChairman} 
                  onChange={e => setCandChairman(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {!isMpk && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">Nama Lengkap Wakil Calon</label>
                  <input 
                    type="text" 
                    value={candVice} 
                    onChange={e => setCandVice(e.target.value)}
                    placeholder="Kosongkan jika mendaftar caleg perorangan"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">
                  {isMpk ? 'Deskripsi Ringkas / Slogan ' : 'Visi Kandidat '} *
                </label>
                <textarea 
                  rows={2}
                  value={candVisi} 
                  onChange={e => setCandVisi(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs resize-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tulis visi dasar secara padat..."
                  required={!isMpk}
                />
              </div>

              {!isMpk && (
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1 font-mono">Misi (Satu Misi Per Baris) *</label>
                  <textarea 
                    rows={4}
                    value={candMisi} 
                    onChange={e => setCandMisi(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contoh:&#10;Meningkatkan kepedulian sosial siswa&#10;Inovasi literasi digital mandiri"
                    required
                  />
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button 
                  type="button" 
                  onClick={() => setIsCandModalOpen(false)} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Simpan Calon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
           MODAL 4: DETAIL CANDIDATE POPUP
         ──────────────────────────────────────────────────────── */}
      {isDetailModalOpen && detailCandidate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative animate-scale-up">
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors cursor-pointer border-none"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Aspect Photo */}
            <div className="w-full aspect-[4/3] bg-slate-950 relative flex items-center justify-center overflow-hidden">
              {detailCandidate.photo_url ? (
                <img 
                  src={detailCandidate.photo_url} 
                  alt={detailCandidate.chairman}
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                  <User className="w-14 h-14 text-slate-700 mb-2" />
                  <span className="text-xs text-slate-500 font-semibold">Belum melampirkan pasfoto</span>
                </div>
              )}
              {/* Badge */}
              <div className="absolute left-6 bottom-6 bg-indigo-600 border border-indigo-500 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-xl font-mono">
                PASLON {String(detailCandidate.number).padStart(2, '0')}
              </div>
            </div>

            {/* Profile body content */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black tracking-widest uppercase px-2.5 py-1 rounded-md">
                  {selectedCategory.name}
                </span>
                <h3 className="font-black text-slate-900 text-xl tracking-tight pt-1 leading-tight">
                  {detailCandidate.chairman}
                </h3>
                {detailCandidate.vice && (
                  <h4 className="font-bold text-slate-550 text-sm italic">
                    Wakil: {detailCandidate.vice}
                  </h4>
                )}
                {detailCandidate.candidate_class && (
                  <span className="block text-xs font-black text-indigo-650 pt-1 font-mono">
                    Perwakilan Kelas {detailCandidate.candidate_class}
                  </span>
                )}
              </div>

              {/* Visi */}
              <div className="border-t border-slate-100 pt-3">
                <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono mb-1">Visi:</h5>
                <p className="text-slate-650 text-xs sm:text-sm leading-relaxed italic bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-justify">
                  "{detailCandidate.visi || 'Visi belum diformulasikan.'}"
                </p>
              </div>

              {/* Misi */}
              {detailCandidate.misi && detailCandidate.misi.length > 0 && (
                <div className="space-y-1 pb-1">
                  <h5 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono mb-1.5">Misi:</h5>
                  <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600 leading-relaxed font-semibold">
                    {detailCandidate.misi.map((m, idx) => (
                      <li key={idx} className="pl-0.5">
                        {m}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Quick actions inside detail overlay */}
              <div className="border-t border-slate-100 pt-4 flex gap-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditCandidate(detailCandidate);
                  }}
                  className="flex-1 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Ubah Data</span>
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleDeleteCandidate(detailCandidate);
                  }}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-750 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1 cursor-pointer font-sans"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
