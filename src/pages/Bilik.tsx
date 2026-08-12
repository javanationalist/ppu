import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Monitor, RefreshCw, AlertCircle, Clock, CheckCircle2, Terminal, QrCode, LogOut, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { M3ExpressiveLoadingIndicator } from '../components/ui/M3ExpressiveLoadingIndicator';
import { 
  createBoothSession, 
  getBoothSession, 
  completeBoothSession, 
  cancelBoothSession,
  BoothSession, 
  getVoteMode, 
  updateBoothStatus,
  getBoothCode,
  getActiveBoothSessionForCC
} from '../lib/voteModeService';
import { useAuth } from '../contexts/AuthContext';
import { updateLastSeen } from '../lib/sessionService';
import VotingFlow from '../components/voting/VotingFlow';

function generateRandomSessionCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function BilikPage({ isGtkMode = false, isStudentMode = false }: { isGtkMode?: boolean; isStudentMode?: boolean }) {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  const [session, setSession] = useState<BoothSession | null>(null);
  const sessionRef = useRef<BoothSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<{ deviceName: string; boothCode: string } | null>(null);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
  const [forceLogoutError, setForceLogoutError] = useState<string | null>(null);
  const [showForceConfirmModal, setShowForceConfirmModal] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const profileRef = useRef(profile);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const updateSession = (s: BoothSession | null) => {
    setSession(s);
    sessionRef.current = s;
  };

  // Generate a new session
  const startNewSession = async () => {
    const curProf = profileRef.current;
    if (!curProf) {
      console.warn('startNewSession: No profile available yet.');
      return;
    }

    // Check first if vote mode is booth
    try {
      const activeMode = await getVoteMode();
      if (activeMode !== 'booth') {
        setError('Halaman bilik tidak aktif karena sistem saat ini berjalan dalam Mode Vote Reguler.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }

    setLoading(true);
    setIsConnected(false);
    
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    const cc = getBoothCode(curProf);
    const xxxx = generateRandomSessionCode();
    const newId = `PPU-${cc}-${xxxx}`;
    
    try {
      const newSession = await createBoothSession(newId);
      updateSession(newSession);
      await updateBoothStatus(curProf.id, 'waiting');
      
      // Start polling
      pollingIntervalRef.current = setInterval(async () => {
        const latestSession = await getBoothSession(newId);
        if (latestSession && latestSession.status === 'connected') {
          clearInterval(pollingIntervalRef.current!);
          updateSession(latestSession);
          setIsConnected(true);
          await updateBoothStatus(curProf.id, 'connected');
        }
      }, 1000);
      
    } catch (err) {
      console.error('Failed to initialize booth session:', err);
      setError('Gagal membuat sesi terminal baru. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Restore an existing active session or start a new one
  const restoreOrStartNewSession = async () => {
    const curProf = profileRef.current;
    if (!curProf) {
      setLoading(false);
      return;
    }

    try {
      // Check first if vote mode is booth
      const activeMode = await getVoteMode();
      if (activeMode !== 'booth') {
        setError('Halaman bilik tidak aktif karena sistem saat ini berjalan dalam Mode Vote Reguler.');
        setLoading(false);
        return;
      }

      setLoading(true);

      const cc = getBoothCode(curProf);
      // Try to find any active session for this booth terminal
      const activeSession = await getActiveBoothSessionForCC(cc);

      if (activeSession) {
        console.log('Restoring active session:', activeSession);
        updateSession(activeSession);
        
        if (activeSession.status === 'connected') {
          setIsConnected(true);
          await updateBoothStatus(curProf.id, 'connected');
          setLoading(false);
          return;
        } else {
          // It's in 'waiting' status
          setIsConnected(false);
          await updateBoothStatus(curProf.id, 'waiting');
          
          // Poll for voter connection on this existing session
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = setInterval(async () => {
            const latestSession = await getBoothSession(activeSession.id);
            if (latestSession && latestSession.status === 'connected') {
              clearInterval(pollingIntervalRef.current!);
              updateSession(latestSession);
              setIsConnected(true);
              await updateBoothStatus(curProf.id, 'connected');
            }
          }, 1000);
          
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error during session restoration:', err);
    }

    // No active session found, or restoration failed, start a brand new one
    await startNewSession();
  };

  useEffect(() => {
    if (!profile) return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (isGtkMode || isStudentMode) {
      setLoading(false);
    } else {
      restoreOrStartNewSession();
    }

    // Send initial heartbeat
    const initialToken = localStorage.getItem('current_session_token');
    if (initialToken) {
      updateLastSeen(profile.id, initialToken);
    }

    // Periodic heartbeat every 15 seconds
    const heartbeatInterval = setInterval(() => {
      const token = localStorage.getItem('current_session_token');
      const curProf = profileRef.current;
      if (curProf && token) {
        updateLastSeen(curProf.id, token);
      }
    }, 15000);

    const checkRemoteControlInterval = setInterval(async () => {
      const curProf = profileRef.current;
      if (!curProf) return;
      try {
        // 1. Check if vote mode was changed to regular by administrator
        const activeMode = await getVoteMode();
        if (activeMode !== 'booth') {
          clearInterval(checkRemoteControlInterval);
          clearInterval(heartbeatInterval);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (sessionRef.current) {
            await cancelBoothSession(sessionRef.current.id);
          }
          await updateBoothStatus(curProf.id, 'offline');
          setError('Halaman bilik tidak aktif karena sistem saat ini berjalan dalam Mode Vote Reguler.');
          return;
        }

        // 2. Check profile status/remote-deactivation & session takeover
        const { supabase, isSupabaseConfigured } = await import('../lib/supabase');
        let currentProfile = null;
        if (!isSupabaseConfigured) {
          const localProfilesStr = localStorage.getItem('mock_profiles') || '[]';
          const profiles = JSON.parse(localProfilesStr);
          currentProfile = profiles.find((p: any) => p.id === curProf.id);
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('voting_status, is_deleted, session_token')
            .eq('id', curProf.id)
            .maybeSingle();
          currentProfile = data;
        }

        const localToken = localStorage.getItem('current_session_token');
        const isTakeover = localToken && currentProfile && currentProfile.session_token !== localToken;

        if (isTakeover) {
          clearInterval(checkRemoteControlInterval);
          clearInterval(heartbeatInterval);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (sessionRef.current) {
            await cancelBoothSession(sessionRef.current.id);
          }
          setSessionConflict({
            deviceName: currentProfile.device_name || 'Perangkat Lain',
            boothCode: curProf?.booth_code || '01',
          });
          return;
        }

        if (
          !currentProfile || 
          currentProfile.is_deleted || 
          currentProfile.voting_status === 'offline'
        ) {
          clearInterval(checkRemoteControlInterval);
          clearInterval(heartbeatInterval);
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (sessionRef.current) {
            await cancelBoothSession(sessionRef.current.id);
          }
          await signOut();
          navigate('/login', { replace: true });
          alert('Sesi bilik suara Anda telah dinonaktifkan oleh administrator.');
        }
      } catch (err) {
        console.error('Remote check error:', err);
      }
    }, 3000);

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      clearInterval(checkRemoteControlInterval);
      clearInterval(heartbeatInterval);
      
      const activeSession = sessionRef.current;
      if (activeSession && (activeSession.status === 'waiting' || activeSession.status === 'connected')) {
        cancelBoothSession(activeSession.id);
      }
    };
  }, [profile?.id]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-mono">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-900/50 p-8 rounded-2xl space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 text-red-500 border-b border-red-900/30 pb-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <h1 className="text-lg font-bold uppercase tracking-wider">Akses Terblokir</h1>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
          <div className="pt-4 flex gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Kembali
            </button>
            <button
              onClick={startNewSession}
              className="flex-1 py-3 bg-red-650 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleConfirmForceLogout = async () => {
    setShowForceConfirmModal(false);
    setForceLogoutLoading(true);
    setForceLogoutError(null);
    try {
      const { forceRegisterSession } = await import('../lib/sessionService');
      const curProf = profileRef.current;
      if (!curProf) {
        setForceLogoutError('Profil pengguna tidak ditemukan.');
        setForceLogoutLoading(false);
        return;
      }
      const res = await forceRegisterSession(curProf.id, curProf.role || 'bilik');
      if (res.success) {
        setSessionConflict(null);
        await restoreOrStartNewSession();
      } else {
        setForceLogoutError(res.error || 'Gagal memutus sesi pada perangkat lama.');
      }
    } catch (err: any) {
      console.error(err);
      setForceLogoutError('Terjadi kesalahan sistem saat memutus sesi.');
    } finally {
      setForceLogoutLoading(false);
    }
  };

  if (sessionConflict) {
    const deviceLabel = sessionConflict.deviceName || 'Perangkat Lain';

    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative font-mono">
        <div className="max-w-md w-full bg-[#161b22] border-2 border-rose-900/40 p-8 rounded-2xl shadow-2xl text-center space-y-6 relative">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-rose-500/5">
              <AlertCircle className="w-10 h-10 animate-pulse" />
            </div>
            
            <span className="text-[11px] font-black tracking-widest text-rose-500 uppercase">Error</span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              QR Gagal.
            </h1>
            <p className="text-sm font-semibold text-slate-400 mt-2">
              Akun ini sedang masuk di perangkat lain.
            </p>
          </div>

          <div className="bg-[#0d0f14]/80 border border-[#21262d] rounded-xl p-4 text-left space-y-2">
            <div className="flex flex-col text-xs space-y-1">
              <span className="font-bold text-[#8b949e] uppercase tracking-wider">Nama Perangkat :</span>
              <span className="font-extrabold text-[#f0f6fc]">{deviceLabel}</span>
            </div>
            <div className="flex flex-col text-xs space-y-1 pt-2">
              <span className="font-bold text-[#8b949e] uppercase tracking-wider">Kode Akun :</span>
              <span className="font-extrabold text-amber-400">CC {sessionConflict.boothCode}</span>
            </div>
          </div>

          <p className="text-xs font-semibold text-[#8b949e] leading-relaxed text-center px-2">
            Silakan logout dari perangkat sebelumnya atau klik tombol di bawah untuk mengeluarkan akun secara langsung.
          </p>

          {forceLogoutError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold text-center">
              {forceLogoutError}
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button
              type="button"
              onClick={() => setShowForceConfirmModal(true)}
              disabled={loading || forceLogoutLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-55 active:scale-[0.98] transition-all text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
            >
              {forceLogoutLoading ? (
                <>
                  <M3ExpressiveLoadingIndicator size="small" className="text-white" />
                  Memutus Sesi Perangkat...
                </>
              ) : (
                `LOG OUT AKUN DARI ${deviceLabel.toUpperCase()}`
              )}
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setForceLogoutError(null);
                try {
                  const { checkSessionActive, registerSession } = await import('../lib/sessionService');
                  const localToken = localStorage.getItem('current_session_token');
                  const checkResult = await checkSessionActive(profile?.id || '', localToken);
                  if (!checkResult.allowed && checkResult.reason === 'active_on_other_device') {
                    setSessionConflict({
                      deviceName: checkResult.profile?.device_name || 'Perangkat Lain',
                      boothCode: profile?.booth_code || '01',
                    });
                  } else {
                    const regResult = await registerSession(profile?.id || '', profile?.role || 'bilik');
                    if (regResult.success) {
                      setSessionConflict(null);
                      await restoreOrStartNewSession();
                    } else {
                      setSessionConflict({
                        deviceName: regResult.existingProfile?.device_name || 'Perangkat Lain',
                        boothCode: profile?.booth_code || '01',
                      });
                    }
                  }
                } catch (e) {
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || forceLogoutLoading}
              className="w-full py-3 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-55 active:scale-[0.98] transition-all text-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 border border-slate-700/60"
            >
              {loading ? (
                <>
                  <M3ExpressiveLoadingIndicator size="small" className="text-white" />
                  Memeriksa...
                </>
              ) : (
                'Coba Lagi'
              )}
            </button>
          </div>
        </div>

        {/* Modal Confirmation Overlay */}
        {showForceConfirmModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
            <div className="bg-[#161b22] border border-[#30363d] w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-5">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center border border-amber-500/20 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Konfirmasi Log Out Perangkat
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin mengeluarkan akun bilik ini dari <span className="font-bold text-amber-400">{deviceLabel}</span>?
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Sesi pada perangkat lama akan terputus dan perangkat ini akan langsung terhubung ke bilik suara.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForceConfirmModal(false)}
                  className="flex-1 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmForceLogout}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Ya, Log Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render full-screen VotingFlow experience if in GTK/Student mode
  if (isGtkMode || isStudentMode) {
    return (
      <VotingFlow 
        voteMode="regular"
        isGtkMode={isGtkMode}
        isStudentMode={isStudentMode}
      />
    );
  }

  // Render full-screen VotingFlow experience if connected
  if (isConnected && session) {
    return (
      <VotingFlow 
        voteMode="booth"
        initialVoterCardId={session.card_id}
        onComplete={async () => {
          await completeBoothSession(session.id);
          if (profile) {
            await updateBoothStatus(profile.id, 'waiting');
          }
          await startNewSession();
        }}
        onCancel={async () => {
          await cancelBoothSession(session.id);
          if (profile) {
            await updateBoothStatus(profile.id, 'waiting');
          }
          await startNewSession();
        }}
      />
    );
  }

  const boothCodeStr = profile ? getBoothCode(profile) : '01';
  const boothNameStr = profile?.full_name ? profile.full_name : `Bilik Suara ${boothCodeStr}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/60 via-slate-50 to-slate-100 pointer-events-none select-none" />

      {/* Top Header Bar */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex justify-between items-center z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-600/20">
            PPU
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-900 text-sm tracking-tight">BILIK SUARA</span>
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200/80">
              BILIK {boothCodeStr}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/80 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            MENUNGGU PEMILIH
          </span>

          <button
            onClick={async () => {
              if (profile) {
                await updateBoothStatus(profile.id, 'offline');
              }
              await signOut();
              navigate('/login');
            }}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 z-10 my-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <M3ExpressiveLoadingIndicator size="large" className="text-blue-600" />
            <p className="text-xs font-bold text-slate-600">Menginisialisasi gerbang bilik suara...</p>
          </div>
        ) : (
          <div className="max-w-2xl w-full bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden text-center space-y-6 sm:space-y-8 my-auto flex flex-col items-center">
            
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600" />

            {/* Header / Title */}
            <div className="space-y-2 max-w-md mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-100">
                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                <span>DISPLAY RESMI BILIK SUARA</span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                QR BILIK SUARA
              </h1>

              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Pindai kode ini menggunakan kamera HP pemilih untuk menghubungkan perangkat dengan bilik suara.
              </p>
            </div>

            {/* QR Card Container */}
            <div className="p-5 sm:p-6 bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-50 rounded-2xl border border-slate-200/80 w-full max-w-xs sm:max-w-sm flex flex-col items-center justify-center gap-4 shadow-xs relative">
              
              {/* Responsive 1:1 QR Box */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-200/90 flex items-center justify-center w-48 h-48 sm:w-60 sm:h-60 md:w-64 md:h-64 max-w-full aspect-square relative shrink-0">
                <QRCodeCanvas
                  value={session?.id || ''}
                  size={300}
                  level="H"
                  includeMargin={false}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Code Info Badge */}
              <div className="w-full flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">KODE SESI BILIK</span>
                
                <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white font-mono font-black text-lg sm:text-xl px-4 py-1.5 rounded-xl shadow-xs tracking-wider">
                  <span className="text-blue-400">{session?.id ? session.id.split('-')[1] : '--'}</span>
                  <span className="text-slate-600">-</span>
                  <span className="text-emerald-400">{session?.id ? session.id.split('-')[2] : '----'}</span>
                </div>

                <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                  Bilik: <strong className="text-slate-700">{session?.id?.split('-')[1] || '--'}</strong> • Token Sesi: <strong className="text-slate-700">{session?.id?.split('-')[2] || '----'}</strong>
                </p>
              </div>

            </div>

            {/* Compact Information Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left pt-2 border-t border-slate-100">
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">NAMA BILIK</span>
                <span className="text-xs font-extrabold text-slate-800 truncate">{boothNameStr}</span>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">STATUS SINKRONISASI</span>
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Standby / Menunggu
                </span>
              </div>

              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ID FULL SESI</span>
                <span className="text-xs font-mono font-bold text-slate-700 truncate">{session?.id || '---'}</span>
              </div>
            </div>

            {/* Refresh Token Button */}
            <button
              onClick={startNewSession}
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200/80 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Perbarui Token QR</span>
            </button>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-xs py-3.5 px-4 text-center text-[11px] text-slate-500 z-10 font-medium">
        <p>PPU SMAN 1 BANGSAL © 2026 • PANITIA PEMILU RAYA DIGITAL</p>
      </footer>
    </div>
  );
}
