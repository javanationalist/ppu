import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { verifyVoterByCardId } from '../../lib/votingService';
import { confirmVoterAccount, resetVoterConfirmation, resetAllVotersConfirmation } from '../../lib/adminService';
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
  ShieldAlert,
  Calendar,
  Layers,
  Mail,
  RefreshCw,
  Clock,
  Sparkles,
  Zap
} from 'lucide-react';

export default function ScannerPro() {
  const { profile: adminProfile } = useAuth();
  const [cardIdInput, setCardIdInput] = useState('');
  
  // Voter Profile State
  const [foundVoter, setFoundVoter] = useState<Profile | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessingAuto, setIsProcessingAuto] = useState(false);
  
  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Audio utility for scanner feedback
  const playBeep = (freq = 1000, duration = 0.15, vol = 0.2) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn('[Feedback] Audio failed:', err);
    }
  };

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(70);
    }
  };

  // Auto-start scanner on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopScanner();
    };
  }, []);

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

      const scanner = new Html5Qrcode('qr-reader-admin-pro-container');
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
          // Guard: Don't trigger if already processing
          if (isProcessingAuto) return;

          triggerHaptic();

          const cleanCardId = decodedText.trim();
          console.log('[PRO Scanner] Data detected:', cleanCardId);
          setCardIdInput(cleanCardId);
          handleSearchAndAutoConfirm(cleanCardId);
        },
        () => {}
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

  // Automated Search & Confirm
  const handleSearchAndAutoConfirm = async (idToSearch: string) => {
    if (!idToSearch.trim()) return;
    
    setErrorMsg(null);
    setSuccessMsg(null);
    setFoundVoter(null);
    setSearchAttempted(true);
    setIsProcessingAuto(true);

    try {
      const profile = await verifyVoterByCardId(idToSearch.trim());
      
      if (profile && !profile.is_deleted) {
        setFoundVoter(profile);
        
        // Auto confirm if not already confirmed
        if (profile.account_status !== 'dikonfirmasi') {
          console.log('[PRO Scanner] Automatically confirming voter:', profile.full_name);
          const adminEmail = adminProfile?.email || 'admin@ppu.com';
          const success = await confirmVoterAccount(
            adminEmail,
            profile.id,
            profile.full_name,
            profile.card_id
          );

          if (success) {
            playBeep(1200, 0.25, 0.3); // High pitch for success
            setSuccessMsg(`Selamat! Akun ${profile.full_name} berhasil DIKONFIRMASI secara OTOMATIS.`);
            setFoundVoter({
              ...profile,
              account_status: 'dikonfirmasi'
            });
          } else {
            playBeep(400, 0.4, 0.25); // Low pitch error beep
            setErrorMsg('Berhasil mendeteksi akun, namun gagal memperbarui status ke database.');
          }
        } else {
          // Already confirmed
          playBeep(800, 0.15, 0.15); // Neutral medium beep
          setSuccessMsg(`Informasi: Akun ${profile.full_name} memang sudah dikonfirmasi sebelumnya.`);
        }
      } else {
        playBeep(300, 0.5, 0.25); // Error pitch
        setErrorMsg('Data pemilih tidak ditemukan atau akun dinonaktifkan.');
      }
    } catch (err) {
      console.error(err);
      playBeep(300, 0.5, 0.25);
      setErrorMsg('Gagal memproses validasi otomatis pemilih.');
    } finally {
      setIsProcessingAuto(false);
    }
  };

  // Reset confirmation status for currently displayed voter
  const handleResetSingleConfirmation = async () => {
    if (!foundVoter) return;
    
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessingAuto(true);
    
    try {
      const adminEmail = adminProfile?.email || 'admin@ppu.com';
      const success = await resetVoterConfirmation(
        adminEmail,
        foundVoter.id,
        foundVoter.full_name,
        foundVoter.card_id
      );
      
      if (success) {
        playBeep(900, 0.2, 0.2);
        setSuccessMsg(`Status konfirmasi akun ${foundVoter.full_name} berhasil DI-RESET menjadi Belum Dikonfirmasi.`);
        setFoundVoter({
          ...foundVoter,
          account_status: 'belum_dikonfirmasi'
        });
      } else {
        playBeep(400, 0.4, 0.25);
        setErrorMsg('Gagal me-reset status konfirmasi pemilih.');
      }
    } catch (err) {
      console.error(err);
      playBeep(400, 0.4, 0.25);
      setErrorMsg('Gagal memproses pengembalian konfirmasi.');
    } finally {
      setIsProcessingAuto(false);
    }
  };

  // Reset confirmation status for ALL registered voters
  const handleResetAllConfirmations = async () => {
    const mainConfirm = window.confirm(
      '⚠️ PERINGATAN KRITIKAL:\n\nApakah Anda yakin ingin me-reset status konfirmasi SELURUH pemilih terdaftar kembali menjadi "Belum Dikonfirmasi"?\n\nTindakan ini tidak dapat dibatalkan.'
    );
    if (!mainConfirm) return;

    const finalConfirm = window.confirm(
      '🔒 KONFIRMASI KEDUA:\n\nApakah Anda benar-benar yakin? Seluruh hak pilih pemilih akan dinonaktifkan sementara sampai dikonfirmasi kembali.'
    );
    if (!finalConfirm) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsProcessingAuto(true);

    try {
      const adminEmail = adminProfile?.email || 'admin@ppu.com';
      const success = await resetAllVotersConfirmation(adminEmail);
      
      if (success) {
        playBeep(900, 0.35, 0.25);
        setSuccessMsg('Seluruh status konfirmasi akun pemilih berhasil di-reset menjadi Belum Dikonfirmasi.');
        
        // If current voter is displayed, update their status locally
        if (foundVoter) {
          setFoundVoter({
            ...foundVoter,
            account_status: 'belum_dikonfirmasi'
          });
        }
      } else {
        playBeep(400, 0.4, 0.25);
        setErrorMsg('Gagal me-reset seluruh status konfirmasi.');
      }
    } catch (err) {
      console.error(err);
      playBeep(400, 0.4, 0.25);
      setErrorMsg('Gagal memproses reset massal status konfirmasi.');
    } finally {
      setIsProcessingAuto(false);
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
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Zap className="w-40 h-40 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-300 animate-pulse" />
                <span>Scanner PRO Mode</span>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Super QR Scanner (PRO)</h1>
            <p className="text-slate-300 text-sm mt-1">
              Alur instan tanpa klik tombol. Pemilih otomatis terverifikasi dan aktif begitu QR Code terbaca sistem.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white text-xs space-y-1 max-w-sm">
            <p className="font-extrabold flex items-center gap-1.5 text-indigo-200">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              Cara Penggunaan Sangat Mudah:
            </p>
            <p className="text-slate-200 leading-relaxed font-medium">
              Cukup arahkan kamera ke QR Code pemilih. Status diubah otomatis ke <span className="font-bold underline text-emerald-300">Dikonfirmasi</span> dengan notifikasi suara.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: QR Scanner / Search */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <span>Arahkan Kamera / Cari ID</span>
            </h2>
            
            {/* Direct Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchAndAutoConfirm(cardIdInput);
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
                disabled={isProcessingAuto}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-md transition-colors shadow-sm"
              >
                Cari & Konfirmasi
              </button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-150"></div>
              <span className="flex-shrink mx-4 text-slate-400 text-xs font-bold uppercase tracking-wider">Atau</span>
              <div className="flex-grow border-t border-slate-150"></div>
            </div>

            {/* QR Scanner Pro Container */}
            <div className={`space-y-3 ${isScanning ? 'block' : 'hidden'}`}>
              <div 
                id="qr-reader-admin-pro-container" 
                className="overflow-hidden rounded-xl border-2 border-indigo-600 aspect-square w-full bg-black relative shadow-inner"
              >
                {/* Visual Feedback for active scanner */}
                <div className="absolute top-3 left-0 right-0 z-10 flex justify-center pointer-events-none">
                  <div className="bg-indigo-600 text-white px-3.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 border border-indigo-400">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    <span>PRO Auto Scan Aktif</span>
                  </div>
                </div>

                {/* Subtle Scanner Guidelines Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[65%] h-[65%] border-2 border-indigo-400 border-dashed rounded-xl opacity-70 animate-pulse flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-l-2 border-indigo-300 absolute top-0 left-0"></div>
                    <div className="w-5 h-5 border-t-2 border-r-2 border-indigo-300 absolute top-0 right-0"></div>
                    <div className="w-5 h-5 border-b-2 border-l-2 border-indigo-300 absolute bottom-0 left-0"></div>
                    <div className="w-5 h-5 border-b-2 border-r-2 border-indigo-300 absolute bottom-0 right-0"></div>
                  </div>
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
                className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-bold text-sm py-2 px-4 rounded-md transition-colors border border-slate-300 hover:border-indigo-200"
              >
                <Camera className="w-4 h-4" />
                Scan QR Code Pemilih
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
              <h3 className="text-sm font-bold text-slate-700">Hasil Pemindaian Instan</h3>
              {foundVoter && (
                <span className="text-white bg-indigo-600 px-2.5 py-0.5 rounded-full text-xs font-black font-mono shadow-sm">
                  #{foundVoter.card_id}
                </span>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center relative">
              {/* Spinner loader overlay */}
              {isProcessingAuto && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-indigo-700 font-black animate-pulse">Menghubungkan & Mengonfirmasi...</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 bg-emerald-50 text-emerald-800 border-2 border-emerald-100 p-4 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-3 shadow-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h5 className="font-extrabold uppercase tracking-wide text-emerald-800">Pemrosesan Sukses</h5>
                    <p className="mt-0.5 font-medium">{successMsg}</p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 bg-red-50 text-red-800 border-2 border-red-100 p-4 rounded-xl text-xs font-bold leading-relaxed flex items-center gap-3 shadow-sm">
                  <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <h5 className="font-extrabold uppercase tracking-wide text-red-800">Pemrosesan Gagal</h5>
                    <p className="mt-0.5 font-medium">{errorMsg}</p>
                  </div>
                </div>
              )}

              {foundVoter ? (
                <div className="space-y-6">
                  {/* Profile Layout info */}
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
                          <p className="text-sm font-medium text-slate-600 truncate max-w-[200px]">{foundVoter.email}</p>
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
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                              foundVoter.account_status === 'dikonfirmasi'
                                ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {foundVoter.account_status === 'dikonfirmasi' ? 'Terkonfirmasi Otomatis ✅' : 'Belum Dikonfirmasi'}
                            </span>
                            
                            {foundVoter.account_status === 'dikonfirmasi' && (
                              <button
                                type="button"
                                onClick={handleResetSingleConfirmation}
                                className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-red-200 transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
                              >
                                <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                <span>Reset Konfirmasi</span>
                              </button>
                            )}
                          </div>
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
                          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Registrasi Pada</p>
                          <p className="text-xs text-slate-600 font-medium">{formatDate(foundVoter.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Clean bottom transition area */}
                  <div className="pt-6 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setFoundVoter(null);
                        setCardIdInput('');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="w-full flex justify-center items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-3 px-4 rounded-xl transition-all border border-indigo-200"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      Scan Kartu Pemilih Baru (Siap)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 opacity-75">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3 mx-auto shadow-sm">
                    <Zap className="w-8 h-8 fill-indigo-200/50" />
                  </div>
                  <h4 className="text-slate-700 font-black text-sm">Pemindaian Instan (PRO)</h4>
                  <p className="text-slate-450 text-xs mt-1.5 max-w-sm mx-auto">
                    Arahkan QR Code pemilih ke area scan, atau ketik Card ID secara manual di panel pencarian sebelah kiri.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Danger Zone: Reset All Confirmations */}
      <div className="bg-red-50 border border-red-200/60 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm mt-6">
        <div className="flex gap-3 items-start text-left">
          <div className="p-3 bg-red-100 text-red-700 rounded-xl shrink-0">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>Zona Bahaya Admin</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed max-w-2xl">
              Tindakan ini akan mengaktifkan kembali status pendaftaran <span className="font-bold underline text-red-700">seluruh pemilih terdaftar</span> menjadi "Belum Dikonfirmasi". Pemilih tidak akan bisa login atau memilih sampai mereka diverifikasi ulang oleh panitia.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetAllConfirmations}
          disabled={isProcessingAuto}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-md shadow-red-200 cursor-pointer self-stretch md:self-auto flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Reset Semua Konfirmasi Akun</span>
        </button>
      </div>
    </div>
  );
}
