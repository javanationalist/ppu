import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, Sliders, Users, Plus, Edit2, Trash2, CheckCircle, Save, X, ArrowUp, ArrowDown, 
  RefreshCw, Eye, Info, ChevronRight, ChevronLeft, User, FileText, Check, AlertCircle, ShieldAlert
} from 'lucide-react';
import { 
  getCategories, saveCategory, deleteCategory, 
  getCandidates, saveCandidate, deleteCandidate, 
  getDapils, saveDapil, deleteDapil 
} from '../../../lib/votingService';
import { logAdminAction } from '../../../lib/adminService';
import { useAuth } from '../../../contexts/AuthContext';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { Category, Candidate, Dapil } from '../../../types';
import { ALL_CLASSES } from '../../../lib/classConstants';
import { CategoryModal } from './modals/CategoryModal';
import { DapilModal } from './modals/DapilModal';
import { CandidateModal } from './modals/CandidateModal';
import { CandidateDetailModal } from './modals/CandidateDetailModal';
import { StorageDiagnosticModal } from '../../../components/admin/StorageDiagnosticModal';
import { uploadCandidatePhoto, deleteCandidatePhotoByUrl } from '../../../lib/candidateStorageService';
import { PhotoInputMode, validatePhotoUrl } from '../../../components/admin/CandidatePhotoUploader';

export default function KelolaPemilihan() {
  const { profile: adminProfile } = useAuth();
  
  const [currentLevel, setCurrentLevel] = useState<'category' | 'dapil' | 'candidate'>('category');
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);

  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedDapilId, setSelectedDapilId] = useState<string>('');
  const [selectedMpkClass, setSelectedMpkClass] = useState<string>('');

  // Modal 1: Category
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catEditing, setCatEditing] = useState<Category | null>(null);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('🏫');
  const [catType, setCatType] = useState<'regular' | 'mpk_smaba'>('regular');
  const [catOrder, setCatOrder] = useState<number>(1);

  // Modal 2: Dapil
  const [isDapilModalOpen, setIsDapilModalOpen] = useState(false);
  const [dapilEditing, setDapilEditing] = useState<Dapil | null>(null);
  const [dapilName, setDapilName] = useState('');
  const [dapilPhotoUrl, setDapilPhotoUrl] = useState('');
  const [dapilClasses, setDapilClasses] = useState<string[]>([]);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Modal 3: Candidate
  const [isCandModalOpen, setIsCandModalOpen] = useState(false);
  const [candEditing, setCandEditing] = useState<Candidate | null>(null);
  const [candMode, setCandMode] = useState<'add' | 'edit'>('add');
  const [candNumber, setCandNumber] = useState<number>(1);
  const [candChairman, setCandChairman] = useState('');
  const [candVice, setCandVice] = useState('');
  const [candVisi, setCandVisi] = useState('');
  const [candMisi, setCandMisi] = useState('');
  const [candPhotoUrl, setCandPhotoUrl] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoInputMode, setPhotoInputMode] = useState<PhotoInputMode>('url');
  
  // Modal 4: Candidate Detail Preview
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  useScrollLock(isCatModalOpen || isDapilModalOpen || isCandModalOpen || isDetailModalOpen);

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

  const triggerToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const selectedCategory = categories.find(c => c.id === selectedCatId);
  const isMpk = selectedCategory?.type === 'mpk_smaba';
  const selectedDapil = dapils.find(d => d.id === selectedDapilId);

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

  // CATEGORIES
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

  // DAPIL
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
      category_id: selectedCatId,
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

  // CANDIDATES
  const openAddCandidate = (mpkClass?: string) => {
    setCandMode('add');
    setCandEditing(null);
    setCandChairman('');
    setCandVice('');
    setCandVisi('');
    setCandMisi('');
    setCandPhotoUrl('');
    setSelectedPhotoFile(null);
    setPhotoUploadError(null);
    setPhotoInputMode('url');

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
    setSelectedPhotoFile(null);
    setPhotoUploadError(null);
    setPhotoInputMode('url');
    setIsCandModalOpen(true);
  };

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoUploadError(null);

    if (!candChairman.trim() || (!isMpk && (!candVisi.trim() || !candMisi.trim()))) {
      triggerToast('error', 'Harap lengkapi semua isian wajib mendasar.');
      return;
    }

    // Require & validate photo input based on active mode
    if (photoInputMode === 'url') {
      const urlValidation = validatePhotoUrl(candPhotoUrl);
      if (!urlValidation.valid) {
        setPhotoUploadError(urlValidation.error || 'URL foto tidak valid.');
        triggerToast('error', urlValidation.error || 'URL foto tidak valid.');
        return;
      }
    } else {
      if (!candEditing && !selectedPhotoFile && !candPhotoUrl) {
        setPhotoUploadError('Foto kandidat wajib diunggah.');
        triggerToast('error', 'Foto kandidat wajib diunggah.');
        return;
      }
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

    const targetCandidateId = candEditing ? candEditing.id : generateSafeId();
    let finalPhotoUrl = candPhotoUrl.trim();

    // Step 1: Upload photo ONLY IF in upload mode and a file was chosen
    if (photoInputMode === 'upload' && selectedPhotoFile) {
      console.log('[Candidate Photo] File selected for submit:', {
        name: selectedPhotoFile.name,
        type: selectedPhotoFile.type,
        size: selectedPhotoFile.size,
        targetCandidateId
      });
      setIsUploadingPhoto(true);
      try {
        const uploadResult = await uploadCandidatePhoto(
          selectedPhotoFile,
          isMpk,
          selectedCatId,
          targetCandidateId,
          '2026'
        );
        finalPhotoUrl = uploadResult.publicUrl;
        console.log('[Candidate Photo] Upload process finished successfully. Photo URL:', finalPhotoUrl);
      } catch (uploadErr: any) {
        setIsUploadingPhoto(false);
        const errMsg = uploadErr.message || 'Gagal mengunggah foto kandidat.';
        console.warn('[Candidate Photo] Upload process encountered warning:', errMsg);
        setPhotoUploadError(errMsg);
        triggerToast('error', errMsg);
        return;
      }
    }

    const payload: Candidate = {
      id: targetCandidateId,
      category_id: selectedCatId,
      number: Number(candNumber),
      chairman: candChairman.trim(),
      vice: isMpk ? undefined : (candVice.trim() || undefined),
      visi: candVisi.trim(),
      misi: compileMisi,
      photo_url: finalPhotoUrl || undefined,
      dapil_id: isMpk ? selectedDapilId : undefined,
      class_name: isMpk ? selectedMpkClass : undefined,
      candidate_class: isMpk ? selectedMpkClass : undefined,
    };

    // Step 2: Save candidate data to database
    try {
      console.log('[Candidate Photo] Database update started for candidate:', payload.chairman, 'ID:', payload.id);
      await saveCandidate(payload);
      console.log('[Candidate Photo] Database update success for candidate:', payload.id);

      // Step 3: If edit succeeded and a NEW photo was uploaded, clean up old photo from storage
      if (candEditing && candEditing.photo_url && selectedPhotoFile && candEditing.photo_url !== finalPhotoUrl) {
        console.log('[Candidate Photo] Deleting old candidate photo from storage:', candEditing.photo_url);
        deleteCandidatePhotoByUrl(candEditing.photo_url).catch((err) => {
          console.warn('[Candidate Photo] Old candidate photo deletion warning:', err);
        });
      }

      setIsCandModalOpen(false);
      setSelectedPhotoFile(null);
      setPhotoUploadError(null);
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
      triggerToast('error', `Gagal menyimpan data kandidat: ${err.message || err.details || 'Terjadi kesalahan pada database.'}`);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeleteCandidate = async (cand: Candidate) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kandidat "${cand.chairman}"?`)) {
      return;
    }
    try {
      await deleteCandidate(cand.id, cand.photo_url);
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

      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-4 py-3 rounded-2xl border border-slate-150 shadow-xs">
        <button 
          onClick={() => { setCurrentLevel('category'); setSelectedCatId(''); setSelectedDapilId(''); }} 
          className="hover:text-indigo-600 transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Kategori Pemilihan</span>
        </button>

        {selectedCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button 
              onClick={() => { 
                if (isMpk) {
                  setCurrentLevel('dapil'); 
                  setSelectedDapilId(''); 
                } else {
                  setCurrentLevel('candidate'); 
                }
              }} 
              className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-bold text-slate-800"
            >
              <span>{selectedCategory.icon} {selectedCategory.name}</span>
            </button>
          </>
        )}

        {isMpk && selectedDapil && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <button 
              onClick={() => setCurrentLevel('candidate')} 
              className="hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-bold text-slate-800"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span>{selectedDapil.name}</span>
            </button>
          </>
        )}
      </div>

      {/* LEVEL 1: CATEGORY SELECTION */}
      {currentLevel === 'category' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Manajemen Kategori Pemilihan</h2>
              <p className="text-xs text-slate-500">Kelola daftar bilik/kategori pemilihan utama pada sistem.</p>
            </div>
            <button
              onClick={openAddCategory}
              className="px-4 py-2.5 bg-ppu-blue hover:bg-sky-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-ppu-blue/15 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat, index) => (
              <div 
                key={cat.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-ppu-blue/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl p-2 bg-slate-50 rounded-xl border border-slate-100">{cat.icon}</span>
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleMoveCategoryOrder(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Naikkan Urutan"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleMoveCategoryOrder(index, 'down')}
                        disabled={index === categories.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Turunkan Urutan"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openEditCategory(cat)}
                        className="p-1 text-slate-400 hover:text-indigo-600"
                        title="Edit Kategori"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Hapus Kategori"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800 mb-1">{cat.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      cat.type === 'mpk_smaba' 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-sky-100 text-sky-700 border border-sky-200'
                    }`}>
                      {cat.type === 'mpk_smaba' ? 'Sistem Dapil / MPK' : 'Pemilihan Reguler'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Urutan #{cat.order || index + 1}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedCatId(cat.id);
                    if (cat.type === 'mpk_smaba') {
                      setCurrentLevel('dapil');
                    } else {
                      setCurrentLevel('candidate');
                    }
                  }}
                  className="w-full mt-2 py-2.5 px-3 bg-slate-50 hover:bg-ppu-blue hover:text-white text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Atur Kandidat & Wilayah</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 2: DAPIL SELECTION (MPK) */}
      {currentLevel === 'dapil' && isMpk && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">Daftar Dapil / Wilayah ({selectedCategory?.name})</h2>
              <p className="text-xs text-slate-500">Pilih atau atur Daerah Pemilihan sebelum menambahkan kandidat perwakilan.</p>
            </div>
            <button
              onClick={openAddDapil}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/15 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Dapil</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dapils.map((dap, index) => {
              const countCands = candidates.filter(c => c.dapil_id === dap.id).length;
              return (
                <div 
                  key={dap.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-extrabold text-xs">
                          #{dap.order || index + 1}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-800">{dap.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleMoveDapilOrder(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleMoveDapilOrder(index, 'down')}
                          disabled={index === dapils.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => openEditDapil(dap)}
                          className="p-1 text-slate-400 hover:text-indigo-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDapil(dap)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Kelas Terintegrasi:</div>
                      <div className="flex flex-wrap gap-1">
                        {dap.eligible_classes.map(cls => (
                          <span key={cls} className="text-[10px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedDapilId(dap.id);
                      setCurrentLevel('candidate');
                    }}
                    className="w-full mt-2 py-2.5 px-3 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Buka Kandidat Dapil ({countCands} Terdaftar)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 3: CANDIDATE SELECTION */}
      {currentLevel === 'candidate' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold text-slate-800">
                Kandidat - {selectedCategory?.name} {isMpk && selectedDapil ? `(${selectedDapil.name})` : ''}
              </h2>
              <p className="text-xs text-slate-500">Atur nomor urut, foto, nama paslon/perwakilan, visi & misi.</p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsDiagnosticOpen(true)}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 border border-slate-200 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-indigo-600" />
                <span>Diagnostik Storage</span>
              </button>
              <button
                onClick={() => openAddCandidate()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md shadow-emerald-600/15 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kandidat</span>
              </button>
            </div>
          </div>

          {/* Sub-navigation for MPK classes inside current Dapil */}
          {isMpk && selectedDapil && selectedDapil.eligible_classes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Pilih Kelas:</span>
              {selectedDapil.eligible_classes.map(cls => {
                const isActive = selectedMpkClass === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedMpkClass(cls)}
                    className={`px-3 py-1.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-purple-600 text-white shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Kelas {cls}
                  </button>
                );
              })}
            </div>
          )}

          {/* Candidates List */}
          {(() => {
            const filteredCandidates = isMpk
              ? candidates.filter(c => c.dapil_id === selectedDapilId && (c.class_name === selectedMpkClass || c.candidate_class === selectedMpkClass))
              : candidates;

            if (filteredCandidates.length === 0) {
              return (
                <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                  <User className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-sm font-extrabold text-slate-700">Belum Ada Kandidat Terdaftar</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Klik tombol "Tambah Kandidat" di atas untuk mendaftarkan paslon/perwakilan suara.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCandidates.map(cand => (
                  <div key={cand.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-extrabold text-sm flex items-center justify-center">
                          {cand.number}
                        </span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => openCandidateDetail(cand)}
                            className="p-1 text-slate-400 hover:text-sky-600"
                            title="Pratinjau Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditCandidate(cand)}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                            title="Edit Kandidat"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteCandidate(cand)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            title="Hapus Kandidat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Photo as main visual element */}
                      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-3 flex items-center justify-center">
                        {cand.photo_url ? (
                          <img src={cand.photo_url} alt={cand.chairman} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-slate-400" />
                        )}
                        {isMpk && (
                          <span className="absolute bottom-2 left-2 text-[10px] font-bold text-purple-700 bg-purple-100/90 backdrop-blur-xs px-2 py-0.5 rounded-md">
                            {cand.class_name || cand.candidate_class || selectedMpkClass}
                          </span>
                        )}
                      </div>

                      {/* Ketua & Wakil Horizontal Layout */}
                      {cand.vice ? (
                        <div className="grid grid-cols-2 gap-2 text-center pb-3 border-b border-slate-100 mb-3">
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                            <span className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight block truncate">{cand.chairman}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">WAKIL KETUA</span>
                            <span className="font-bold text-slate-700 text-xs leading-tight block truncate">{cand.vice}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center pb-3 border-b border-slate-100 mb-3">
                          <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm leading-tight block truncate">{cand.chairman}</span>
                        </div>
                      )}

                      {/* Visi */}
                      {cand.visi && (
                        <div className="text-center mb-3">
                          <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">Visi</span>
                          <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-justify">
                            "{cand.visi}"
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openCandidateDetail(cand)}
                      className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all text-center cursor-pointer"
                    >
                      Lihat Visi & Misi Lengkap
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* MODALS */}
      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        catEditing={catEditing}
        catId={catId}
        setCatId={setCatId}
        catName={catName}
        setCatName={setCatName}
        catIcon={catIcon}
        setCatIcon={setCatIcon}
        catType={catType}
        setCatType={setCatType}
        catOrder={catOrder}
        setCatOrder={setCatOrder}
        onSubmit={handleCategorySubmit}
      />

      <DapilModal
        isOpen={isDapilModalOpen}
        onClose={() => setIsDapilModalOpen(false)}
        dapilEditing={dapilEditing}
        dapilName={dapilName}
        setDapilName={setDapilName}
        dapilPhotoUrl={dapilPhotoUrl}
        setDapilPhotoUrl={setDapilPhotoUrl}
        dapilClasses={dapilClasses}
        setDapilClasses={setDapilClasses}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        triggerRef={triggerRef}
        dropdownRef={dropdownRef}
        dropdownPosition={dropdownPosition}
        toggleDropdown={toggleDropdown}
        onSubmit={handleDapilSubmit}
      />

      <CandidateModal
        isOpen={isCandModalOpen}
        onClose={() => setIsCandModalOpen(false)}
        candMode={candMode}
        candEditing={candEditing}
        candNumber={candNumber}
        setCandNumber={setCandNumber}
        candChairman={candChairman}
        setCandChairman={setCandChairman}
        candVice={candVice}
        setCandVice={setCandVice}
        candVisi={candVisi}
        setCandVisi={setCandVisi}
        candMisi={candMisi}
        setCandMisi={setCandMisi}
        candPhotoUrl={candPhotoUrl}
        setCandPhotoUrl={setCandPhotoUrl}
        selectedPhotoFile={selectedPhotoFile}
        setSelectedPhotoFile={setSelectedPhotoFile}
        isUploadingPhoto={isUploadingPhoto}
        photoUploadError={photoUploadError}
        photoInputMode={photoInputMode}
        setPhotoInputMode={setPhotoInputMode}
        isMpk={isMpk}
        selectedMpkClass={selectedMpkClass}
        onSubmit={handleCandidateSubmit}
        onOpenDiagnostic={() => setIsDiagnosticOpen(true)}
      />

      <CandidateDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        candidate={detailCandidate}
      />

      <StorageDiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
    </div>
  );
}
