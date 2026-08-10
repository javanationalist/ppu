import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Monitor, 
  CheckCircle, 
  RefreshCw, 
  AlertTriangle, 
  Camera, 
  X, 
  AlertCircle,
  Clock,
  Users,
  GraduationCap,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getVoteMode, connectVoterToBooth, VoteMode, getBoothSession, getBoothProfileByCode } from '../../lib/voteModeService';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { HelpdeskButton, Dapil } from '../../types';
import { GelombangSesi } from '../../lib/gelombangService';

interface ScanQrTabProps {
  isAllCompleted?: boolean;
  onStateChange?: (state: 'ready' | 'confirming' | 'voting' | 'cancelled' | 'disconnected' | 'success') => void;
  isSessionConfigActive: boolean;
  userSession: GelombangSesi | null;
  userDapil: Dapil | null;
  helpdeskButtons: HelpdeskButton[];
}

const formatManualInput = (input: string): string => {
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  if (/^PPU-[A-Z0-9]+-[A-Z0-9]{4}$/.test(clean)) {
    return clean;
  }
  
  if (clean.startsWith('PPU') && clean.length >= 7) {
    const withoutPrefix = clean.substring(3);
    const cc = withoutPrefix.substring(0, withoutPrefix.length - 4);
    const xxxx = withoutPrefix.substring(withoutPrefix.length - 4);
    const formattedCC = cc.padStart(2, '0');
    return `PPU-${formattedCC}-${xxxx}`;
  }

  if (clean.length >= 5) {
    const cc = clean.substring(0, clean.length - 4);
    const xxxx = clean.substring(clean.length - 4);
    const formattedCC = cc.padStart(2, '0');
    return `PPU-${formattedCC}-${xxxx}`;
  }
  
  return clean;
};

type StateType = 'ready' | 'confirming' | 'voting' | 'cancelled' | 'disconnected' | 'success';

export default function ScanQrTab({ 
  isAllCompleted = false, 
  onStateChange,
  isSessionConfigActive,
  userSession,
  userDapil,
  helpdeskButtons,
}: ScanQrTabProps) {
  const { profile } = useAuth();
  const [voteMode, setVoteMode] = useState<VoteMode>('regular');
  const [loading, setLoading] = useState(true);
  const [currentState, setCurrentState] = useState<StateType>('ready');
  
  // Connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [restartKey, setRestartKey] = useState(0);

  // Active session states
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [targetBooth, setTargetBooth] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Load configuration and persisted sessions
  useEffect(() => {
    async function loadConfigAndPersisted() {
      try {
        const currentMode = await getVoteMode();
        setVoteMode(currentMode);

        const persistedId = localStorage.getItem('ppu_active_voting_session_id');
        if (persistedId && currentMode === 'booth') {
          setIsConnecting(true);
          const sessionData = await getBoothSession(persistedId);
          if (sessionData) {
            setScannedToken(persistedId);
            const parts = persistedId.split('-');
            const cc = parts[1];
            if (cc) {
              const boothProfile = await getBoothProfileByCode(cc);
              setTargetBooth(boothProfile);
            }

            if (sessionData.status === 'connected') {
              setCurrentState('voting');
              if (onStateChange) onStateChange('voting');
            } else if (sessionData.status === 'completed') {
              setCurrentState('success');
              if (onStateChange) onStateChange('success');
            } else {
              localStorage.removeItem('ppu_active_voting_session_id');
              setCurrentState('ready');
              if (onStateChange) onStateChange('ready');
            }
          } else {
            localStorage.removeItem('ppu_active_voting_session_id');
            setCurrentState('ready');
            if (onStateChange) onStateChange('ready');
          }
        }
      } catch (err) {
        console.error('Failed to load initial scanner state:', err);
      } finally {
        setLoading(false);
        setIsConnecting(false);
      }
    }
    loadConfigAndPersisted();
  }, []);

  // Poll database for real-time session updates when in STATE 3: voting
  useEffect(() => {
    if (currentState !== 'voting' || !scannedToken) return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const sessionData = await getBoothSession(scannedToken);
        if (!isSubscribed) return;

        if (sessionData) {
          if (sessionData.status === 'completed') {
            clearInterval(pollInterval);
            setCurrentState('success');
            if (onStateChange) onStateChange('success');
            localStorage.removeItem('ppu_active_voting_session_id');
          } else if (sessionData.status === 'cancelled') {
            clearInterval(pollInterval);
            
            const parts = scannedToken.split('-');
            const cc = parts[1];
            let boothProfile = null;
            if (cc) {
              boothProfile = await getBoothProfileByCode(cc);
            }
            
            if (boothProfile && boothProfile.voting_status === 'offline') {
              setCountdown(30);
              setCurrentState('disconnected');
              if (onStateChange) onStateChange('disconnected');
            } else {
              setCountdown(5);
              setCurrentState('cancelled');
              if (onStateChange) onStateChange('cancelled');
            }
            localStorage.removeItem('ppu_active_voting_session_id');
          }
        } else {
          clearInterval(pollInterval);
          setCountdown(30);
          setCurrentState('disconnected');
          if (onStateChange) onStateChange('disconnected');
          localStorage.removeItem('ppu_active_voting_session_id');
        }
      } catch (err) {
        console.error('Error polling session status:', err);
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [currentState, scannedToken]);

  // Countdown timer for State 4 and State 5
  useEffect(() => {
    if (currentState !== 'cancelled' && currentState !== 'disconnected') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCurrentState('ready');
          if (onStateChange) onStateChange('ready');
          setScannedToken(null);
          setTargetBooth(null);
          setManualToken('');
          setRestartKey((k) => k + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentState]);

  // Reset currentState to 'ready' if voting status is reset/not completed, and sync state changes
  useEffect(() => {
    if (!isAllCompleted) {
      localStorage.removeItem('ppu_active_voting_session_id');
      if (currentState === 'success') {
        setCurrentState('ready');
        if (onStateChange) onStateChange('ready');
      }
    } else if (isAllCompleted && currentState !== 'success') {
      setCurrentState('success');
      if (onStateChange) onStateChange('success');
    }
  }, [isAllCompleted, currentState, onStateChange]);

  // Initialize html5-qrcode scanner for STATE 1: ready
  useEffect(() => {
    if (voteMode !== 'booth' || currentState !== 'ready' || isAllCompleted) return;

    const scannerId = 'ppu-qr-reader';
    const scannerElement = document.getElementById(scannerId);
    
    if (scannerElement) {
      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          scannerId,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true
          },
          /* verbose= */ false
        );
        
        scannerRef.current = html5QrcodeScanner;

        const onScanSuccess = async (decodedText: string) => {
          const cleanText = decodedText.trim();
          const isValidToken = cleanText.startsWith('session_') || /^PPU-[A-Z0-9]+-[A-Z0-9]{4}$/i.test(cleanText);

          if (isValidToken) {
            try {
              html5QrcodeScanner.clear();
            } catch (err) {
              console.warn('Error clearing scanner:', err);
            }
            await handleScanCheck(cleanText);
          } else {
            try {
              html5QrcodeScanner.clear();
            } catch (err) {
              console.warn('Error clearing scanner:', err);
            }
            setScanError('Format QR Code Sesi Bilik tidak sah.');
            setCurrentState('ready');
          }
        };

        const onScanFailure = () => {};

        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      } catch (err) {
        console.error('Html5QrcodeScanner init error:', err);
      }
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [voteMode, currentState, isAllCompleted, restartKey]);

  const handleScanCheck = async (token: string): Promise<boolean> => {
    setIsConnecting(true);
    setScanError(null);

    try {
      const sessionData = await getBoothSession(token);
      if (!sessionData) {
        setScanError('Token Sesi Bilik tidak ditemukan atau tidak sah.');
        return false;
      }

      if (sessionData.status !== 'waiting') {
        setScanError('Bilik Suara sedang sibuk atau sesi ini sudah kedaluwarsa.');
        return false;
      }

      let targetProfile = null;
      const parts = token.split('-');
      const cc = parts[1];
      if (cc) {
        targetProfile = await getBoothProfileByCode(cc);
      }
      setTargetBooth(targetProfile);
      setScannedToken(token);
      
      setCurrentState('confirming');
      if (onStateChange) onStateChange('confirming');
      return true;
    } catch (err) {
      console.error(err);
      setScanError('Gagal memverifikasi Sesi Bilik Suara.');
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let token = manualToken.trim();
    if (!token) return;

    token = formatManualInput(token);

    const isValidToken = token.startsWith('session_') || /^PPU-[A-Z0-9]+-[A-Z0-9]{4}$/i.test(token);
    if (isValidToken) {
      await handleScanCheck(token);
    } else {
      setScanError('Format Token Sesi tidak sah. Masukkan dengan format CCXXXX (contoh: 01X8K4) atau PPU-CC-XXXX.');
    }
  };

  const handleCancelSession = () => {
    setCurrentState('ready');
    if (onStateChange) onStateChange('ready');
    setScannedToken(null);
    setTargetBooth(null);
    setManualToken('');
    setRestartKey(prev => prev + 1);
  };

  const handleProceedSession = async () => {
    if (!scannedToken || !profile) return;
    setIsConnecting(true);
    setScanError(null);

    const classCode = (profile.class || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cardSuffix = profile.card_id || '0000';
    const documentSerial = `PPU-26-${classCode}${cardSuffix}`;

    try {
      const success = await connectVoterToBooth(scannedToken, {
        user_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        document_serial: documentSerial,
        card_id: profile.card_id
      });

      if (success) {
        localStorage.setItem('ppu_active_voting_session_id', scannedToken);
        setCurrentState('voting');
        if (onStateChange) onStateChange('voting');
      } else {
        setScanError('Gagal menghubungkan ke terminal bilik. Sesi mungkin sudah kedaluwarsa.');
        setCurrentState('ready');
        if (onStateChange) onStateChange('ready');
      }
    } catch (err) {
      console.error(err);
      setScanError('Terjadi kesalahan koneksi sistem.');
      setCurrentState('ready');
      if (onStateChange) onStateChange('ready');
    } finally {
      setIsConnecting(false);
    }
  };



  if (loading) {
    return (
      <div className="max-w-md mx-auto p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <RefreshCw className="w-8 h-8 text-indigo-650 dark:text-sky-400 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">Memvalidasi Status Sistem...</p>
        </div>
      </div>
    );
  }

  // Helper renderer for Booth State Views (Ready, confirming, voting, cancelled, disconnected, success)
  const renderBoothStateView = () => {
    // SUCCESS
    if (isAllCompleted || currentState === 'success') {
      return (
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 sm:p-8 text-center shadow-sm transition-colors duration-300 space-y-6">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 mx-auto mb-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-850 dark:text-[#f5f5f5] tracking-tight">Pemilihan Berhasil!</h2>
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
              Terima kasih telah berpartisipasi dalam Pemilu Raya Digital SMAN 1 Bangsal.
            </p>
            <p className="text-slate-500 dark:text-[#a3a3a3] text-xs leading-relaxed">
              Hak suara Anda telah sukses direkam oleh sistem.
            </p>
          </div>
        </div>
      );
    }

    // VOTING IN PROGRESS
    if (currentState === 'voting') {
      return (
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 sm:p-8 text-center shadow-sm transition-colors duration-300 space-y-6">
          <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 mx-auto mb-2 shadow-sm animate-pulse">
            <RefreshCw className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">Pemungutan Suara Berlangsung</h2>
            <p className="text-indigo-650 dark:text-indigo-400 font-bold text-sm">
              Sedang melakukan pemungutan suara.
            </p>
            <p className="text-slate-500 dark:text-[#a3a3a3] text-xs leading-relaxed">
              Silakan lanjutkan proses pemilihan di Bilik Suara. Jangan menutup halaman ini hingga selesai.
            </p>
          </div>
        </div>
      );
    }

    // CANCELLED
    if (currentState === 'cancelled') {
      return (
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 sm:p-8 text-center shadow-sm transition-colors duration-300 space-y-6">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/40 mx-auto mb-2 shadow-sm">
            <AlertCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">Sesi Dibatalkan</h2>
            <p className="text-rose-600 dark:text-rose-450 font-bold text-sm leading-relaxed">
              Sesi pemungutan suara dibatalkan oleh operator Bilik Suara.
            </p>
            <p className="text-slate-400 dark:text-[#a3a3a3] text-xs">
              Mengalihkan kembali dalam <span className="font-bold text-slate-700 dark:text-white">{countdown}</span> detik...
            </p>
          </div>
        </div>
      );
    }

    // DISCONNECTED
    if (currentState === 'disconnected') {
      return (
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 sm:p-8 text-center shadow-sm transition-colors duration-300 space-y-6">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/40 mx-auto mb-2 shadow-sm animate-bounce">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">Koneksi Terputus</h2>
            <p className="text-amber-650 dark:text-amber-500 font-bold text-sm leading-relaxed">
              Koneksi terputus dari Bilik Suara.
            </p>
            <p className="text-slate-500 dark:text-[#a3a3a3] text-xs leading-relaxed">
              Silakan hubungi panitia jika ini adalah kesalahan.
            </p>
            <p className="text-slate-400 dark:text-[#a3a3a3] text-xs">
              Kembali ke halaman utama dalam <span className="font-bold text-slate-700 dark:text-white">{countdown}</span> detik...
            </p>
          </div>
        </div>
      );
    }

    // DEFAULT: READY TO SCAN
    return (
      <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200/90 dark:border-[#333333] rounded-2xl p-4 sm:p-6 shadow-2xs transition-all duration-300 space-y-5 text-left relative">
        {/* Compact Modern Header */}
        <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100 dark:border-[#333333]">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-sky-500/10 border border-blue-100 dark:border-sky-500/20 flex items-center justify-center text-blue-600 dark:text-sky-400 shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              Koneksi Bilik Suara
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Hubungkan perangkat Anda ke bilik suara untuk memulai sesi pemilihan.
            </p>
          </div>
        </div>

        {scanError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex gap-2 items-start font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-left">{scanError}</p>
          </div>
        )}

        {/* Camera / QR Reader Stage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 px-0.5">
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400" />
              Pindai Kode QR
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">Arahkan ke kamera</span>
          </div>

          <div key={restartKey} className="relative rounded-2xl overflow-hidden bg-slate-900/5 dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#333333] shadow-2xs min-h-[220px] sm:min-h-[260px] flex items-center justify-center transition-all">
            <div id="ppu-qr-reader" className="w-full h-full text-slate-900" />
            
            {isConnecting && (
              <div className="absolute inset-0 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20">
                <RefreshCw className="w-8 h-8 text-blue-600 dark:text-sky-400 animate-spin" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Menghubungkan Pemilih...</p>
              </div>
            )}
          </div>
        </div>

        {/* Manual Input Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#333333] space-y-2.5">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              Masukkan Kode Sesi
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Gunakan kode sesi jika tidak dapat memindai QR.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Masukkan kode sesi"
                value={manualToken}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
                  if (val.length <= 12) {
                    setManualToken(val);
                  }
                }}
                className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-[#333333] focus:border-blue-500 dark:focus:border-sky-500 focus:bg-white dark:focus:bg-[#2a2a2a] rounded-xl text-xs sm:text-sm font-semibold tracking-wide focus:outline-none transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:font-normal"
              />
            </div>
            <button
              type="submit"
              disabled={isConnecting || !manualToken.trim()}
              className="px-4.5 py-2.5 sm:py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center justify-center shrink-0 cursor-pointer"
            >
              <span>Hubungkan</span>
            </button>
          </form>
        </div>

        {/* CONFIRMATION POPUP */}
        {currentState === 'confirming' && (
          <div id="confirmation-popup" className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 z-[9999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] w-full max-w-sm rounded-2xl p-5 sm:p-6 shadow-xl space-y-5 text-center animate-scale-up">
              <div className="w-14 h-14 bg-blue-50 dark:bg-sky-500/10 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-sky-500/20 mx-auto">
                <Monitor className="w-7 h-7 text-blue-600 dark:text-sky-400" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {targetBooth ? targetBooth.full_name : 'Bilik Suara'}
                </h3>
                {targetBooth?.class && (
                  <p className="text-blue-600 dark:text-sky-400 text-xs sm:text-sm font-bold">
                    {targetBooth.class}
                  </p>
                )}
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                  Anda akan melakukan pemungutan suara pada Bilik Suara ini.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#222222] border border-slate-200/80 dark:border-[#333333] p-3 rounded-xl text-left text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">ID Terminal:</span>
                  <span className="font-bold text-blue-700 dark:text-sky-300 uppercase">{scannedToken}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCancelSession}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#333333] dark:hover:bg-[#3d3d3d] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProceedSession}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  Lanjut
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSesiDapilInfo = () => {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 shadow-sm space-y-5 transition-colors text-left">
        <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-[#f5f5f5] border-b border-slate-100 dark:border-[#2a2a2a] pb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-ppu-blue dark:text-sky-400 animate-pulse" />
          <span>Sesi & Wilayah Pilih</span>
        </h3>

        {/* Sesi Section */}
        {isSessionConfigActive && (
          <div className="space-y-1.5">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-[#a3a3a3]">ALOKASI SESI</p>
            {userSession ? (
              <div className="bg-slate-50 dark:bg-[#252525]/40 border border-slate-150 dark:border-[#333333] rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.01)] flex gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100">{userSession.nama_sesi}</h4>
                  <p className="text-xs sm:text-sm font-black text-blue-600 dark:text-sky-400 mt-0.5">{userSession.jam_mulai} - {userSession.jam_selesai} WIB</p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-[#252525]/40 border border-slate-150 dark:border-[#333333] rounded-2xl p-4 text-left flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100/50 dark:border-amber-900/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-700 dark:text-amber-400">Belum Dijadwalkan</h4>
                  <p className="text-[10px] text-slate-450 dark:text-[#a3a3a3] mt-0.5">Jadwal sesi pemilihan Anda belum ditentukan panitia.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dapil Section */}
        <div className="space-y-1.5">
          <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-[#a3a3a3]">ALOKASI DAPIL</p>
          {userDapil ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100/70 dark:border-indigo-900/40 rounded-2xl p-4 flex gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-indigo-150 dark:bg-indigo-900/40 text-indigo-650 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-[#f5f5f5] uppercase">{userDapil.name}</h4>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-[#a3a3a3] mt-0.5">
                    Anda terdaftar dalam wilayah pemilihan <span className="font-bold text-indigo-600 dark:text-sky-300">{userDapil.name}</span>.
                  </p>
                </div>
              </div>

              {/* Classes list */}
              <div className="bg-slate-50/50 dark:bg-[#1a1a1a]/30 border border-slate-200 dark:border-[#333333] rounded-2xl p-4">
                <h5 className="text-[10px] font-black text-slate-500 dark:text-[#a3a3a3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-slate-450" />
                  <span>Daftar Kelas Dapil</span>
                </h5>
                {userDapil.eligible_classes && userDapil.eligible_classes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {userDapil.eligible_classes.map((cls) => (
                      <span 
                        key={cls}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-md text-[10px] font-bold text-slate-700 dark:text-sky-300"
                      >
                        <span className="w-1 h-1 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"></span>
                        <span>{cls}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 dark:text-[#a3a3a3] italic">Tidak ada kelas di dapil ini.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#252525]/40 border border-slate-150 dark:border-[#333333] rounded-2xl p-4 text-center text-slate-450 dark:text-[#a3a3a3]">
              <p className="text-xs font-bold">Dapil Belum Dialokasikan</p>
              <p className="text-[10px] mt-0.5">Silakan hubungi admin panitia kesiswaan untuk alokasi dapil.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHelpdeskInfo = () => {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 shadow-sm space-y-4 transition-colors text-left flex flex-col justify-between h-full min-h-[180px]">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-[#f5f5f5] border-b border-slate-100 dark:border-[#2a2a2a] pb-3 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            <span>Layanan Bantuan</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed transition-colors mt-3 font-medium">
            Mengalami kendala teknis atau memiliki pertanyaan? Anda dapat langsung menghubungi panitia melalui kontak di bawah.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-3">
          {helpdeskButtons.map((btn) => (
            <a
              key={btn.id}
              href={btn.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-2 py-2 border border-slate-200 dark:border-[#333333] hover:border-indigo-150 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-[#252525]/40 text-slate-700 dark:text-[#a3a3a3] hover:text-indigo-700 rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-sm group min-h-10 sm:min-h-11"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
              <span>{btn.label}</span>
            </a>
          ))}
          {helpdeskButtons.length === 0 && (
            <p className="col-span-2 text-center text-[11px] text-slate-400 dark:text-[#a3a3a3] italic py-2">
              Layanan bantuan belum tersedia.
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start max-w-5xl mx-auto">
      {/* Left Column: Scanner Card (Only visible in Booth Mode) */}
      {voteMode === 'booth' && (
        <div className="md:col-span-7 w-full">
          {renderBoothStateView()}
        </div>
      )}

      {/* Right Column or Full Width if Regular Mode */}
      <div className={`${voteMode === 'booth' ? 'md:col-span-5' : 'md:col-span-12'} space-y-4 sm:space-y-6 w-full`}>
        {voteMode === 'regular' ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start w-full">
            <div className="md:col-span-7 w-full">
              {renderSesiDapilInfo()}
            </div>
            <div className="md:col-span-5 w-full">
              {renderHelpdeskInfo()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-6 w-full">
            {renderSesiDapilInfo()}
            {renderHelpdeskInfo()}
          </div>
        )}
      </div>
    </div>
  );
}
