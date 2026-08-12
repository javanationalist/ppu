import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { verifyVoterByCardId } from '../lib/votingService';
import { confirmVoterAccount, getConfirmedVoters } from '../lib/adminService';
import { Profile } from '../types';
import { ScannerOnboarding } from '../components/scanner/ScannerOnboarding';
import { TablePagination } from '../components/ui/TablePagination';
import { 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Users, 
  X, 
  RotateCw, 
  Search,
  Check,
  Loader2,
  ChevronUp,
  ArrowUpDown,
  RefreshCw,
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import { M3ExpressiveLoadingIndicator } from '../components/ui/M3ExpressiveLoadingIndicator';

export default function Scanner() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  // Onboarding Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    try {
      const isCompleted = localStorage.getItem('suaraku_scanner_onboarding_completed');
      if (!isCompleted) {
        setShowTutorial(true);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // 4 Digit Input State
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCamIdx, setCurrentCamIdx] = useState(0);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Confirmation & Popup State
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedVoter, setConfirmedVoter] = useState<Profile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Panel State for "Akun yang sudah dikonfirmasi"
  const [showConfirmedPanel, setShowConfirmedPanel] = useState(false);
  const [confirmedList, setConfirmedList] = useState<Profile[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Filter & Search & Sorting State (Reused from KelolaPemilih)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'semua' | 'memilih' | 'belum_memilih'>('semua');
  const [classFilter, setClassFilter] = useState<string>('semua');
  const [sortField, setSortField] = useState<'card_id' | 'full_name' | 'class' | 'email' | 'confirmed_at'>('confirmed_at');
  const [sortAscending, setSortAscending] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page to 1 when search query, filter, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, classFilter, sortField, sortAscending]);

  // Audio Beep
  const playBeep = (freq = 1200, duration = 0.15) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Fallback silent
    }
  };

  // Logout handler
  const handleLogout = async () => {
    stopCamera();
    await signOut();
    navigate('/login', { replace: true });
  };

  // Start Camera
  const startCamera = async () => {
    setCamError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCamError('Kamera tidak ditemukan pada perangkat.');
        return;
      }
      setCameras(devices);

      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      let targetIndex = 0;
      if (isMobile) {
        const backIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        if (backIdx >= 0) targetIndex = backIdx;
      }
      setCurrentCamIdx(targetIndex);
      await initScanner(devices[targetIndex].id);
    } catch (err: any) {
      setCamError('Izin kamera ditolak atau tidak tersedia.');
    }
  };

  const initScanner = async (cameraId: string) => {
    try {
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            await html5QrcodeRef.current.stop();
          }
        } catch (e) {}
      }

      const scanner = new Html5Qrcode('qr-terminal-reader');
      html5QrcodeRef.current = scanner;
      setIsCameraActive(true);

      await scanner.start(
        cameraId,
        {
          fps: 15,
        },
        (decodedText) => {
          const cleanCode = decodedText.trim();
          handleProcessCardId(cleanCode);
        },
        () => {}
      );
    } catch (err: any) {
      setIsCameraActive(false);
      setCamError('Gagal menjalankan kamera.');
    }
  };


  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (currentCamIdx + 1) % cameras.length;
    setCurrentCamIdx(nextIdx);
    await initScanner(cameras[nextIdx].id);
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {}
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // Fetch confirmed voters from Supabase
  const loadConfirmedVoters = async () => {
    setIsLoadingList(true);
    try {
      const data = await getConfirmedVoters();
      setConfirmedList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingList(false);
    }
  };

  // Toggle Panel
  const handleTogglePanel = () => {
    if (!showConfirmedPanel) {
      loadConfirmedVoters();
    }
    setShowConfirmedPanel(!showConfirmedPanel);
  };

  // Close Popup
  const closePopup = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    setConfirmedVoter(null);
    setDigits(['', '', '', '']);
    setErrorMessage(null);
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 100);
  };

  // Main Confirmation Processor
  const handleProcessCardId = async (cardIdStr: string) => {
    if (!cardIdStr || isProcessing || confirmedVoter) return;

    setIsProcessing(true);
    setErrorMessage(null);

    if (/^\d{4}$/.test(cardIdStr)) {
      setDigits(cardIdStr.split(''));
    }

    try {
      const voter = await verifyVoterByCardId(cardIdStr);

      if (voter && !voter.is_deleted) {
        const isAlreadyConfirmed = voter.account_status === 'dikonfirmasi';
        
        if (!isAlreadyConfirmed) {
          const adminEmail = profile?.email || 'scanner@ppu.com';
          const ok = await confirmVoterAccount(
            adminEmail,
            voter.id,
            voter.full_name,
            voter.card_id
          );

          if (ok) {
            playBeep(1200, 0.2);
            const nowIso = new Date().toISOString();
            setConfirmedVoter({
              ...voter,
              account_status: 'dikonfirmasi',
              confirmed_at: nowIso
            });
            if (showConfirmedPanel) loadConfirmedVoters();
          } else {
            playBeep(400, 0.3);
            setErrorMessage('Gagal memperbarui status akun.');
          }
        } else {
          playBeep(900, 0.15);
          setConfirmedVoter(voter);
        }

        // Silent auto-close in background after 5 seconds (no countdown shown to user)
        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = setTimeout(() => {
          closePopup();
        }, 5000);

      } else {
        playBeep(300, 0.3);
        setErrorMessage('Kode akun tidak valid.');
        setTimeout(() => {
          setErrorMessage(null);
          setDigits(['', '', '', '']);
          inputRefs[0].current?.focus();
        }, 2500);
      }
    } catch (err) {
      console.error(err);
      playBeep(300, 0.3);
      setErrorMessage('Terjadi kesalahan saat memproses.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4-Digit Input Handlers
  const handleDigitChange = (index: number, val: string) => {
    if (val && !/^[0-9]$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    const fullCode = newDigits.join('');
    if (fullCode.length === 4) {
      handleProcessCardId(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{4}$/.test(pasted)) {
      setDigits(pasted.split(''));
      inputRefs[3].current?.focus();
      handleProcessCardId(pasted);
    }
  };

  // Extract unique classes for class dropdown filter
  const uniqueClasses = Array.from(
    new Set(confirmedList.map((item) => item.class).filter((c): c is string => Boolean(c && c.trim())))
  ).sort();

  // Dynamic filter processing (Reused from KelolaPemilih)
  const processedList = confirmedList.filter((item) => {
    // 1. Strict filter: role = "user" AND account_status = "dikonfirmasi"
    if (item.role && item.role !== 'user') return false;
    if (item.account_status !== 'dikonfirmasi') return false;
    if (item.is_deleted) return false;

    // 2. Search Query (full_name, class, email, card_id)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        (item.full_name || '').toLowerCase().includes(q) ||
        (item.class || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.card_id || '').toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 3. Class Filter
    if (classFilter !== 'semua' && item.class !== classFilter) {
      return false;
    }

    // 4. Quick Status Filter (Semua / Sudah Memilih / Belum Memilih)
    if (activeFilter === 'memilih' && item.voting_status !== 'sudah') {
      return false;
    }
    if (activeFilter === 'belum_memilih' && item.voting_status === 'sudah') {
      return false;
    }

    return true;
  });

  // Dynamic sorting (Reused from KelolaPemilih)
  const sortedList = [...processedList].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === 'confirmed_at') {
      valA = new Date(a.confirmed_at || (a as any).updated_at || a.created_at || 0).getTime();
      valB = new Date(b.confirmed_at || (b as any).updated_at || b.created_at || 0).getTime();
    } else {
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAscending ? valA - valB : valB - valA;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortAscending
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return 0;
  });

  // Paginated List
  const paginatedList = sortedList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field: 'card_id' | 'full_name' | 'class' | 'email' | 'confirmed_at') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  const isFilterModified = 
    searchQuery.trim() !== '' || 
    activeFilter !== 'semua' || 
    classFilter !== 'semua' || 
    sortField !== 'confirmed_at' || 
    sortAscending;

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilter('semua');
    setClassFilter('semua');
    setSortField('confirmed_at');
    setSortAscending(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      
      {/* HEADER: Clean Light PPU Style */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Left: ONLY PPU Logo */}
        <div className="flex items-center">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Right: Tutorial Icon, "Akun yang sudah dikonfirmasi" Button & Logout */}
        <div className="flex items-center gap-2">
          {/* Tutorial Icon Button (Icon only) */}
          <button
            type="button"
            data-tour="scanner-tutorial-btn"
            onClick={() => setShowTutorial(true)}
            className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Buka Tutorial Panduan Scanner"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button
            type="button"
            data-tour="scanner-confirmed-btn"
            onClick={handleTogglePanel}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 ${
              showConfirmedPanel 
                ? 'bg-slate-800 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Akun yang sudah dikonfirmasi</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col items-center space-y-6">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2 shadow-xs">
            <XCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* JUDUL DI ATAS KAMERA */}
        <div className="w-full max-w-sm text-center">
          <h2 className="text-sm font-bold text-slate-800 tracking-wide">
            Pindai Kode QR Siswa
          </h2>
        </div>

        {/* CAMERA SECTION: Natural, Clear, No Overlays or Darkening */}
        <div 
          data-tour="scanner-camera"
          className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-2 shadow-xs flex flex-col items-center"
        >
          <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 flex items-center justify-center">
            
            <div id="qr-terminal-reader" className="w-full h-full object-cover"></div>

            {/* SINGLE GREEN HORIZONTAL SCAN LINE - NO BOX AROUND IT */}
            {isCameraActive && !camError && !isProcessing && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-10 px-8">
                <div className="w-full h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse" />
              </div>
            )}

            {/* Loading Indicator */}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-2 z-10">
                <M3ExpressiveLoadingIndicator size="medium" className="text-indigo-600" />
                <span className="text-xs font-semibold text-slate-700">Memproses konfirmasi...</span>
              </div>
            )}

            {/* Camera Error Message */}
            {camError && (
              <div className="absolute inset-0 bg-slate-50 p-4 flex flex-col items-center justify-center text-center gap-2 z-10">
                <XCircle className="w-7 h-7 text-amber-500" />
                <p className="text-xs text-slate-600 font-medium">{camError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Coba Kamera Lagi
                </button>
              </div>
            )}

            {/* Switch Camera Button if multiple */}
            {cameras.length > 1 && isCameraActive && (
              <button
                type="button"
                onClick={switchCamera}
                className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-slate-700 p-2 rounded-full border border-slate-200 cursor-pointer shadow-md z-20"
                title="Ganti Kamera"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* INPUT MANUAL 4 DIGIT */}
        <div 
          data-tour="scanner-input"
          className="w-full max-w-sm bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col items-center space-y-3"
        >
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            Input Manual (4 Digit)
          </p>

          <div className="flex gap-3 justify-center w-full">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={inputRefs[index]}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={isProcessing || !!confirmedVoter}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-14 h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-300 focus:border-indigo-600 text-slate-900 rounded-xl focus:outline-none focus:bg-white transition-all shadow-inner disabled:opacity-50"
              />
            ))}
          </div>
        </div>

        {/* PANEL: "AKUN YANG SUDAH DIKONFIRMASI" (In-page Section, NOT Modal) */}
        {showConfirmedPanel && (
          <section className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Akun Terkonfirmasi
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadConfirmedVoters}
                  disabled={isLoadingList}
                  className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Refresh Data"
                >
                  {isLoadingList ? (
                    <M3ExpressiveLoadingIndicator size="small" className="text-indigo-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmedPanel(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Tutup Panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter and Search Action Row (Matching KelolaPemilih) */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              {/* Quick Filter Status Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('semua')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'semua'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua Akun
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('memilih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'memilih'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Sudah Memilih
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('belum_memilih')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'belum_memilih'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Belum Memilih
                </button>

                {/* Class Filter Dropdown */}
                {uniqueClasses.length > 0 && (
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="semua">Semua Kelas</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dynamic Search & Reset Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama, kelas, email, card ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition-all font-medium"
                  />
                </div>

                {isFilterModified && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Reset Filter"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Table View (5 Columns) */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              {isLoadingList ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <M3ExpressiveLoadingIndicator size="medium" className="text-indigo-600" />
                  <span className="text-xs font-medium">Memuat data dari Supabase...</span>
                </div>
              ) : sortedList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs space-y-1">
                  <p className="font-bold text-slate-600">Tidak ada akun terkonfirmasi yang ditemukan</p>
                  <p className="text-[11px] text-slate-400">Coba atur ulang kata kunci atau filter pencarian.</p>
                  {isFilterModified && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort('card_id')}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>CARD ID</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort('full_name')}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>NAMA</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort('class')}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>KELAS</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>EMAIL</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                      <th className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort('confirmed_at')}
                          className="flex items-center gap-1 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <span>CONFIRMED AT</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-2.5 select-all whitespace-nowrap">
                          <span className="font-mono font-extrabold text-blue-700 bg-blue-50/70 border border-blue-100/60 px-2 py-0.5 rounded text-[11px]">
                            {item.card_id || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {item.full_name}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[11px]">
                            {item.class || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {item.email}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                          {formatDate(item.confirmed_at || (item as any).updated_at || item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Table Pagination Controls */}
              {sortedList.length > 0 && !isLoadingList && (
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={sortedList.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
              <span>Total: <strong>{sortedList.length}</strong> akun terkonfirmasi</span>
              <button
                type="button"
                onClick={() => setShowConfirmedPanel(false)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1"
              >
                <span>Tutup Menu</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

      </main>

      {/* POPUP DETAIL AKUN (Compact, No Blur, No Countdown display) */}
      {confirmedVoter && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xs w-full p-5 text-center space-y-4 shadow-xl">
            
            {/* Status Icon */}
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-0.5">
              <h3 className="text-base font-bold text-slate-900">Akun Dikonfirmasi</h3>
              <p className="text-xs text-slate-500">Detail data pemilih:</p>
            </div>

            {/* Account Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left space-y-2 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Card ID</p>
                <p className="font-bold text-indigo-600">{confirmedVoter.card_id || '-'}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Nama</p>
                <p className="font-bold text-slate-900">{confirmedVoter.full_name}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Email</p>
                <p className="font-medium text-slate-600 truncate">{confirmedVoter.email}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Status</p>
                <span className="inline-flex items-center gap-1 mt-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                  <Check className="w-3 h-3" />
                  Dikonfirmasi
                </span>
              </div>
            </div>

            {/* OK Button */}
            <button
              type="button"
              onClick={closePopup}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            >
              OK
            </button>

          </div>
        </div>
      )}

      {/* TUTORIAL ONBOARDING SCANNER */}
      <ScannerOnboarding
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

    </div>
  );
}
