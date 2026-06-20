import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { useScrollLock } from '../../hooks/useScrollLock';
import { verifyVoterByCardId } from '../../lib/votingService';
import { confirmVoterAccount } from '../../lib/adminService';
import { Profile } from '../../types';
import { Card } from '../../components/ui/Card';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  XCircle, 
  Camera, 
  RotateCw, 
  User, 
  ShieldCheck, 
  Calendar,
  Layers,
  Mail,
  Lock,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function KonfirmasiPemilih() {
  const { profile: adminProfile } = useAuth();
  const [cardIdInput, setCardIdInput] = useState('');
  
  // Voter Profile State
  const [foundVoter, setFoundVoter] = useState<Profile | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Audio & Haptic utility for scanner feedback
  const playBeep = () => {
    try {
      // Create audio context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      // Configure Beep: 1000Hz (Sine wave)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
      
      // Volume Envelope: Start at moderate volume and fade fast
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
      
      console.log('[Feedback] Synthetic beep played');
    } catch (err) {
      console.warn('[Feedback] Audio failed:', err);
    }
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(70); // Short pulse
      console.log('[Feedback] Haptic triggered');
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopScanner();
    };
  }, []);

  // Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  useScrollLock(showConfirmModal);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Scanner Logic
  const startCamera = async () => {
    setCamError(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCamError('Kamera tidak ditemukan di perangkat ini.');
        return;
      }
      setCameras(devices);

      // default index search: environment if mobile, user if desktop
      let targetIndex = 0;
      if (isMobile) {
        const backCamIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') || 
          d.label.toLowerCase().includes('environment')
        );
        if (backCamIdx >= 0) targetIndex = backCamIdx;
      } else {
        const frontCamIdx = devices.findIndex(d => 
          d.label.toLowerCase().includes('front') || 
          d.label.toLowerCase().includes('user') || 
          d.label.toLowerCase().includes('facing')
        );
        if (frontCamIdx >= 0) targetIndex = frontCamIdx;
      }
      setCurrentCameraIndex(targetIndex);

      await startScanner(devices[targetIndex].id);
    } catch (err: any) {
      setCamError('Izin akses kamera ditolak atau sedang digunakan : ' + (err.message || err));
    }
  };

  const startScanner = async (cameraId: string) => {
    try {
      if (html5QrcodeRef.current) {
        try {
          if (html5QrcodeRef.current.isScanning) {
            await html5QrcodeRef.current.stop();
          }
        } catch (e) {}
      }

      const scanner = new Html5Qrcode('qr-reader-admin-container');
      html5QrcodeRef.current = scanner;
      setIsScanning(true);

      await scanner.start(
        cameraId,
        {
          fps: 15,
          qrbox: (w, h) => {
            const minDim = Math.min(w, h);
            if (minDim < 50) {
              return { width: 50, height: 50 };
            }
            const boxSize = Math.max(50, Math.min(minDim * 0.7, 250));
            return { width: boxSize, height: boxSize };
          }
        },
        (decodedText) => {
          // Guard: Don't trigger if we are already viewing a voter or submitting
          const isBusy = !!foundVoter || isSubmitting || showConfirmModal;
          if (isBusy) return;

          // Haptic feedback immediately on detection
          triggerHaptic();

          const cleanCardId = decodedText.trim();
          console.log('[Scanner] Data detected:', cleanCardId);
          setCardIdInput(cleanCardId);
          handleSearchCardId(cleanCardId, true);
          
          // WE NO LONGER STOP SCANNER HERE - KEEP IT RUNNING
        },
        () => {
          // error callback (silent)
        }
      );
    } catch (err: any) {
      setIsScanning(false);
      setCamError('Gagal menjalankan pemindai: ' + (err.message || err));
    }
  };

  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIdx);
    await startScanner(cameras[nextIdx].id);
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        console.warn("Scanner stop error:", e);
      }
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Searching Profile
  const handleSearchCardId = async (idToSearch: string, triggerSound = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFoundVoter(null);
    setSearchAttempted(true);

    if (!idToSearch.trim()) {
      setErrorMsg('Masukkan Card ID terlebih dahulu.');
      return;
    }

    try {
      const profile = await verifyVoterByCardId(idToSearch.trim());
      
      // Check if found and is valid
      if (profile && !profile.is_deleted) {
        console.log('[Scanner] Voter validated successfully:', profile.full_name);
        setFoundVoter(profile);
        if (triggerSound) playBeep();
      } else {
        console.log('[Scanner] Voter not found or is inactive.');
        setErrorMsg('Tidak dapat menemukan data pemilih.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memverifikasi pemilih.');
    }
  };

  // Confirm Voter account status action
  const handleConfirmAction = async () => {
    if (!foundVoter || !adminProfile) return;
    setIsSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const success = await confirmVoterAccount(
        adminProfile.email,
        foundVoter.id,
        foundVoter.full_name,
        foundVoter.card_id
      );

      if (success) {
        setSuccessMsg('Akun berhasil dikonfirmasi.');
        // Refresh local voter model state
        setFoundVoter({
          ...foundVoter,
          account_status: 'dikonfirmasi'
        });
        setShowConfirmModal(false);
      } else {
        setErrorMsg('Gagal mengonfirmasi akun.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal mengonfirmasi akun.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper date formatter
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Konfirmasi Pemilih</h1>
        <p className="text-slate-500 text-sm">
          Fasilitasi pemilih di bilik registrasi dengan memverifikasi ID Kartu pemilih mereka sebelum memberikan suara.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: QR Scanner / Search */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main lookup controller card */}
          <Card className="border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Metode Pencarian</h2>
            
            {/* Direct Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchCardId(cardIdInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Masukkan Card ID Manual..."
                  value={cardIdInput}
                  onChange={(e) => setCardIdInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                />
              </div>
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors"
              >
                Cari
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Atau</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            {/* QR Scanner Controls */}
            <div className={`space-y-3 ${isScanning ? 'block' : 'hidden'}`}>
              <div 
                id="qr-reader-admin-container" 
                className="overflow-hidden rounded-xl border-2 border-indigo-500 aspect-square w-full bg-black relative"
              >
                {/* Visual Feedback for active scanner */}
                <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                  <div className="bg-indigo-600/90 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    <span>Scanner Aktif</span>
                  </div>
                </div>

                {/* Subtle Scanner Guidelines Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[60%] h-[60%] border-2 border-indigo-400 border-dashed rounded-lg opacity-60"></div>
                </div>
              </div>
              
              <div className="flex gap-2">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white font-bold text-xs py-2 px-3 rounded-md transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Ganti Kamera
                  </button>
                )}
                <button
                  type="button"
                  onClick={stopScanner}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 rounded-md transition-colors"
                >
                  Batal Scan
                </button>
              </div>
            </div>

            {!isScanning && (
              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-2 bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2 px-4 rounded-md transition-colors border border-slate-300"
              >
                <Camera className="w-4 h-4" />
                Scan QR Code Kartu PU
              </button>
            )}

            {camError && (
              <div className="bg-amber-50 text-amber-600 p-3 rounded-lg text-xs font-medium border border-amber-100">
                {camError}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Results Display */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col justify-between">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700">Hasil Pemindaian / Pencarian</h3>
              {foundVoter && (
                <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs font-extrabold font-mono">
                  #{foundVoter.card_id}
                </span>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center">
              {successMsg && (
                <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 bg-red-50 text-red-700 border border-red-100 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {foundVoter ? (
                <div className="space-y-6">
                  {/* Human Readable Layout of Profile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Nama Lengkap</p>
                          <p className="text-sm font-bold text-slate-800">{foundVoter.full_name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Email</p>
                          <p className="text-sm font-medium text-slate-600">{foundVoter.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Kelas</p>
                          <p className="text-sm font-bold text-slate-700">{foundVoter.class || '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Status Konfirmasi</p>
                          <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                            foundVoter.account_status === 'dikonfirmasi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-150'
                          }`}>
                            {foundVoter.account_status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Belum Dikonfirmasi'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Status Memilih</p>
                          <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                            foundVoter.voting_status === 'sudah'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {foundVoter.voting_status === 'sudah' ? 'Sudah Memilih' : 'Belum Memilih'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded text-slate-500">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Tanggal Registrasi</p>
                          <p className="text-xs text-slate-600 font-medium">{formatDate(foundVoter.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-6 border-t border-slate-200 space-y-3">
                    {foundVoter.account_status === 'belum_dikonfirmasi' ? (
                      <button
                        type="button"
                        onClick={() => setShowConfirmModal(true)}
                        className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 px-4 rounded-lg transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Konfirmasi Akun
                      </button>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                        <p className="text-sm font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                          <CheckCircle className="w-5 h-5" />
                          Akun sudah dikonfirmasi.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setFoundVoter(null);
                        setCardIdInput('');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="w-full flex justify-center items-center gap-2 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 font-bold text-xs py-2.5 px-4 rounded-lg transition-all border border-slate-200 hover:border-indigo-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Scan Pemilih Berikutnya
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 opacity-70">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3 mx-auto text-slate-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <h4 className="text-slate-600 font-bold text-sm">Menunggu Hasil Verifikasi</h4>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                    Masukkan nomor Kartu pemilih di atas secara manual, atau scan kode QR Kartu PU pemilih.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && foundVoter && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Konfirmasi Izin Memilih</h3>
            </div>
            
            <div className="p-6 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed">
                Konfirmasi akun ini agar dapat menggunakan hak suara?
              </p>
              
              {/* Target Highlight */}
              <div className="bg-slate-100 p-3.5 rounded-xl space-y-1.5 border border-slate-200">
                <p className="text-xs text-slate-500">Nama: <span className="font-bold text-slate-700">{foundVoter.full_name}</span></p>
                <p className="text-xs text-slate-500">Kelas: <span className="font-bold text-slate-700">{foundVoter.class || '-'}</span></p>
                <p className="text-xs text-slate-500">Card ID: <span className="font-extrabold text-indigo-700 font-mono">#{foundVoter.card_id}</span></p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Ya, Konfirmasi'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
