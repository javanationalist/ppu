import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useScrollLock } from '../hooks/useScrollLock';
import { 
  Vote as VoteIcon, 
  QrCode, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  LogOut, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  RefreshCw, 
  Play, 
  Square,
  Sparkles,
  Loader2,
  Check,
  HelpCircle
} from 'lucide-react';
import { getCategories, getCandidates, verifyVoterByCardId, submitVote, submitMultipleVotes, getVoterSubmittedVotes, finalizeVotingStatus, getDapils, getVotingCompletionStatus } from '../lib/votingService';
import { Category, Candidate, Profile, Vote, Dapil } from '../types';

import { getUserAccessSettings, UserAccessSettings } from '../lib/userAccessService';

export default function VotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [accessSettings, setAccessSettings] = useState<UserAccessSettings | null>(null);

  // Screen state: 'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden'
  const [screen, setScreen] = useState<'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden'>('scan');

  // Input states
  const [cardIdInput, setCardIdInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Current Voter & Vote details
  const [voter, setVoter] = useState<Profile | null>(null);
  const [isVoterAllCompleted, setIsVoterAllCompleted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votedCategories, setVotedCategories] = useState<Record<string, string>>({}); // { catId: candidateId }
  const [dapils, setDapils] = useState<Dapil[]>([]);
  
  // Navigation for active voting category
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedMpkVotes, setSelectedMpkVotes] = useState<Record<string, string>>({}); // { class: candidateId }

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  // Countdowns
  const [countdown, setCountdown] = useState(5);
  const [thankyouCountdown, setThankyouCountdown] = useState(10);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  useScrollLock(showModal1 || showModal2);

  // Load classes initially
  useEffect(() => {
    const init = async () => {
      try {
        const [cats, ds, settings] = await Promise.all([
          getCategories(),
          getDapils(),
          getUserAccessSettings()
        ]);
        
        setAccessSettings(settings);
        setCategories(cats);
        setDapils(ds || []);

        if (settings && !settings.voting_global_enabled) {
          setScreen('forbidden');
        }
      } catch (err) {
        console.error('Failed to init categories/dapils/settings', err);
      }
    };
    init();
    
    // Auto start camera if on scan screen
    // if (screen === 'scan') {
    //   startCamera();
    // }

    // Check for query param ?card_id=XXXX to auto load
    const qCardId = searchParams.get('card_id');
    if (qCardId) {
      setCardIdInput(qCardId);
      handleVerifyCardId(qCardId);
    }

    return () => {
      stopScanner();
      clearCountdown();
    };
  }, [searchParams]);

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // QR Scanner Logic
  async function startCamera() {
    setCamError('Kamera tidak tersedia');
  };

  async function startScanner(cameraId: string) {
    try {
      if (html5QrcodeRef.current) {
        try {
          await html5QrcodeRef.current.stop();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode('qr-reader-container');
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
          // Scanned successfully!
          const cleanCardId = decodedText.trim();
          setCardIdInput(cleanCardId);
          handleVerifyCardId(cleanCardId);
          stopScanner();
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

  async function switchCamera() {
    if (cameras.length <= 1) return;
    const nextIdx = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIdx);
    await startScanner(cameras[nextIdx].id);
  };

  async function stopScanner() {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {}
      html5QrcodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Voter identification logic
  const handleVerifyCardId = async (enteredId: string) => {
    if (!enteredId || enteredId.trim() === '') return;
    
    // Safety check again
    if (accessSettings && !accessSettings.voting_global_enabled) {
      setScreen('forbidden');
      return;
    }

    setSearchLoading(true);
    setErrorMessage(null);

    try {
      const profile = await verifyVoterByCardId(enteredId.trim());
      if (!profile) {
        setErrorMessage('ID Kartu Pemilih tidak ditemukan. Silakan periksa kembali.');
        setSearchLoading(false);
        return;
      }

      // Check duplicate voting status or load existing completed categories
      const completionStatus = await getVotingCompletionStatus(profile.id);
      const submittedVotes = await getVoterSubmittedVotes(profile.id);
      
      const votedMap: Record<string, string> = {};
      completionStatus.categories.forEach(cat => {
        if (cat.completed) {
          votedMap[cat.categoryId] = 'voted';
        }
      });
      submittedVotes.forEach(vote => {
        votedMap[vote.category_id] = vote.candidate_id;
      });

      setIsVoterAllCompleted(completionStatus.allCompleted);
      setVotedCategories(votedMap);
      setVoter(profile);
      setScreen('profile');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat memverifikasi ID.');
    } finally {
      setSearchLoading(false);
    }
  };

  const proceedToCategories = () => {
    if (!voter) return;
    if (voter.account_status !== 'dikonfirmasi') {
      return; // UI is locked anyway, but prevent programmatic access
    }
    setScreen('categories');
  };

  // Select a category to vote
  const openCategory = async (catId: string) => {
    // If already voted, block
    if (votedCategories[catId]) return;

    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    setSelectedCatId(catId);
    setSelectedMpkVotes({});
    setSearchLoading(true);
    try {
      let cands = await getCandidates(catId);
      
      if (cat.type === 'mpk_smaba') {
        const voterClass = voter?.class || '';
        const voterDapil = dapils.find(d => d.eligible_classes.includes(voterClass));
        if (voterDapil) {
          cands = cands.filter(cand => cand.dapil_id === voterDapil.id);
        } else {
          cands = [];
        }
      }

      setCandidates(cands);
      setScreen('candidates');
    } catch (err) {
      console.error('Failed to load candidates', err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a candidate card
  const selectCandidate = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setShowModal1(true);
  };

  // First confirm -> opens second warning
  const openModal2 = () => {
    setShowModal1(false);
    setShowModal2(true);
  };

  // Confirm second alert and submit vote!
  const confirmVoteSubmit = async () => {
    setShowModal2(false);
    if (!voter || !selectedCatId) return;

    const activeCat = categories.find(c => c.id === selectedCatId);
    const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';

    if (isSelectedCatMpk) {
      const votesToSubmit: Vote[] = Object.entries(selectedMpkVotes).map(([clsName, candId]) => ({
        voter_id: voter.id,
        category_id: selectedCatId,
        candidate_id: candId as string
      }));

      const success = await submitMultipleVotes(votesToSubmit);

      if (success) {
        setVotedCategories(prev => ({
          ...prev,
          [selectedCatId]: 'voted'
        }));

        setScreen('success');
        setCountdown(5);
        clearCountdown();

        let currentSecs = 5;
        countdownIntervalRef.current = setInterval(() => {
          currentSecs--;
          setCountdown(currentSecs);
          if (currentSecs <= 0) {
            clearCountdown();
            setSelectedCatId(null);
            setSelectedCandidate(null);
            setSelectedMpkVotes({});
            setScreen('categories');
          }
        }, 1000);
      } else {
        alert('Gagal merekam data suara pemilihan MPK. Silakan coba kembali.');
      }
    } else {
      if (!selectedCandidate) return;

      const voteObj: Vote = {
        voter_id: voter.id,
        category_id: selectedCatId,
        candidate_id: selectedCandidate.id
      };
      
      const success = await submitVote(voteObj);

      if (success) {
        // Locally register the vote
        setVotedCategories(prev => ({
          ...prev,
          [selectedCatId]: selectedCandidate.id
        }));

        // Start the success interstitial countdown screen
        setScreen('success');
        setCountdown(5);
        clearCountdown();

        let currentSecs = 5;
        countdownIntervalRef.current = setInterval(() => {
          currentSecs--;
          setCountdown(currentSecs);
          if (currentSecs <= 0) {
            clearCountdown();
            // Return automatically to category list selection
            setSelectedCatId(null);
            setSelectedCandidate(null);
            setSelectedMpkVotes({});
            setScreen('categories');
          }
        }, 1000);
      } else {
        alert('Gagal merekam data suara pemilihan. Silakan coba kembali.');
      }
    }
  };

  // Final completion / Selesai button pressed
  const handleFinalFinish = async () => {
    if (!voter) return;

    // Save final status to database profiles
    await finalizeVotingStatus(voter.id);

    // Transition to fullscreen thank you
    setScreen('thankyou');
    setThankyouCountdown(10);
    clearCountdown();

    let currentSecs = 10;
    countdownIntervalRef.current = setInterval(() => {
      currentSecs--;
      setThankyouCountdown(currentSecs);
      if (currentSecs <= 0) {
        clearCountdown();
        resetSessionToKiosk();
      }
    }, 1000);
  };

  // Reset voting booth for the next voter
  const resetSessionToKiosk = () => {
    setVoter(null);
    setIsVoterAllCompleted(false);
    setCardIdInput('');
    setVotedCategories({});
    setSelectedCatId(null);
    setSelectedCandidate(null);
    setErrorMessage(null);
    setCamError(null);
    stopScanner();
    setScreen('scan');
  };

  // Back actions
  const triggerBack = (targetScreen: 'scan' | 'categories') => {
    clearCountdown();
    setScreen(targetScreen);
  };

  // Completion calculation
  const totalCategories = categories.length;
  const completedCategories = Object.keys(votedCategories).length;
  const percentComplete = totalCategories > 0 ? Math.round((completedCategories / totalCategories) * 100) : 0;
  const allCompleted = totalCategories > 0 && completedCategories === totalCategories;

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8ecf5] flex flex-col font-sans select-none antialiased">
      
      {/* ────────────────────────────────────────────────
           SCREEN 0: FORBIDDEN / DISABLED
         ──────────────────────────────────────────────── */}
      {screen === 'forbidden' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20 text-rose-500 shadow-xl shadow-rose-500/5 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-off"><path d="m2 2 20 20"/><path d="M5 5a1 1 0 0 0-1 1v7c0 5 3.5 7.5 7 10"/><path d="M11 11a1 1 0 0 0 1 1h.17"/><path d="M12 21c3.5-2.5 7-5 7-10V6a1 1 0 0 0-1-1h-2.17"/><path d="M14.5 9.5c.9.2 1.5.7 1.5 1.5v1"/><path d="M12 2v2"/><path d="M17 2v1"/><path d="M2 13c0 5.6 4.1 9 10 11"/><path d="M7 2v4"/></svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Bilik Suara Ditutup</h1>
          <p className="text-slate-400 font-medium text-sm mb-8 leading-relaxed">
            Mohon maaf, saat ini akses ke bilik suara elektronik sedang dinonaktifkan oleh panitia Administrator. 
            Silakan hubungi panitia KPPS untuk informasi lebih lanjut mengenai jadwal pemungutan suara.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-[#1c2030] hover:bg-[#232840] text-slate-200 border border-[#2a3050] rounded-2xl text-xs font-bold transition-all shadow-lg"
          >
            Kembali ke Halaman Depan
          </button>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 1: SCAN OR INPUT CARD ID
         ──────────────────────────────────────────────── */}
      {screen === 'scan' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 self-start">
            <img
              src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
              alt="PPU Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight text-center self-start mb-1">
            Verifikasi
          </h1>
          <p className="text-xs text-slate-400 self-start mb-6">
            Silakan scan QR Code yang ada di Voters Card atau masukkan Card ID secara manual
          </p>

          {/* QR Scan Container Box */}
          <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl overflow-hidden shadow-2xl relative mb-4">
            <div id="qr-reader-container" className="w-full aspect-square relative bg-black/40 flex flex-col items-center justify-center overflow-hidden">
              {/* Overlay with instructions when not scanning */}
              {!isScanning && (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-default bg-black/80 p-4 text-center"
                >
                  <Camera className="w-12 h-12 mb-2 text-slate-500" />
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Kamera tidak tersedia
                  </span>
                </div>
              )}

              {/* Real Scanning View Port Helper Guides */}
              {isScanning && (
                <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl"></div>
                    <div className="w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr"></div>
                  </div>
                  <div className="text-[10px] bg-black/70 px-3 py-1 rounded-full text-indigo-300 font-semibold uppercase tracking-widest text-center self-center shadow-lg">
                    🟢 Memindai Kode QR...
                  </div>
                  <div className="flex justify-between">
                    <div className="w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl"></div>
                    <div className="w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Control Panel Actions */}
            <div className="flex gap-2 p-3 bg-[#1c2030] border-t border-[#2a3050] justify-center items-center">
              <button 
                disabled={true}
                className="w-full py-2 bg-[#2a3050] text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Camera className="w-3.5 h-3.5" /> Kamera Nonaktif
              </button>
            </div>
          </div>

          {/* Camera Status and Error Displays */}
          {camError && (
            <div className="w-full mb-4 bg-red-500/15 border border-red-500/30 p-3 rounded-xl text-xs flex gap-2.5 text-red-300 leading-relaxed items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{camError}</span>
            </div>
          )}

          <div className="w-full flex items-center gap-4 my-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span className="h-px bg-[#2a3050] flex-1"></span>
            atau masukkan manual
            <span className="h-px bg-[#2a3050] flex-1"></span>
          </div>

          {/* Manual Input field */}
          <div className="w-full mb-6">
            <label htmlFor="card-id-input" className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
              Card ID
            </label>
            <input 
              id="card-id-input"
              type="text" 
              placeholder="Contoh: 1234" 
              className="w-full bg-[#1c2030] border border-[#2a3050] focus:border-indigo-500 rounded-xl px-4 py-3 placeholder-slate-600 outline-none text-white font-mono font-medium tracking-wide text-center"
              value={cardIdInput}
              onChange={(e) => setCardIdInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyCardId(cardIdInput);
              }}
              autoComplete="off"
            />
            <p className="text-[10px] text-slate-500 mt-2 text-center">
              (CARD ID MAKSIMAL INPUT 4 ANGKA, TIDAK BISA LEBIH DARI 4 DAN WAJIB BERISI ANGKA)
            </p>
          </div>

          {errorMessage && (
            <div className="w-full bg-red-950/45 border border-red-800/50 text-red-400 px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed mb-4 flex gap-2 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Confirm Button */}
          <button 
            onClick={() => handleVerifyCardId(cardIdInput)}
            disabled={searchLoading || !cardIdInput.trim()}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#2a3050] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2"
          >
            {searchLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sedang Memproses...
              </>
            ) : (
              <>
                Lanjutkan Verifikasi <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 2: VOTER PROFILE CONFIRMATION
         ──────────────────────────────────────────────── */}
      {screen === 'profile' && voter && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 self-start">
            <img
              src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
              alt="PPU Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight text-center self-start mb-1">
            Validasi Profil
          </h1>
          <p className="text-xs text-slate-400 self-start mb-6">
            Berikut ini adalah data siswa sesuai dengan identitas asli Anda.
          </p>

          {/* Profile Card */}
          <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl p-6 shadow-2xl relative mb-6 overflow-hidden">
            {/* Background glowing circles */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>

            <div className="flex items-center gap-4 mb-6 relative">
              <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/5">
                <User className="w-7 h-7" />
              </div>
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-lg truncate leading-tight">{voter.full_name}</h3>
                <span className="text-xs text-slate-500 font-mono tracking-wide">{voter.card_id}</span>
              </div>
            </div>

            <div className="space-y-3.5 pt-4 border-t border-[#2a3050]">
              <div className="flex justify-between items-start text-xs leading-tight">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Email Terdaftar</span>
                <span className="font-semibold text-slate-300 truncate max-w-[200px] text-right">{voter.email}</span>
              </div>
              <div className="flex justify-between items-center text-xs leading-tight">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Kelas / Rombel</span>
                <span className="font-semibold text-[#e8ecf5] bg-[#1c2030] px-2.5 py-1 rounded-md border border-[#2a3050]">{voter.class || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-xs leading-tight">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Status Akun</span>
                {voter.account_status === 'dikonfirmasi' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider shadow-sm">
                    ✅
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider shadow-sm">
                    ⚠️ Perlu Konfirmasi
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Account status check */}
          {voter.account_status !== 'dikonfirmasi' ? (
            <div className="w-full bg-amber-500/15 border border-amber-500/30 p-4 rounded-2xl text-xs flex gap-3 text-amber-300 leading-relaxed mb-6 items-start shadow-md shadow-amber-500/5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-bold mb-1">Akses Voting</p>
                <p className="text-amber-400/80 font-medium">Akun ini belum dikonfirmasi oleh panitia. Silakan pergi ke Pusat Konfirmasi di dekat Bilik Suara untuk mengonfirmasi identitas sebelum melanjutkan sesi voting.</p>
              </div>
            </div>
          ) : (voter.voting_status === 'sudah' || isVoterAllCompleted) ? (
            <div className="w-full bg-red-500/15 border border-red-500/30 p-4 rounded-2xl text-xs flex gap-3 text-red-300 leading-relaxed mb-6 items-start">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="font-bold mb-1">Sudah Memilih</p>
                <p className="text-red-400/80 font-medium">Seluruh hak pilih telah digunakan. Anda tidak dapat melakukan pemilihan ulang.</p>
              </div>
            </div>
          ) : null}

          {/* Option Action Buttons */}
          <div className="w-full space-y-3">
            {voter.account_status === 'dikonfirmasi' && voter.voting_status !== 'sudah' && !isVoterAllCompleted && (
              <button 
                onClick={proceedToCategories}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2 group"
              >
                Data Sudah Sesuai, Lanjutkan <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {(voter.voting_status === 'sudah' || isVoterAllCompleted) && (
              <button 
                disabled={true}
                className="w-full py-4 bg-slate-800 border border-slate-750 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
              >
                Terkunci
              </button>
            )}

            <button 
              onClick={resetSessionToKiosk}
              className="w-full py-3.5 bg-[#1c2030] hover:bg-[#232840] text-slate-400 hover:text-white border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              ← Kembali
            </button>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 3: CATEGORY SELECTION LIST
         ──────────────────────────────────────────────── */}
      {screen === 'categories' && voter && (
        isVoterAllCompleted ? (
          <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
            <div className="w-16 h-16 bg-red-400/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/5">
              <Check className="w-8 h-8 font-black" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mb-2">Voting Selesai</h1>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Terima kasih telah menggunakan hak pilih Anda. <br/>
              Sesi voting Anda telah berakhir dan Anda tidak dapat melakukan pemilihan ulang.
            </p>
            <button 
              onClick={resetSessionToKiosk}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15"
            >
              Selesai & Keluar Sesi
            </button>
          </main>
        ) : (
          <main className="flex-1 w-full max-w-4xl mx-auto p-6 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-8 gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
                  alt="PPU Logo"
                  className="w-16 h-16 object-contain"
                />
              </div>

              <div className="bg-[#151821] border border-[#2a3050] px-4 py-2 rounded-xl text-right shrink-0">
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Pemilih Aktif</div>
                <div className="text-white font-bold text-sm truncate max-w-[150px]">{voter.full_name}</div>
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">
              Pilih Kategori Pemilu
            </h1>
            <p className="text-xs text-slate-400 mb-8 max-w-2xl leading-relaxed">
              Anda harus menyelesaikan seluruh kategori pemungutan suara di bawah ini. Selesai memberikan suara di seluruh kategori untuk mengirim hasil akhir Anda secara kolektif ke pusat data.
            </p>

            {/* Progress Indicator */}
            <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl p-5 mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kemajuan Pemilihan</span>
                <span className="text-xs font-black text-indigo-400 font-mono tracking-wider">
                  {completedCategories} / {totalCategories} Selesai
                </span>
              </div>
              
              <div className="w-full h-3 bg-black/40 rounded-full border border-[#262c4a] overflow-hidden p-[2px]">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full relative"
                  style={{ width: `${percentComplete}%` }}
                >
                  <div className="absolute inset-y-0 right-0 w-2 h-full bg-white/40 blur-[1px]"></div>
                </div>
              </div>
            </div>

            {/* Categories Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 mb-8">
              {categories.map((cat) => {
                const voted = !!votedCategories[cat.id];
                return (
                  <div 
                    key={cat.id}
                    onClick={() => openCategory(cat.id)}
                    className={`bg-[#151821] border border-[#2a3050] rounded-2xl p-5 flex items-center justify-between relative overflow-hidden group ${
                      voted 
                        ? 'border-emerald-500/30 bg-emerald-950/5 opacity-80 cursor-default' 
                        : 'cursor-pointer hover:border-indigo-500 hover:bg-[#1c2030]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Circle icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                        voted 
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                          : 'bg-[#1c2030] border-[#2a3050] text-[#e8ecf5] group-hover:border-indigo-500/30 group-hover:bg-indigo-600/10'
                      }`}>
                        {voted ? <Check className="w-5 h-5 font-black" /> : cat.icon}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-bold text-white text-base leading-tight truncate">{cat.name}</h3>
                        <span className={`text-[10px] uppercase font-black tracking-widest block mt-1 ${
                          voted ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          {voted ? 'SUDAH MEMILIH' : 'BELUM MEMILIH'}
                        </span>
                      </div>
                    </div>

                    {!voted && (
                      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Locked Selesai Button Sticky-positioned */}
            <div className="mt-auto pt-6 border-t border-[#1c2030] flex gap-4">
              <button 
                onClick={resetSessionToKiosk}
                className="py-3 px-6 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold"
              >
                Kembali
              </button>

              <button 
                onClick={handleFinalFinish}
                disabled={!allCompleted}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#1a2e26] disabled:border-emerald-500/10 disabled:opacity-40 disabled:text-emerald-500/70 border border-emerald-500/20 text-white rounded-xl text-sm font-black shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                Simpan & Kirim Suara
              </button>
            </div>
          </main>
        )
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 4: CANDIDATES SELECTION GRID
         ──────────────────────────────────────────────── */}
      {screen === 'candidates' && voter && selectedCatId && (() => {
        const activeCat = categories.find(c => c.id === selectedCatId);
        const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';
        const voterDapil = isSelectedCatMpk 
          ? dapils.find(d => d.eligible_classes.includes(voter.class)) 
          : null;

        return (
          <main className="flex-1 w-full max-w-5xl mx-auto p-6 flex flex-col">
            {/* Back Action */}
            <button 
              onClick={() => triggerBack('categories')}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-white mb-6 self-start bg-[#151821] border border-[#2a3050] px-4 py-2 rounded-full cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali ke Kategori Pemilu
            </button>

            <h1 className="text-2xl font-black text-white tracking-tight mb-1">
              {activeCat?.name || 'Kandidat'}
            </h1>
            <p className="text-xs text-slate-400 mb-8 max-w-2xl">
              {isSelectedCatMpk 
                ? 'Tentukan pilihan perwakilan Anda untuk masing-masing kelas di Daerah Pemilihan (Dapil) ini.'
                : 'Tentukan pilihan Anda untuk kategori ini. Tekan tombol "Kirim Pilihan" untuk mengonfirmasi hak pilih.'}
            </p>

            {/* Candidates Bento Layout */}
            {isSelectedCatMpk && !voterDapil ? (
              <div className="bg-[#151821] border border-dashed border-[#2a3050] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto">
                <span className="text-4xl filter drop-shadow">⚠️</span>
                <div>
                  <h3 className="font-extrabold text-white text-base">Kelas Belum Teralokasi</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Kelas Anda (<strong>{voter.class}</strong>) belum didaftarkan ke dalam Daerah Pemilihan (Dapil) manapun untuk Pemilihan MPK SMABA oleh administrator.
                  </p>
                  <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                    Silakan hubungi Panitia KPPS di tempat pemilihan untuk mengonfigurasi alokasi kelas Anda ke Dapil yang sesuai.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {isSelectedCatMpk && voterDapil && (
                  <div className="w-full bg-[#151821] border border-indigo-500/30 p-4 rounded-2xl text-xs flex gap-3 text-indigo-300 leading-relaxed mb-6 items-start shadow-md shadow-indigo-500/5">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-indigo-400" />
                    <div>
                      <p className="font-bold mb-1">Daerah Pemilihan (MPK SMABA)</p>
                      <p className="text-indigo-400/80 font-semibold">Kelas Anda ({voter.class}) masuk dalam Daerah Pemilihan: <strong className="text-white bg-indigo-650 px-2.5 py-0.5 rounded ml-0.5">{voterDapil.name}</strong><br/>Silakan pilih masing-masing tepat 1 perwakilan per kelas di bawah ini.</p>
                    </div>
                  </div>
                )}

                {/* Conditional Rendering: Grouped MPK vs Reguler Grid */}
                {isSelectedCatMpk ? (
                  (() => {
                    const grouped: Record<string, Candidate[]> = {};
                    candidates.forEach(cand => {
                      const cls = cand.class_name || cand.candidate_class || 'Lainnya';
                      if (!grouped[cls]) grouped[cls] = [];
                      grouped[cls].push(cand);
                    });
                    const classesWithCandidates = Object.keys(grouped).sort();

                    if (classesWithCandidates.length === 0) {
                      return (
                        <div className="bg-[#151821] border border-dashed border-[#2a3050] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto">
                          <span className="text-4xl filter drop-shadow">🗳️</span>
                          <div>
                            <h3 className="font-extrabold text-white text-base">Kandidat Tidak Tersedia</h3>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                              Belum ada kandidat Paslon MPK yang terdaftar untuk Dapil Anda ({voterDapil?.name}).
                            </p>
                          </div>
                        </div>
                      );
                    }

                    const isAllSelected = classesWithCandidates.every(cls => !!selectedMpkVotes[cls]);

                    return (
                      <div className="flex-1 flex flex-col space-y-12 pb-12">
                        {classesWithCandidates.map(cls => {
                          const clsCands = grouped[cls].sort((a, b) => a.number - b.number);
                          const chosenCandId = selectedMpkVotes[cls];

                          return (
                            <div key={cls} className="space-y-4">
                              {/* Section Title representing the Class */}
                              <div className="flex items-center gap-3 border-b border-[#2a3050] pb-2">
                                <span className="w-2.5 h-6 bg-indigo-500 rounded-md"></span>
                                <h2 className="text-lg font-extrabold text-[#e8ecf5] tracking-tight">
                                  Perwakilan Kelas {cls}
                                </h2>
                                {chosenCandId ? (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full ml-auto flex items-center gap-1 font-sans">
                                    <Check className="w-3.5 h-3.5" /> Sudah Memilih
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full ml-auto font-sans">
                                    Pilihan Belum Ditentukan
                                  </span>
                                )}
                              </div>

                              {/* Candidates of this specific class inside the Dapil */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {clsCands.map(cand => {
                                  const isSelected = chosenCandId === cand.id;

                                  return (
                                    <div 
                                      key={cand.id}
                                      onClick={() => {
                                        setSelectedMpkVotes(prev => ({
                                          ...prev,
                                          [cls]: cand.id
                                        }));
                                      }}
                                      className={`bg-[#151821] border-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full group transition-all duration-200 cursor-pointer ${
                                        isSelected 
                                          ? 'border-indigo-500 ring-2 ring-indigo-500/30' 
                                          : 'border-[#2a3050] hover:border-slate-500/50'
                                      }`}
                                    >
                                      {/* Candidate Photo */}
                                      <div className="relative w-full aspect-[16/9] bg-[#1c2030] overflow-hidden shrink-0 flex items-center justify-center text-slate-600">
                                        {cand.photo_url ? (
                                          <img 
                                            src={cand.photo_url} 
                                            alt={cand.chairman} 
                                            className="w-full h-full object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1c2030] to-[#252a42]">
                                            <span className="text-4xl filter saturate-50 drop-shadow mb-2">🧑‍💼</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pasfoto Kandidat</span>
                                          </div>
                                        )}
                                        {/* Badge number */}
                                        <div className={`absolute left-4 top-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${
                                          isSelected ? 'bg-indigo-600' : 'bg-slate-700'
                                        }`}>
                                          KANDIDAT {String(cand.number).padStart(2, '0')}
                                        </div>

                                        {/* Big Selection Radio Glow Indicator */}
                                        <div className="absolute right-4 top-4">
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                            isSelected 
                                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg' 
                                              : 'border-slate-500 bg-black/40'
                                          }`}>
                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Info Body */}
                                      <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="font-extrabold text-white text-base tracking-tight leading-tight mb-4">
                                          {cand.chairman}
                                        </h3>

                                        {/* Visi */}
                                        <div className="mb-4">
                                          <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1 font-mono">Visi</span>
                                          <p className="text-slate-400 text-xs leading-relaxed font-semibold italic text-justify bg-[#1c2030] p-3 rounded-2xl border border-[#2a3050]">
                                            "{cand.visi}"
                                          </p>
                                        </div>

                                        {/* Misi */}
                                        {cand.misi && cand.misi.length > 0 && (
                                          <div className="font-semibold mb-2">
                                            <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1 font-mono">Misi Utama</span>
                                            <ul className="space-y-1">
                                              {cand.misi.slice(0, 3).map((m, mIdx) => (
                                                <li key={mIdx} className="text-slate-400 text-xs leading-normal flex gap-1.5 items-start text-justify">
                                                  <span className="text-indigo-400 font-extrabold shrink-0">•</span>
                                                  <span className="line-clamp-2">{m}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {/* Quick Interactive Selector Footer Button */}
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMpkVotes(prev => ({
                                              ...prev,
                                              [cls]: cand.id
                                            }));
                                          }}
                                          className={`w-full mt-auto py-3.5 rounded-2xl text-xs font-black transition-all ${
                                            isSelected
                                              ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/15 ring-1 ring-indigo-400'
                                              : 'bg-[#1c2030] border border-[#2a3050] hover:bg-slate-800 text-slate-300'
                                          }`}
                                        >
                                          {isSelected ? '✓ KANDIDAT DIPILIH' : 'PILIH KANDIDAT INI'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Submit Action Block for MPK */}
                        <div className="pt-8 border-t border-[#2a3050] flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => {
                              setShowModal1(true);
                            }}
                            disabled={!isAllSelected}
                            className={`px-10 py-5 rounded-2xl text-sm font-black tracking-wide shadow-2xl transition-all cursor-pointer ${
                              isAllSelected
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                                : 'bg-slate-800 border border-[#2a3050] text-slate-550 cursor-not-allowed'
                            }`}
                          >
                            ✓ Selesai dan Kumpulkan ({Object.keys(selectedMpkVotes).length} dari {classesWithCandidates.length} Kelas Terpilih)
                          </button>
                          {!isAllSelected && (
                            <p className="text-[10px] font-bold text-amber-400/80 mt-3 flex items-center gap-1">
                              ⚠️ Anda wajib menentukan tepat satu perwakilan pada setiap kelompok kelas untuk menyimpan pilihan MPK.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  // REGULER SINGLE CARD PICK SELECTION
                  candidates.length === 0 ? (
                    <div className="bg-[#151821] border border-dashed border-[#2a3050] rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto">
                      <span className="text-4xl filter drop-shadow">🗳️</span>
                      <div>
                        <h3 className="font-extrabold text-white text-base">Kandidat Tidak Tersedia</h3>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          Belum ada kandidat Paslon yang dikonfigurasi untuk kategori ini.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1 mb-6 items-start">
                      {candidates.map((cand) => (
                        <div 
                          key={cand.id}
                          className="bg-[#151821] border border-[#2a3050] hover:border-indigo-500 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full group"
                        >
                          {/* Visual Candidate Avatar Header 16:9 ratio */}
                          <div className="relative w-full aspect-[16/9] bg-[#1c2030] overflow-hidden shrink-0 flex items-center justify-center text-slate-600">
                            {cand.photo_url ? (
                              <img 
                                src={cand.photo_url} 
                                alt={cand.chairman} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#1c2030] to-[#252a42]">
                                <span className="text-4xl filter saturate-50 drop-shadow mb-2">🧑‍💼</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pasfoto Kandidat</span>
                              </div>
                            )}
                            {/* Paslon label badges floating upper leftmost */}
                            <div className="absolute left-4 top-4 bg-indigo-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                              PASLON {String(cand.number).padStart(2, '0')}
                            </div>
                          </div>

                          {/* Candidate Information Card Body */}
                          <div className="p-5 flex-1 flex flex-col">
                            {/* Candidates Names with line splits */}
                            <div className="mb-5">
                              <h3 className="font-extrabold text-white text-base tracking-tight leading-tight mb-2">
                                {cand.chairman}
                              </h3>
                              {cand.vice && (
                                <div className="space-y-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500/40 ml-1"></div>
                                  <h4 className="font-bold text-slate-400 text-sm italic tracking-tight">
                                    {cand.vice}
                                  </h4>
                                </div>
                              )}
                            </div>

                            {/* Visi Section */}
                            <div className="mb-4">
                              <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1.5 font-mono">Visi Utama</span>
                              <p className="text-slate-400 text-xs leading-relaxed font-semibold italic text-justify bg-[#1c2030] p-3 rounded-2xl border border-[#2a3050]">
                                "{cand.visi}"
                              </p>
                            </div>

                            {/* Misi Bullet points section */}
                            {cand.misi && cand.misi.length > 0 && (
                              <div className="mb-6 font-semibold">
                                <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1.5 font-mono">Misi & Program</span>
                                <ul className="space-y-1.5">
                                  {cand.misi.map((m, mIdx) => (
                                    <li key={mIdx} className="text-slate-400 text-xs leading-normal flex gap-2 items-start text-justify">
                                      <span className="text-indigo-400 font-extrabold mt-0.5 shrink-0">•</span>
                                      <span>{m}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Footer CTA select action buttons */}
                            <div className="mt-auto pt-4 border-t border-[#1c2030]">
                              <button 
                                onClick={() => selectCandidate(cand)}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                Kirim Pilihan Untuk Paslon {String(cand.number).padStart(2, '0')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}
          </main>
        );
      })()}

      {/* ────────────────────────────────────────────────
           SCREEN 5: INTERSTITIAL VOTE REGISTERED (COUNTDOWN)
         ──────────────────────────────────────────────── */}
      {screen === 'success' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl shadow-emerald-500/10">
            ✅
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-tight mb-2">
            Suara Dikirim!
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-8">
            Pilihan Anda untuk kategori ini berhasil dienkripsi oleh sistem.
          </p>

          <div className="w-24 h-24 rounded-full border-4 border-indigo-500 bg-[#151821] flex flex-col items-center justify-center shadow-2xl relative shadow-indigo-500/10">
            <span className="text-4xl font-extrabold text-[#e8ecf5] font-mono">{countdown}</span>
            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Detik</span>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 6: FULLSCREEN FINAL THANK YOU COUNTDOWN
         ──────────────────────────────────────────────── */}
      {screen === 'thankyou' && (
        <main className="flex-1 w-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-[#0d0f14] to-[#08090d]">
          <div className="w-24 h-24 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-4xl mb-6 shadow-xl shadow-indigo-500/10">
            🎉
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight mb-3">
            Terima Kasih!
          </h1>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-10">
            Suara Anda sangat berharga untuk kemajuan sekolah. Silakan tinggalkan bilik suara.
          </p>

          <div className="w-28 h-28 rounded-full border-4 border-indigo-500 bg-[#151821] flex flex-col items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 relative">
            <span className="text-4xl font-black text-white font-mono">{thankyouCountdown}</span>
            <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1.5">Detik</span>
          </div>

          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            Mempersiapkan sesi berikutnya dalam {thankyouCountdown} detik
          </p>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           MODAL 1: CANDIDATE CHOICE RE-CONFIRMATION
         ──────────────────────────────────────────────── */}
      {showModal1 && (() => {
        const activeCat = categories.find(c => c.id === selectedCatId);
        const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';

        if (!isSelectedCatMpk && !selectedCandidate) return null;

        return (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 text-left select-none">
            <div className="bg-[#151821] border border-[#2a3050] w-full max-w-sm rounded-3xl p-6 shadow-2xl">
              <HelpCircle className="w-12 h-12 text-indigo-400 mb-4" />
              <h3 className="text-lg font-extrabold text-white tracking-tight leading-tight mb-2">
                Apakah Anda yakin dengan pilihan ini?
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                {isSelectedCatMpk 
                  ? 'Anda memilih perwakilan kandidat MPK SMABA berikut untuk setiap kelompok kelas di Dapil Anda:' 
                  : 'Anda memilih kandidat berikut untuk didelegasikan hak pilih Anda dalam kategori ini:'}
              </p>

              {isSelectedCatMpk ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto mb-6 pr-1">
                  {Object.entries(selectedMpkVotes).map(([clsName, candId]) => {
                    const cand = candidates.find(c => c.id === candId);
                    if (!cand) return null;
                    return (
                      <div key={clsName} className="bg-[#1c2030] border border-[#2a3050] rounded-2xl p-3 flex justify-between items-center gap-2">
                        <div>
                          <span className="block text-[8px] font-black text-indigo-400 tracking-wider uppercase font-mono">Kelas {clsName}</span>
                          <span className="font-extrabold text-white text-xs block truncate leading-tight mt-0.5">{cand.chairman}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg shrink-0">
                          No. {String(cand.number).padStart(2, '0')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-[#1c2030] border border-[#2a3050] rounded-2xl p-4 mb-6">
                  <span className="block text-[8px] font-black text-indigo-400 tracking-wider mb-1 uppercase">Kandidat Terpilih</span>
                  <span className="block text-[11px] font-bold text-slate-550 tracking-wider mb-2 uppercase">
                    PASLON {String(selectedCandidate?.number).padStart(2, '0')}
                  </span>
                  <span className="font-extrabold text-white text-base leading-tight block truncate mb-1">
                    {selectedCandidate?.chairman}
                  </span>
                  {selectedCandidate?.vice && (
                    <span className="font-semibold text-slate-450 text-xs italic tracking-wide truncate block">
                      {selectedCandidate.vice}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal1(false)}
                  className="flex-1 py-3 bg-[#1c2030] hover:bg-[#232840] border border-[#2a3050] text-[#e8ecf5] rounded-xl text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={openModal2}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ────────────────────────────────────────────────
           MODAL 2: ABSOLUTE COMMIT WARNING
         ──────────────────────────────────────────────── */}
      {showModal2 && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#151821] border border-red-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-extrabold text-white tracking-tight leading-tight mb-2 uppercase">
              Pernyataan Integritas
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Keputusan Anda final. Hak suara yang telah dikirim dan tercatat dalam database <strong className="text-red-400">TIDAK DAPAT DIUBAH</strong> kembali dengan alasan apa pun.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowModal2(false);
                  setShowModal1(true);
                }}
                className="flex-1 py-3 bg-[#1c2030] hover:bg-[#232840] border border-[#2a3050] text-slate-400 hover:text-white rounded-xl text-xs font-bold"
              >
                ← Kembali
              </button>
              <button 
                onClick={confirmVoteSubmit}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/10"
              >
                Kirim Suara
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
