import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Monitor, CheckCircle, RefreshCw, AlertTriangle, Camera, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getVoteMode, connectVoterToBooth, VoteMode, getBoothSession, getBoothProfileByCode } from '../../lib/voteModeService';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ScanQrTabProps {
  isAllCompleted?: boolean;
  onStateChange?: (state: 'ready' | 'confirming' | 'voting' | 'cancelled' | 'disconnected' | 'success') => void;
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

export default function ScanQrTab({ isAllCompleted = false, onStateChange }: ScanQrTabProps) {
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

  const handleManualReset = () => {
    setCurrentState('ready');
    if (onStateChange) onStateChange('ready');
    setScannedToken(null);
    setTargetBooth(null);
    setManualToken('');
    setRestartKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-sky-400 animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs">Memvalidasi Status Sistem...</p>
        </div>
      </div>
    );
  }

  // Regular mode fallback behavior
  if (voteMode === 'regular') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 my-8">
        <div className="relative w-28 h-28 bg-rose-5 dark:bg-rose-950/30 rounded-full flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-inner mb-6 mx-auto overflow-hidden">
          <QrCode className="w-14 h-14 text-rose-600 dark:text-rose-400 opacity-60" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">Scan QR Nonaktif</h2>
          <p className="text-rose-600 dark:text-rose-400 text-sm font-bold leading-relaxed">
            Mode Bilik Suara sedang tidak digunakan.
          </p>
          <p className="text-slate-400 dark:text-[#a3a3a3] text-[11px] leading-relaxed">
            Anda dapat langsung melakukan pemilihan secara mandiri melalui tab <strong className="text-slate-700 dark:text-slate-200">Status</strong>. Pindai QR di bilik hanya digunakan jika panitia mengaktifkan sistem Bilik Suara terpusat.
          </p>
        </div>
      </div>
    );
  }

  // STATE 6: SUKSES MEMILIH (or already completed previously)
  if (isAllCompleted || currentState === 'success') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 my-8 space-y-6">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border border-emerald-100 dark:border-emerald-900/40 mx-auto mb-2 shadow-sm">
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
        
        {!isAllCompleted && (
          <button
            type="button"
            onClick={handleManualReset}
            className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 dark:bg-sky-500 dark:hover:bg-sky-600 dark:text-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Kembali ke Halaman Utama
          </button>
        )}
      </div>
    );
  }

  // STATE 3: SEDANG MEMILIH (Voting in progress)
  if (currentState === 'voting') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 my-8 space-y-6">
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

  // STATE 4: DIBATALKAN OLEH OPERATOR
  if (currentState === 'cancelled') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 my-8 space-y-6">
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

  // STATE 5: USER LEAVE / DISCONNECT (cancelled_disconnect)
  if (currentState === 'disconnected') {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 my-8 space-y-6">
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

  // STATE 1: SIAP MEMINDAI (default ready layout)
  return (
    <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-6 sm:p-8 text-center shadow-lg transition-colors duration-300 my-4 space-y-6 text-left relative">
      <div className="border-b border-slate-100 dark:border-[#333333] pb-4 text-center">
        <h2 className="text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight flex items-center justify-center gap-2">
          <Camera className="w-5 h-5 text-indigo-650" />
          <span>Koneksi Bilik Suara</span>
        </h2>
        <p className="text-slate-500 dark:text-[#a3a3a3] text-[11px] font-semibold mt-1">
          Silakan pindai QR Code Bilik Suara atau masukkan kode sesi secara manual.
        </p>
      </div>

      {scanError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex gap-2 items-start font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-left">{scanError}</p>
        </div>
      )}

      {/* HTML5 QR Camera Reader Stage */}
      <div key={restartKey} className="relative border-2 border-dashed border-slate-200 dark:border-[#3b3b3b] rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#1a1a1a] min-h-[250px] flex items-center justify-center">
        <div id="ppu-qr-reader" className="w-full h-full text-slate-900" />
        
        {isConnecting && (
          <div className="absolute inset-0 bg-white/85 dark:bg-[#1e1e1e]/85 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-650 animate-spin" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Menghubungkan Pemilih...</p>
          </div>
        )}
      </div>

      {/* Manual Input Form */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#333333] space-y-3">
        <span className="block text-[10px] text-slate-450 dark:text-slate-400 font-extrabold uppercase tracking-wider text-center">
          Atau Gunakan Simulasi Input Manual
        </span>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Masukkan Kode Sesi (contoh: 01X8K4)"
            value={manualToken}
            onChange={(e) => {
              const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
              if (val.length <= 12) {
                setManualToken(val);
              }
            }}
            className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-[#333333] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-550 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-[#f5f5f5]"
          />
          <button
            type="submit"
            disabled={isConnecting || !manualToken.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Hubungkan</span>
          </button>
        </form>
      </div>

      {/* ────────────────────────────────────────────────
           STATE 2: MENUNGGU KONFIRMASI (POPUP OVERLAY)
         ──────────────────────────────────────────────── */}
      {currentState === 'confirming' && (
        <div id="confirmation-popup" className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-scale-up">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40 mx-auto">
              <Monitor className="w-8 h-8 text-indigo-650 dark:text-indigo-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">
                {targetBooth ? targetBooth.full_name : 'Bilik Suara'}
              </h3>
              {targetBooth?.class && (
                <p className="text-indigo-600 dark:text-indigo-400 text-sm font-bold tracking-wide">
                  {targetBooth.class}
                </p>
              )}
              <p className="text-slate-500 dark:text-[#a3a3a3] text-xs leading-relaxed">
                Anda akan melakukan pemungutan suara pada Bilik Suara ini.
              </p>
            </div>

            <div className="bg-[#fcfdfd] dark:bg-[#1f1f1f] border border-slate-150 dark:border-[#333333] p-3.5 rounded-2xl text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-450 dark:text-slate-400">ID Terminal:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-300 uppercase">{scannedToken}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelSession}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProceedSession}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-indigo-600/10 cursor-pointer"
              >
                Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
