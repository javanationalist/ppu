import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { verifyVoterByCardId } from '../lib/votingService';
import { confirmVoterAccount, getConfirmedVoters } from '../lib/adminService';
import { Profile } from '../types';
import { 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Users, 
  X, 
  RotateCw, 
  Search,
  Check,
  Loader2
} from 'lucide-react';

export default function Scanner() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

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
  const [popupNotice, setPopupNotice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(5);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audit List Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditList, setAuditList] = useState<Profile[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  // Audio Beep
  const playBeep = (freq = 1000, duration = 0.15) => {
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
      // Audio fallback
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
        setCamError('Kamera tidak ditemukan.');
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
          qrbox: (w, h) => {
            const minDim = Math.min(w, h);
            const boxSize = Math.max(50, Math.min(minDim * 0.7, 240));
            return { width: boxSize, height: boxSize };
          }
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
      clearPopupTimers();
    };
  }, []);

  // Timers cleanup
  const clearPopupTimers = () => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  // Close Popup
  const closePopup = () => {
    clearPopupTimers();
    setConfirmedVoter(null);
    setPopupNotice('');
    setDigits(['', '', '', '']);
    setErrorMessage(null);
    // Refocus first input box
    setTimeout(() => {
      inputRefs[0].current?.focus();
    }, 100);
  };

  // Main Confirmation Processor
  const handleProcessCardId = async (cardIdStr: string) => {
    if (!cardIdStr || isProcessing || confirmedVoter) return;

    setIsProcessing(true);
    setErrorMessage(null);

    // If cardIdStr is 4 digits, update digits display
    if (/^\d{4}$/.test(cardIdStr)) {
      setDigits(cardIdStr.split(''));
    }

    try {
      const voter = await verifyVoterByCardId(cardIdStr);

      if (voter && !voter.is_deleted) {
        let isAlreadyConfirmed = voter.account_status === 'dikonfirmasi';
        
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
            setConfirmedVoter({ ...voter, account_status: 'dikonfirmasi' });
            setPopupNotice('Akun Berhasil Dikonfirmasi!');
          } else {
            playBeep(400, 0.3);
            setErrorMessage('Gagal memperbarui status akun ke database.');
          }
        } else {
          playBeep(800, 0.15);
          setConfirmedVoter(voter);
          setPopupNotice('Akun Sudah Dikonfirmasi Sebelumnya.');
        }

        // Setup 5-second auto-close timer and countdown
        if (!isAlreadyConfirmed || voter) {
          setCountdown(5);
          clearPopupTimers();

          countdownIntervalRef.current = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(countdownIntervalRef.current!);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          autoCloseTimerRef.current = setTimeout(() => {
            closePopup();
          }, 5000);
        }
      } else {
        playBeep(300, 0.4);
        setErrorMessage('Kode akun tidak valid / data tidak ditemukan.');
        // Auto reset error after 3 seconds
        setTimeout(() => {
          setErrorMessage(null);
          setDigits(['', '', '', '']);
          inputRefs[0].current?.focus();
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      playBeep(300, 0.4);
      setErrorMessage('Terjadi kesalahan saat memvalidasi akun.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4-Digit Input Handlers
  const handleDigitChange = (index: number, val: string) => {
    // Only accept numbers
    if (val && !/^[0-9]$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    // Auto advance to next box
    if (val && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Check if all 4 digits filled
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
      const parts = pasted.split('');
      setDigits(parts);
      inputRefs[3].current?.focus();
      handleProcessCardId(pasted);
    }
  };

  // Fetch Audit List
  const openAuditModal = async () => {
    setShowAuditModal(true);
    setIsLoadingAudit(true);
    try {
      const data = await getConfirmedVoters();
      setAuditList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  const filteredAuditList = auditList.filter(item => 
    item.full_name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    item.email?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    item.card_id?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
      {/* Header */}
      <header className="bg-slate-800/90 border-b border-slate-700/80 px-4 py-3 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md">
        {/* Title / Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="h-7 w-auto object-contain"
          />
          <span className="text-sm font-black tracking-wide text-white uppercase">
            Terminal Scanner
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openAuditModal}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Akun yang sudah dikonfirmasi</span>
            <span className="sm:hidden">Dikonfirmasi</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer active:scale-95"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Terminal Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-center space-y-5">
        
        {/* Error Notification */}
        {errorMessage && (
          <div className="w-full bg-red-500/10 border border-red-500/40 text-red-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Camera Container */}
        <div className="w-full relative bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl aspect-square flex flex-col items-center justify-center">
          
          <div id="qr-terminal-reader" className="w-full h-full object-cover"></div>

          {/* Scanner Overlay Line */}
          {isCameraActive && !isProcessing && !confirmedVoter && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[70%] h-[70%] border-2 border-indigo-400/60 border-dashed rounded-xl flex items-center justify-center relative overflow-hidden">
                <div className="w-full h-0.5 bg-indigo-500 animate-scan-line shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-xs font-bold text-indigo-200">Memproses Konfirmasi...</span>
            </div>
          )}

          {/* Camera Error or Retry */}
          {camError && (
            <div className="absolute inset-0 bg-slate-900/90 p-4 flex flex-col items-center justify-center text-center gap-2 z-10">
              <XCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-300 font-medium">{camError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              >
                Coba Kamera Lagi
              </button>
            </div>
          )}

          {/* Switch Camera Button if multiple devices */}
          {cameras.length > 1 && isCameraActive && (
            <button
              type="button"
              onClick={switchCamera}
              className="absolute bottom-2 right-2 bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-full border border-slate-600 cursor-pointer shadow-md"
              title="Ganti Kamera"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4 Digit Manual Input Form */}
        <div className="w-full bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl flex flex-col items-center space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
            Atau Masukkan Kode 4 Angka:
          </p>

          <div className="flex gap-2.5 justify-center w-full max-w-xs">
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
                className="w-14 h-14 text-center text-2xl font-black bg-slate-900 border-2 border-slate-600 focus:border-indigo-500 text-white rounded-xl focus:outline-none transition-all shadow-inner disabled:opacity-50"
              />
            ))}
          </div>
        </div>

      </main>

      {/* POPUP DETAIL AKUN (Auto closes in 5 seconds) */}
      {confirmedVoter && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-emerald-500/60 rounded-2xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl">
            
            {/* Status Icon */}
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">{popupNotice}</h3>
              <p className="text-xs text-slate-400">Detail akun pemilih telah diperbarui:</p>
            </div>

            {/* Account Details Box */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 text-left space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Nama Lengkap</p>
                <p className="text-sm font-black text-white">{confirmedVoter.full_name}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Email</p>
                <p className="text-xs font-medium text-slate-300 truncate">{confirmedVoter.email}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Status Konfirmasi</p>
                <span className="inline-flex items-center gap-1 mt-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  <Check className="w-3 h-3" />
                  Dikonfirmasi
                </span>
              </div>
            </div>

            {/* Countdown notice & OK Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={closePopup}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-2.5 rounded-xl transition-all cursor-pointer shadow-lg active:scale-95"
              >
                OK
              </button>
              <p className="text-[10px] text-slate-400">
                Otomatis menutup dalam <span className="font-bold text-white">{countdown}</span> detik...
              </p>
            </div>

          </div>
        </div>
      )}

      {/* AUDIT LIST MODAL ("Akun yang sudah dikonfirmasi") */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-850">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Akun Yang Sudah Dikonfirmasi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-3 border-b border-slate-700 bg-slate-900">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama atau email..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Audit List Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {isLoadingAudit ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs font-bold">Mengambil data dari Supabase...</span>
                </div>
              ) : filteredAuditList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada akun yang terkonfirmasi atau pencarian tidak ditemukan.
                </div>
              ) : (
                filteredAuditList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900/80 border border-slate-700/60 rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{item.full_name}</p>
                      <p className="text-slate-400 text-[11px]">{item.email}</p>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0">
                      Dikonfirmasi
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-700 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
              <span>Total: <strong className="text-white">{filteredAuditList.length}</strong> akun</span>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
