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
  HelpCircle,
  Lock,
  ShieldAlert,
  Maximize,
  Minimize
} from 'lucide-react';
import { getCategories, getCandidates, verifyVoterByCardId, submitVote, submitMultipleVotes, getVoterSubmittedVotes, finalizeVotingStatus, getDapils, getVotingCompletionStatus } from '../lib/votingService';
import { Category, Candidate, Profile, Vote, Dapil } from '../types';

import { getUserAccessSettings, UserAccessSettings } from '../lib/userAccessService';
import { getGelombangConfigActive, getGelombangSesiList, GelombangSesi } from '../lib/gelombangService';

export default function VotePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [accessSettings, setAccessSettings] = useState<UserAccessSettings | null>(null);

  // Screen state: 'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir'
  const [screen, setScreen] = useState<'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir'>('scan');

  // Input states
  const [cardIdInput, setCardIdInput] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gelombang states
  const [detectedActiveSession, setDetectedActiveSession] = useState<GelombangSesi | null>(null);
  const [detectedClassSchedule, setDetectedClassSchedule] = useState<GelombangSesi | null>(null);

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

  // OTP-style separate inputs for Card ID
  const otpRef0 = useRef<HTMLInputElement>(null);
  const otpRef1 = useRef<HTMLInputElement>(null);
  const otpRef2 = useRef<HTMLInputElement>(null);
  const otpRef3 = useRef<HTMLInputElement>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3];

  const handleOtpChange = (index: number, val: string) => {
    const numericOnly = val.replace(/\D/g, '');
    if (numericOnly.length > 1) {
      const padded = numericOnly.slice(0, 4);
      setCardIdInput(padded);
      const focusIndex = Math.min(padded.length, 3);
      otpRefs[focusIndex].current?.focus();
      return;
    }

    const digit = numericOnly.slice(-1);
    const currentDigits = [
      cardIdInput[0] || '',
      cardIdInput[1] || '',
      cardIdInput[2] || '',
      cardIdInput[3] || ''
    ];
    currentDigits[index] = digit;
    const merged = currentDigits.join('');
    setCardIdInput(merged);

    if (digit && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const currentVal = cardIdInput[index] || '';
      if (!currentVal && index > 0) {
        otpRefs[index - 1].current?.focus();
        const currentDigits = [
          cardIdInput[0] || '',
          cardIdInput[1] || '',
          cardIdInput[2] || '',
          cardIdInput[3] || ''
        ];
        currentDigits[index - 1] = '';
        setCardIdInput(currentDigits.join(''));
      }
    } else if (e.key === 'Enter') {
      handleVerifyCardId(cardIdInput);
    }
  };

  // Fullscreen enforcement layer
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const triggerFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      const requestMethod = docEl.requestFullscreen || 
                            docEl.mozRequestFullScreen || 
                            docEl.webkitRequestFullscreen || 
                            docEl.msRequestFullscreen;
      if (requestMethod) {
        await requestMethod.call(docEl);
      }
    } catch (err) {
      console.warn("Gagal masuk mode fullscreen:", err);
    }
  };

  // Initial interaction auto-request fullscreen
  useEffect(() => {
    let hasAttempted = false;
    const autoEnter = async () => {
      if (hasAttempted) return;
      hasAttempted = true;
      cleanup();
      await triggerFullscreen();
    };

    const cleanup = () => {
      window.removeEventListener('click', autoEnter);
      window.removeEventListener('touchstart', autoEnter);
    };

    window.addEventListener('click', autoEnter, { once: true });
    window.addEventListener('touchstart', autoEnter, { once: true });

    return () => {
      cleanup();
    };
  }, []);

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

      // Check Gelombang Voting Waves Scheduling
      const isGelombangGlobalActive = await getGelombangConfigActive();
      if (isGelombangGlobalActive) {
        const isEnded = profile.voting_status === 'sudah' || completionStatus.allCompleted;
        if (isEnded) {
          // Blokir - straight to profile where Sudah Memilih error blocks them
          setScreen('profile');
          setSearchLoading(false);
          return;
        }

        const voterClass = profile.class || '';
        const listSesi = await getGelombangSesiList();

        // Find current matching active session slot
        const now = new Date();
        const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const activeSesi = listSesi.find(s => 
          s.is_active &&
          s.kelas.includes(voterClass) &&
          nowStr >= s.jam_mulai &&
          nowStr <= s.jam_selesai
        );

        if (activeSesi) {
          setDetectedActiveSession(activeSesi);
          setScreen('gelombang_aktif');
        } else {
          // Find any session info for this class to display scheduling details to the student
          const infoSesi = listSesi.find(s => s.kelas.includes(voterClass));
          setDetectedClassSchedule(infoSesi || null);
          setScreen('gelombang_blokir');
        }
      } else {
        setScreen('profile');
      }
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

    try {
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
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pilihan suara akhir. Silakan coba kembali.');
    }
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
          {/* Stunning Layered Closed-State Illustration */}
          <div className="relative mb-8 flex items-center justify-center">
            {/* Outer pulsating glow ring */}
            <div className="absolute w-28 h-28 bg-rose-500/10 rounded-full blur-xl"></div>
            {/* Secondary thin dashed rotating ring */}
            <div className="absolute w-24 h-24 border border-rose-500/20 rounded-full border-dashed"></div>
            {/* Outer border ring */}
            <div className="relative w-20 h-20 bg-[#151821] border border-rose-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-950/50">
              <Lock className="w-9 h-9 text-rose-500" />
              {/* Corner mini warning badge */}
              <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-1 border border-[#0d0f14] shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            <span>Bilik Suara Ditutup</span>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Akses Ditutup</h1>
          <p className="text-slate-400 font-medium text-xs sm:text-sm mb-8 leading-relaxed max-w-sm">
            Mohon maaf, saat ini bilik suara elektronik sedang dinonaktifkan oleh panitia Administrator. 
            Silakan hubungi panitia penyelenggara untuk informasi lebih lanjut mengenai jadwal pemungutan suara resmi.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-[#1c2030] hover:bg-[#232840] text-slate-200 border border-[#2a3050] rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer"
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
            Silakan masukkan Card ID secara manual atau scan QR Code yang ada di Voters Card
          </p>

          {/* Manual Input field styled as 4-digits OTP - FIRST */}
          <div className="w-full mb-4">
            <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
              Card ID
            </label>
            <div className="flex gap-2.5 justify-center py-1">
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  ref={otpRefs[index]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={cardIdInput[index] || ''}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  autoComplete="off"
                  className="w-14 h-14 sm:w-16 sm:h-16 bg-[#1c2030] border-2 border-[#2a3050] focus:border-indigo-500 rounded-xl outline-none text-white font-mono font-bold text-center text-2xl transition-all shadow-md focus:ring-4 focus:ring-indigo-500/15"
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center select-none">
              (CARD ID MAKSIMAL INPUT 4 ANGKA, TIDAK BISA LEBIH DARI 4 DAN WAJIB BERISI ANGKA)
            </p>
          </div>

          <div className="w-full flex items-center gap-4 my-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span className="h-px bg-[#2a3050] flex-1"></span>
            atau scan qr code
            <span className="h-px bg-[#2a3050] flex-1"></span>
          </div>

          {/* QR Scan Container Box - SECOND */}
          <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl overflow-hidden shadow-2xl relative mb-4">
            <div id="qr-reader-container" className="w-full h-[180px] sm:h-[200px] relative bg-black/40 flex flex-col items-center justify-center overflow-hidden">
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
           SCREEN 1.1: GELOMBANG VOTING ACTIVE MATCH
         ──────────────────────────────────────────────── */}
      {screen === 'gelombang_aktif' && voter && detectedActiveSession && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto text-center">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute w-24 h-24 bg-indigo-500/10 rounded-full blur-xl"></div>
            <div className="relative w-16 h-16 bg-[#151821] border border-indigo-500/30 rounded-2xl flex items-center justify-center shadow-xl">
              <Check className="w-8 h-8 text-indigo-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
            <span>Sesi Sesuai</span>
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2 uppercase">Sesi Aktif</h1>
          <p className="text-slate-400 font-medium text-xs mb-6 leading-relaxed max-w-sm">
            Waktu pemilihan untuk kelas Anda sedang berlangsung aktif sekarang. Anda dapat melanjutkan proses pemungutan suara.
          </p>

          <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl p-5 mb-8 text-left space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Nama Sesi</span>
              <span className="font-extrabold text-indigo-400">{detectedActiveSession.nama_sesi}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Waktu Sesi</span>
              <span className="font-extrabold text-[#e8ecf5] bg-[#1c2030] px-2.5 py-1 rounded border border-[#2a3050]">{detectedActiveSession.jam_mulai} - {detectedActiveSession.jam_selesai}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Kelas Anda</span>
              <span className="font-extrabold text-slate-200 font-mono">{voter.class}</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={() => setScreen('profile')}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2 group cursor-pointer transition-colors"
            >
              Lanjutkan Validasi Profil <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={resetSessionToKiosk}
              className="w-full py-3.5 bg-[#1c2030] hover:bg-[#232840] text-slate-400 hover:text-white border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              ← Batal
            </button>
          </div>
        </main>
      )}

      {/* ────────────────────────────────────────────────
           SCREEN 1.2: GELOMBANG VOTING BLOCKED
         ──────────────────────────────────────────────── */}
      {screen === 'gelombang_blokir' && voter && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto text-center">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute w-24 h-24 bg-rose-500/15 rounded-full blur-xl"></div>
            <div className="relative w-16 h-16 bg-[#151821] border border-rose-500/30 rounded-2xl flex items-center justify-center shadow-xl">
              <Lock className="w-8 h-8 text-rose-500" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-400 text-[10px] font-black tracking-widest uppercase mb-4">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
            <span>Akses Ditangguhkan</span>
          </div>

          <h1 className="text-xl font-extrabold text-white tracking-tight mb-2 uppercase">Sesi Tidak Aktif</h1>
          <p className="text-slate-400 font-medium text-xs mb-6 leading-relaxed max-w-sm">
            Kelas Anda belum memiliki sesi voting aktif saat ini. Silakan datang kembali sesuai jadwal yang telah ditentukan panitia.
          </p>

          {/* Conditional session details for class */}
          {detectedClassSchedule && (
            <div className="w-full bg-[#1c1316] border border-rose-950/40 rounded-2xl p-5 mb-8 text-left space-y-3 relative overflow-hidden">
              <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest border-b border-rose-950/40 pb-2 mb-2">
                Informasi Sesi Kelas {voter.class}
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Nama Sesi</span>
                <span className="font-extrabold text-rose-300">{detectedClassSchedule.nama_sesi}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Jadwal</span>
                <span className="font-extrabold text-[#e8ecf5] bg-[#1c2030] px-2.5 py-1 rounded border border-[#2a3050]">{detectedClassSchedule.jam_mulai} - {detectedClassSchedule.jam_selesai}</span>
              </div>
            </div>
          )}

          <button 
            onClick={resetSessionToKiosk}
            className="w-full py-4 bg-[#1c2030] hover:bg-[#232840] text-slate-200 border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            ← Kembali ke Layar Awal
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
                    ✓ Terverifikasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider shadow-sm">
                    ⚠️ Pending
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
                Hak Pilih Sudah Digunakan (Terkunci)
              </button>
            )}

            <button 
              onClick={resetSessionToKiosk}
              className="w-full py-3.5 bg-[#1c2030] hover:bg-[#232840] text-slate-400 hover:text-white border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              ← Kembali ke Layar Awal
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
                Batalkan Voting
              </button>

              <button 
                onClick={handleFinalFinish}
                disabled={!allCompleted}
                className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-[#1a2e26] disabled:border-emerald-500/10 disabled:opacity-40 disabled:text-emerald-500/70 border border-emerald-500/20 text-white rounded-xl text-sm font-black shadow-xl shadow-emerald-600/10 flex items-center justify-center gap-2"
              >
                Simpan & Kirim Hak Suara Akhir ✓
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
                  <div className="w-full bg-[#151821] border border-indigo-500/30 p-6 rounded-3xl text-sm flex gap-4 text-indigo-300 leading-relaxed mb-8 items-start shadow-2xl shadow-indigo-500/5 transition-all">
                    <div className="bg-indigo-500/20 p-3 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 shrink-0 text-indigo-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-black text-white text-base tracking-tight">Daerah Pemilihan MPK</p>
                      <p className="text-white/80 font-medium text-xs sm:text-sm">
                        Kelas Anda (<strong className="text-indigo-400 font-black">{voter.class}</strong>) masuk dalam Daerah Pemilihan: <strong className="text-indigo-300 font-bold">{voterDapil.name}</strong>
                      </p>
                      <p className="text-indigo-400/70 text-xs sm:text-sm font-medium">
                        Silakan pilih 1 perwakilan pada setiap kelas di bawah ini dengan menekan gambar salah satu kandidat.
                      </p>
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
                                        {cand.visi && cand.visi.trim() !== '' && (
                                          <div className="mb-4">
                                            <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1 font-mono">Visi</span>
                                            <p className="text-slate-400 text-xs leading-relaxed font-semibold italic text-justify bg-[#1c2030] p-3 rounded-2xl border border-[#2a3050]">
                                              "{cand.visi}"
                                            </p>
                                          </div>
                                        )}

                                        {/* Misi */}
                                        {cand.misi && cand.misi.length > 0 && (
                                          <div className="font-semibold mb-2">
                                            <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1 font-mono">Misi</span>
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

                                        {/* Quick Selection Indicator Badge (Replaces the button) */}
                                        {isSelected && (
                                          <div className="flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-[10px] font-black tracking-widest mt-auto">
                                            <Check className="w-4 h-4" />
                                            <span>TERPILIH</span>
                                          </div>
                                        )}
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
                    <div className="flex-1 flex flex-col pb-24">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 items-start">
                        {candidates.map((cand) => {
                          const isSelected = selectedCandidate?.id === cand.id;
                          return (
                            <div 
                              key={cand.id}
                              onClick={() => setSelectedCandidate(cand)}
                              className={`bg-[#151821] border-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-full group transition-all duration-300 cursor-pointer ${
                                isSelected 
                                  ? 'border-emerald-500 bg-emerald-500/5 ring-4 ring-emerald-500/10' 
                                  : 'border-[#2a3050] hover:border-slate-500/50'
                              }`}
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
                                <div className={`absolute left-4 top-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-colors ${
                                  isSelected ? 'bg-emerald-600' : 'bg-indigo-600'
                                }`}>
                                  PASLON {String(cand.number).padStart(2, '0')}
                                </div>

                                {/* Selection Check Overlay */}
                                {isSelected && (
                                  <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                                    <div className="bg-emerald-500 text-white p-2 rounded-full shadow-xl">
                                      <Check className="w-8 h-8 font-black" />
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Candidate Information Card Body */}
                              <div className="p-5 flex-1 flex flex-col">
                                {/* Candidates Names in horizontal line */}
                                <div className="mb-5">
                                  <h3 className="font-extrabold text-white text-base tracking-tight leading-tight flex flex-wrap items-center gap-x-2">
                                    <span className="text-white">{cand.chairman}</span>
                                    {cand.vice && (
                                      <>
                                        <span className="text-indigo-400 font-black">•</span>
                                        <span className="text-slate-400 font-bold text-sm italic">{cand.vice}</span>
                                      </>
                                    )}
                                  </h3>
                                </div>

                                {/* Visi Section */}
                                {cand.visi && cand.visi.trim() !== '' && (
                                  <div className="mb-4">
                                    <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1.5 font-mono">Visi</span>
                                    <p className="text-slate-400 text-xs leading-relaxed font-semibold italic text-justify bg-[#1c2030] p-3 rounded-2xl border border-[#2a3050]">
                                      "{cand.visi}"
                                    </p>
                                  </div>
                                )}

                                {/* Misi Bullet points section */}
                                {cand.misi && Array.isArray(cand.misi) && cand.misi.length > 0 && (
                                  <div className="mb-6 font-semibold">
                                    <span className="block text-[9px] uppercase font-bold text-indigo-400 tracking-wider mb-1.5 font-mono">Misi</span>
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

                                {/* Selected Badge indicator */}
                                {isSelected && (
                                  <div className="mt-auto pt-4 flex items-center justify-center">
                                    <span className="inline-flex items-center gap-1.5 py-2 px-4 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                                      📌 Dipilih
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Global Sticky Submit Button for Reguler */}
                      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0d0f14]/80 backdrop-blur-xl border-t border-[#2a3050] z-[50] flex justify-center">
                        <div className="w-full max-w-lg">
                          <button
                            onClick={() => {
                              if (selectedCandidate) {
                                setShowModal1(true);
                              }
                            }}
                            disabled={!selectedCandidate}
                            className={`w-full py-4 rounded-2xl text-sm font-black tracking-wide shadow-2xl transition-all flex items-center justify-center gap-3 ${
                              selectedCandidate
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer'
                                : 'bg-slate-800 border border-[#2a3050] text-slate-500 cursor-not-allowed opacity-80'
                            }`}
                          >
                            {selectedCandidate ? (
                              <>
                                Kirim Suara <ArrowRight className="w-5 h-5" />
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4" /> Pilih paslon terlebih dahulu
                              </>
                            )}
                          </button>
                        </div>
                      </div>
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
            Pilihan Suara Tercatat!
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed mb-8">
            Pilihan Anda untuk kategori ini berhasil diamankan dan dienkripsi oleh sistem database. Kembali otomatis dalam:
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
            Hak suara Anda sangat berharga untuk kemajuan sekolah kita. Silakan tinggalkan bilik suara digital secara aman.
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

      {/* ────────────────────────────────────────────────
           FULLSCREEN ENFORCEMENT OVERLAY
         ──────────────────────────────────────────────── */}
      {!isFullscreen && (
        <div className="fixed inset-0 bg-[#0d0f14]/98 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute w-28 h-28 bg-indigo-500/10 rounded-full blur-xl animate-pulse"></div>
            <div className="relative w-20 h-20 bg-[#151821] border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-2xl">
              <Maximize className="w-10 h-10 text-indigo-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-4">
            <span>Sistem Keamanan Layar</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2 uppercase">
            Mode Layar Penuh Diperlukan
          </h2>
          
          <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-sm mb-8 leading-relaxed">
            Demi menjaga ketertiban, keamanan, serta integritas jalannya pemilihan, bilik suara elektronik ini diwajibkan berjalan dalam mode Layar Penuh (Fullscreen).
          </p>

          <button
            onClick={triggerFullscreen}
            className="w-full max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/25 transition-all text-center cursor-pointer active:scale-95 duration-150"
          >
            <Maximize className="w-4 h-4" />
            <span>Kembali ke Fullscreen</span>
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────
           FALLSCREEN MANUAL CORNER FALLBACK BUTTON
         ──────────────────────────────────────────────── */}
      {!isFullscreen && (
        <button
          onClick={triggerFullscreen}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all border border-indigo-500/30 cursor-pointer"
          title="Manual Fullscreen Fallback"
        >
          <Maximize className="w-4 h-4" />
          <span>Layar Penuh (Fullscreen)</span>
        </button>
      )}

    </div>
  );
}
