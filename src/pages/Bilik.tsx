import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Monitor, RefreshCw, AlertCircle, Clock, CheckCircle2, Terminal } from 'lucide-react';
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

export default function BilikPage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  
  const [session, setSession] = useState<BoothSession | null>(null);
  const sessionRef = useRef<BoothSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionConflict, setSessionConflict] = useState<{ deviceName: string; boothCode: string } | null>(null);
  
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

    restoreOrStartNewSession();

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

  if (sessionConflict) {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-[#161b22] border-2 border-rose-900/40 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-rose-500/5">
              <AlertCircle className="w-10 h-10 animate-pulse" />
            </div>
            
            <span className="text-[11px] font-black tracking-widest text-rose-500 uppercase">Error</span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1 font-mono">
              QR Gagal.
            </h1>
            <p className="text-sm font-semibold text-slate-400 mt-2">
              Akun ini sedang masuk di perangkat lain.
            </p>
          </div>

          <div className="bg-[#0d0f14]/80 border border-[#21262d] rounded-xl p-4 text-left space-y-2 font-mono">
            <div className="flex flex-col text-xs space-y-1">
              <span className="font-bold text-[#8b949e] uppercase tracking-wider">Nama Perangkat :</span>
              <span className="font-extrabold text-[#f0f6fc]">{sessionConflict.deviceName}</span>
            </div>
            <div className="flex flex-col text-xs space-y-1 pt-2">
              <span className="font-bold text-[#8b949e] uppercase tracking-wider">Kode Akun :</span>
              <span className="font-extrabold text-amber-400">CC {sessionConflict.boothCode}</span>
            </div>
          </div>

          <p className="text-xs font-semibold text-[#8b949e] leading-relaxed text-center px-2">
            Silakan logout dari perangkat sebelumnya atau tunggu hingga perangkat tersebut offline.
          </p>

          <div className="pt-4">
            <button
              onClick={async () => {
                setLoading(true);
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
                    // Try registering session
                    const regResult = await registerSession(profile?.id || '', 'vote');
                    if (regResult.success) {
                      setSessionConflict(null);
                      window.location.reload(); // Refresh to start a new session properly
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
              disabled={loading}
              className="w-full py-3 bg-rose-650 hover:bg-rose-700 disabled:opacity-55 active:scale-[0.98] transition-all text-white rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer font-mono flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memeriksa...
                </>
              ) : (
                'Coba Lagi'
              )}
            </button>
          </div>
        </div>
      </div>
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

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white font-mono flex flex-col justify-between overflow-x-hidden relative">
      {/* Visual background terminal grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bilik-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bilik-grid)" />
        </svg>
      </div>

      {/* Terminal Top Bar */}
      <header className="border-b border-[#21262d] bg-[#161b22] px-6 py-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-white" />
          <span className="font-extrabold text-sm tracking-widest text-white">TERMINAL BILIK SUARA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-white">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
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
            className="text-xs text-rose-400 hover:text-rose-300 border border-rose-900/30 hover:border-rose-700/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Keluar Terminal
          </button>
        </div>
      </header>

      {/* Main Terminal Screen Content */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-white" />
            <p className="text-xs text-white">Menginisialisasi gerbang sesi...</p>
          </div>
        ) : (
          <div className="max-w-2xl w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl relative overflow-hidden">
            
            {/* Terminal Window Accent */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 to-indigo-600" />

            {/* STEP 1: MENUNGGU PEMILIH (Waiting) */}
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-white font-mono">STATUS KONEKSI</span>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Menunggu Pemilih...</h2>
                </div>
                <p className="text-xs text-white leading-relaxed">
                  Silakan buka tab <strong className="text-white font-bold">Scan QR</strong> di aplikasi PPU gadget Anda, lalu arahkan kamera untuk memindai token sesi di samping.
                </p>
                <div className="p-3.5 bg-[#0d0f14] border border-[#21262d] rounded-xl space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white">ID Sesi Terminal:</span>
                    <span className="font-mono font-bold text-white uppercase">{session?.id}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white">Metode Sinkronisasi:</span>
                    <span className="font-mono text-white">PPU-Realtime-Polling</span>
                  </div>
                </div>
                <button
                  onClick={startNewSession}
                  className="flex items-center gap-2 text-xs font-bold text-white hover:text-white transition-colors focus:outline-none cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-white" />
                  <span>Perbarui Token Baru</span>
                </button>
              </div>

              {/* QR Code Container */}
              <div className="shrink-0 flex flex-col items-center gap-3">
                <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center shrink-0 border border-slate-200">
                  <QRCodeCanvas
                    value={session?.id || ''}
                    size={200}
                    level="H"
                    includeMargin={false}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div className="text-center w-full space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest block">KODE QR</span>
                  <span className="text-xl font-black text-white font-mono tracking-wider block">
                    {(() => {
                      if (!session?.id) return '------';
                      const parts = session.id.split('-');
                      return parts.length === 3 ? `${parts[1]}${parts[2]}` : session.id;
                    })()}
                  </span>
                  <div className="text-[9px] text-slate-400 font-mono leading-tight space-y-0.5 text-left bg-[#0d0f14]/80 p-2.5 rounded-xl border border-[#21262d] mt-1.5">
                    <div><span className="text-indigo-400 font-bold">{session?.id?.split('-')[1] || '--'}</span> = Kode Akun Bilik (CC)</div>
                    <div><span className="text-emerald-400 font-bold">{session?.id?.split('-')[2] || '----'}</span> = Kode Sesi (XXXX)</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Terminal Footer */}
      <footer className="border-t border-[#21262d] bg-[#0d0f14] px-6 py-4 text-center text-xs text-white z-10">
        <p className="font-mono">PPU SMAN 1 BANGSAL © 2026-PRESENT. KESISWAAN DAN PANITIA PEMILU RAYA DIGITAL.</p>
      </footer>
    </div>
  );
}
