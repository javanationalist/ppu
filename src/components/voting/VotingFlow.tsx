import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useScrollLock } from '../../hooks/useScrollLock';
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
import { 
  getCategories, 
  getCandidates, 
  verifyVoterByCardId, 
  submitVote, 
  submitMultipleVotes, 
  getVoterSubmittedVotes, 
  finalizeVotingStatus, 
  getDapils, 
  getVotingCompletionStatus,
  getGtkProfiles,
  submitFreeVote
} from '../../lib/votingService';
import { Category, Candidate, Profile, Vote, Dapil } from '../../types';
import { getUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { getGelombangConfigActive, getGelombangSesiList, GelombangSesi } from '../../lib/gelombangService';
import { motion, AnimatePresence } from 'motion/react';
import { getCategoryDetails } from './VotingFlow/getCategoryDetails';
import { OtpInputGroup } from './VotingFlow/OtpInputGroup';

export interface VotingFlowProps {
  voteMode: 'regular' | 'booth';
  initialVoterCardId?: string | null;
  onComplete?: () => void;
  onCancel?: () => void;
  isGtkMode?: boolean;
  isFreeVote?: boolean;
}


export default function VotingFlow({ voteMode, initialVoterCardId, onComplete, onCancel, isGtkMode = false, isFreeVote = false }: VotingFlowProps) {
  const navigate = useNavigate();

  const [accessSettings, setAccessSettings] = useState<UserAccessSettings | null>(null);

  // Screen state: 'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir' | 'auto_finalize'
  const [screen, setScreen] = useState<'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir' | 'auto_finalize'>(
    isFreeVote ? 'categories' : (voteMode === 'booth' ? 'profile' : 'scan')
  );

  // Input states
  const [cardIdInput, setCardIdInput] = useState(initialVoterCardId || '');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Gelombang states
  const [detectedActiveSession, setDetectedActiveSession] = useState<GelombangSesi | null>(null);
  const [detectedClassSchedule, setDetectedClassSchedule] = useState<GelombangSesi | null>(null);

  // Current Voter & Vote details
  const [voter, setVoter] = useState<Profile | null>(
    isFreeVote ? {
      id: 'freevote-dummy-voter-id',
      email: 'freevote@ppu.co',
      full_name: 'Pemilih Mandiri',
      role: 'user',
      class: 'FREE_VOTE',
      card_id: 'FREE_VOTE',
      account_status: 'dikonfirmasi',
      voting_status: 'belum',
      card_visibility: false
    } as any : null
  );
  const [isVoterAllCompleted, setIsVoterAllCompleted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votedCategories, setVotedCategories] = useState<Record<string, string>>({}); // { catId: candidateId }
  const [accumulatedMpkVotes, setAccumulatedMpkVotes] = useState<Record<string, string>>({});
  const [dapils, setDapils] = useState<Dapil[]>([]);
  
  const totalCategories = categories.length;
  const completedCategories = Object.keys(votedCategories).length;
  const percentComplete = totalCategories > 0 ? Math.round((completedCategories / totalCategories) * 100) : 0;
  const allCompleted = totalCategories > 0 && completedCategories === totalCategories;
  
  // Navigation for active voting category
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedMpkVotes, setSelectedMpkVotes] = useState<Record<string, string>>({}); // { class: candidateId }
  const [activeMpkClassIndex, setActiveMpkClassIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Countdowns
  const [countdown, setCountdown] = useState(5);
  const [thankyouCountdown, setThankyouCountdown] = useState(10);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Fullscreen support checks
  const isFullscreenSupported = (() => {
    try {
      if (typeof window === 'undefined' || typeof document === 'undefined') return false;
      const isIframe = window.self !== window.top;
      if (isIframe) return false;
      return !!(document.fullscreenEnabled || 
                (document as any).webkitFullscreenEnabled || 
                (document as any).mozFullScreenEnabled || 
                (document as any).msFullscreenEnabled);
    } catch (e) {
      return false;
    }
  })();

  const [isFullscreen, setIsFullscreen] = useState(!isFullscreenSupported);

  useEffect(() => {
    if (!isFullscreenSupported) return;

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreenSupported]);

  const triggerFullscreen = async () => {
    if (!isFullscreenSupported) return;
    try {
      const docEl = document.documentElement as any;
      const requestMethod = docEl.requestFullscreen || 
                            docEl.mozRequestFullScreen || 
                            docEl.webkitRequestFullscreen || 
                            docEl.msRequestFullscreen;
      if (requestMethod) {
        const promise = requestMethod.call(docEl);
        if (promise && typeof promise.catch === 'function') {
          promise.catch((err: any) => {
            console.warn("Gagal masuk mode fullscreen (caught promise):", err);
          });
        }
      }
    } catch (err) {
      console.warn("Gagal masuk mode fullscreen:", err);
    }
  };

  useEffect(() => {
    if (!isFullscreenSupported) return;
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
  }, [isFullscreenSupported]);

  // Initialize and load metadata
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
          return;
        }

        // If we have an initial voter card ID (booth mode), auto load
        if (initialVoterCardId) {
          setCardIdInput(initialVoterCardId);
          await handleVerifyCardId(initialVoterCardId);
        }
      } catch (err) {
        console.error('Failed to init categories/dapils/settings', err);
      }
    };
    init();

    return () => {
      stopScanner();
      clearCountdown();
    };
  }, [initialVoterCardId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (voter && ['categories', 'candidates', 'success', 'profile'].includes(screen)) {
        e.preventDefault();
        e.returnValue = 'Sesi pemungutan suara Anda sedang aktif. Menyegarkan halaman akan membatalkan sesi Anda.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [voter, screen]);

  // Auto-trigger transition screen when all categories completed on categories screen
  useEffect(() => {
    if (screen === 'categories' && categories.length > 0 && allCompleted && !isSubmitting) {
      setScreen('auto_finalize');
      setCountdown(10);
      clearCountdown();

      let currentSecs = 10;
      countdownIntervalRef.current = setInterval(() => {
        currentSecs--;
        setCountdown(currentSecs);
        if (currentSecs <= 0) {
          clearCountdown();
          setSelectedCatId(null);
          setSelectedCandidate(null);
          setSelectedMpkVotes({});
          handleFinalFinish();
        }
      }, 1000);
    }
  }, [screen, allCompleted, categories.length, isSubmitting]);

  useEffect(() => {
    if (!voter || !['profile', 'categories', 'candidates'].includes(screen)) {
      return;
    }

    const INACTIVITY_LIMIT_MS = 180 * 1000; // 3 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert('Sesi Anda telah ditutup secara otomatis demi keamanan karena tidak ada aktivitas selama 3 menit.');
        handleCancelVotingFlow();
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [voter, screen]);

  const clearCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  // QR Scanner Logic
  async function startCamera() {
    setCamError('Kamera tidak tersedia');
  }

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
          const cleanCardId = decodedText.trim();
          setCardIdInput(cleanCardId);
          handleVerifyCardId(cleanCardId);
          stopScanner();
        },
        () => {}
      );
    } catch (err: any) {
      setIsScanning(false);
      setCamError('Gagal menjalankan pemindai: ' + (err.message || err));
    }
  }

  async function switchCamera() {
    if (cameras.length <= 1) return;
    const nextIdx = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIdx);
    await startScanner(cameras[nextIdx].id);
  }

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
  }

  // GTK Mode States
  const [gtkProfiles, setGtkProfilesList] = useState<Profile[]>([]);
  const [selectedGtkId, setSelectedGtkId] = useState<string>('');
  const [gtkSearchQuery, setGtkSearchQuery] = useState<string>('');

  useEffect(() => {
    if (isGtkMode) {
      const loadGtk = async () => {
        try {
          const profiles = await getGtkProfiles();
          setGtkProfilesList(profiles);
        } catch (err) {
          console.error('Failed to load GTK profiles:', err);
        }
      };
      loadGtk();
    }
  }, [isGtkMode]);

  const handleVerifyGtkVoter = async (voterId: string) => {
    if (!voterId) return;

    if (accessSettings && !accessSettings.voting_global_enabled) {
      setScreen('forbidden');
      return;
    }

    setSearchLoading(true);
    setErrorMessage(null);

    try {
      const profile = gtkProfiles.find(p => p.id === voterId);
      if (!profile) {
        setErrorMessage('Profil Guru / Tenaga Kependidikan tidak ditemukan.');
        setSearchLoading(false);
        return;
      }

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

      const isEnded = profile.voting_status === 'sudah' || completionStatus.allCompleted;
      if (isEnded) {
        setErrorMessage('Sesi voting untuk Guru & Tenaga Kependidikan ini sudah diselesaikan. Setiap pemilih hanya dapat memberikan suara sekali.');
        setSearchLoading(false);
        return;
      }

      setScreen('profile');
      setSearchLoading(false);
    } catch (err: any) {
      console.error('Error verifying GTK voter:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memvalidasi profil GTK.');
      setSearchLoading(false);
    }
  };

  // Voter identification logic
  const handleVerifyCardId = async (enteredId: string) => {
    if (!enteredId || enteredId.trim() === '') return;
    
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
          setScreen('profile');
          setSearchLoading(false);
          return;
        }

        const voterClass = profile.class || '';
        const listSesi = await getGelombangSesiList();

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
      return;
    }
    setScreen('categories');
  };

  // Select a category to vote
  const openCategory = async (catId: string) => {
    if (votedCategories[catId]) return;

    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    setSelectedCatId(catId);
    setSelectedMpkVotes({});
    setActiveMpkClassIndex(0);
    setSlideDirection('right');
    setSearchLoading(true);
    try {
      let cands = await getCandidates(catId);
      
      if (cat.type === 'mpk_smaba') {
        const voterClass = voter?.class || '';
        const voterDapil = dapils.find(d => d.eligible_classes.includes(voterClass));
        if (voterDapil && !isFreeVote) {
          cands = cands.filter(cand => cand.dapil_id === voterDapil.id);
        } else if (isFreeVote) {
          // No filtering by Dapil in Free Vote mode
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

  const selectCandidate = (cand: Candidate) => {
    setSelectedCandidate(cand);
    setShowModal1(true);
  };

  const openModal2 = () => {
    setShowModal1(false);
    setShowModal2(true);
  };

  const confirmVoteSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowModal2(false);
    if (!voter || !selectedCatId) {
      setIsSubmitting(false);
      return;
    }

    const activeCat = categories.find(c => c.id === selectedCatId);
    const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';

    try {
      if (isFreeVote) {
        const updatedVoted = {
          ...votedCategories,
          [selectedCatId]: isSelectedCatMpk ? 'voted' : selectedCandidate!.id
        };
        setVotedCategories(updatedVoted);

        if (isSelectedCatMpk) {
          setAccumulatedMpkVotes(prev => ({
            ...prev,
            ...selectedMpkVotes
          }));
        }

        const totalCats = categories.length;
        const isAllCompleted = totalCats > 0 && Object.keys(updatedVoted).length >= totalCats;

        if (isAllCompleted) {
          setScreen('auto_finalize');
          setCountdown(10);
          clearCountdown();

          let currentSecs = 10;
          countdownIntervalRef.current = setInterval(() => {
            currentSecs--;
            setCountdown(currentSecs);
            if (currentSecs <= 0) {
              clearCountdown();
              setSelectedCatId(null);
              setSelectedCandidate(null);
              setSelectedMpkVotes({});
              handleFinalFinishFreeVote(updatedVoted);
            }
          }, 1000);
        } else {
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
        }
        return;
      }

      if (isSelectedCatMpk) {
        const votesToSubmit: Vote[] = Object.entries(selectedMpkVotes).map(([clsName, candId]) => ({
          voter_id: voter.id,
          category_id: selectedCatId,
          candidate_id: candId as string
        }));

        const success = await submitMultipleVotes(votesToSubmit);

        if (success) {
          const updatedVoted = {
            ...votedCategories,
            [selectedCatId]: 'voted'
          };
          setVotedCategories(updatedVoted);

          const totalCats = categories.length;
          const isAllCompleted = totalCats > 0 && Object.keys(updatedVoted).length >= totalCats;

          if (isAllCompleted) {
            setScreen('auto_finalize');
            setCountdown(10);
            clearCountdown();

            let currentSecs = 10;
            countdownIntervalRef.current = setInterval(() => {
              currentSecs--;
              setCountdown(currentSecs);
              if (currentSecs <= 0) {
                clearCountdown();
                setSelectedCatId(null);
                setSelectedCandidate(null);
                setSelectedMpkVotes({});
                handleFinalFinish();
              }
            }, 1000);
          } else {
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
          }
        } else {
          alert('Gagal merekam data suara pemilihan MPK. Silakan coba kembali.');
        }
      } else {
        if (!selectedCandidate) {
          setIsSubmitting(false);
          return;
        }

        const voteObj: Vote = {
          voter_id: voter.id,
          category_id: selectedCatId,
          candidate_id: selectedCandidate.id
        };
        
        const success = await submitVote(voteObj);

        if (success) {
          const updatedVoted = {
            ...votedCategories,
            [selectedCatId]: selectedCandidate.id
          };
          setVotedCategories(updatedVoted);

          const totalCats = categories.length;
          const isAllCompleted = totalCats > 0 && Object.keys(updatedVoted).length >= totalCats;

          if (isAllCompleted) {
            setScreen('auto_finalize');
            setCountdown(10);
            clearCountdown();

            let currentSecs = 10;
            countdownIntervalRef.current = setInterval(() => {
              currentSecs--;
              setCountdown(currentSecs);
              if (currentSecs <= 0) {
                clearCountdown();
                setSelectedCatId(null);
                setSelectedCandidate(null);
                setSelectedMpkVotes({});
                handleFinalFinish();
              }
            }, 1000);
          } else {
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
          }
        } else {
          alert('Gagal merekam data suara pemilihan. Silakan coba kembali.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Gagal mengirimkan suara Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalFinish = async () => {
    if (!voter || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await finalizeVotingStatus(voter.id);

      setScreen('thankyou');
      setThankyouCountdown(10);
      clearCountdown();

      let currentSecs = 10;
      countdownIntervalRef.current = setInterval(() => {
        currentSecs--;
        setThankyouCountdown(currentSecs);
        if (currentSecs <= 0) {
          clearCountdown();
          if (voteMode === 'booth') {
            if (onComplete) onComplete();
          } else {
            resetSessionToKiosk();
          }
        }
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pilihan suara akhir. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalFinishFreeVote = async (latestVotedCats: Record<string, string>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const votesToSubmit: { category_id: string; candidate_id: string }[] = [];
      
      for (const [catId, val] of Object.entries(latestVotedCats)) {
        const cat = categories.find(c => c.id === catId);
        if (cat?.type === 'mpk_smaba') {
          Object.values(accumulatedMpkVotes).forEach(candId => {
            if (candId) {
              votesToSubmit.push({
                category_id: catId,
                candidate_id: candId as string
              });
            }
          });
        } else if (val && val !== 'voted') {
          votesToSubmit.push({
            category_id: catId,
            candidate_id: val
          });
        }
      }

      await submitFreeVote('Siswa Mandiri (Free Vote)', 'FREE_VOTE', votesToSubmit);

      setScreen('thankyou');
      setThankyouCountdown(10);
      clearCountdown();

      let currentSecs = 10;
      countdownIntervalRef.current = setInterval(() => {
        currentSecs--;
        setThankyouCountdown(currentSecs);
        if (currentSecs <= 0) {
          clearCountdown();
          if (onComplete) onComplete();
        }
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pilihan suara akhir. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVotingFlow = () => {
    if (voteMode === 'booth') {
      if (onCancel) onCancel();
    } else {
      resetSessionToKiosk();
    }
  };

  const resetSessionToKiosk = () => {
    setVoter(null);
    setIsVoterAllCompleted(false);
    setCardIdInput('');
    setVotedCategories({});
    setSelectedCatId(null);
    setSelectedCandidate(null);
    setSelectedMpkVotes({});
    setErrorMessage(null);
    setCamError(null);
    stopScanner();
    setScreen('scan');
  };

  const triggerBack = (targetScreen: 'scan' | 'categories') => {
    clearCountdown();
    setScreen(targetScreen);
  };

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8ecf5] flex flex-col font-sans select-none antialiased relative w-full">
      
      {/* SCREEN 0: FORBIDDEN / DISABLED */}
      {screen === 'forbidden' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center">
          <div className="relative mb-8 flex items-center justify-center">
            <div className="absolute w-28 h-28 bg-rose-500/10 rounded-full blur-xl"></div>
            <div className="absolute w-24 h-24 border border-rose-500/20 rounded-full border-dashed"></div>
            <div className="relative w-20 h-20 bg-[#151821] border border-rose-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-950/50">
              <Lock className="w-9 h-9 text-rose-500" />
              <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-1 border border-[#0d0f14] shadow-md">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

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
            onClick={() => {
              if (voteMode === 'booth') {
                if (onCancel) onCancel();
              } else {
                navigate('/');
              }
            }}
            className="w-full py-4 bg-[#1c2030] hover:bg-[#232840] text-slate-200 border border-[#2a3050] rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            {voteMode === 'booth' ? 'Kembali ke Layar Utama' : 'Kembali ke Halaman Depan'}
          </button>
        </main>
      )}

      {/* SCREEN 1: SCAN OR INPUT CARD ID */}
      {screen === 'scan' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8 self-start">
            <img
              src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
              alt="PPU Logo"
              className="w-16 h-16 object-contain"
            />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight text-center self-start mb-1 font-sans">
            {isGtkMode ? 'Bilik Guru & Tenaga Kependidikan' : 'Verifikasi'}
          </h1>
          <p className="text-xs text-slate-400 self-start mb-6">
            {isGtkMode 
              ? 'Silakan cari nama Anda pada daftar Guru dan Tenaga Kependidikan di bawah untuk memvalidasi identitas Anda.' 
              : 'Silakan masukkan Card ID secara manual atau scan QR Code yang ada di Voters Card'}
          </p>

          {!isGtkMode ? (
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
            </div>
          ) : (
            <div className="w-full space-y-4 mb-4">
              <div className="relative">
                <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                  Cari Nama Anda
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama Anda di sini..."
                    value={gtkSearchQuery}
                    onChange={(e) => {
                      setGtkSearchQuery(e.target.value);
                      setSelectedGtkId(''); // Reset selection on change
                    }}
                    className="w-full px-4 py-3 bg-[#1c2030] border-2 border-[#2a3050] focus:border-indigo-500 rounded-xl outline-none text-white text-sm transition-all placeholder:text-slate-500 font-semibold"
                  />
                  {gtkSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setGtkSearchQuery('');
                        setSelectedGtkId('');
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold bg-[#1c2030]/80 px-2 py-1 rounded"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </div>

              {/* List of matched GTK profiles */}
              <div className="bg-[#151821]/90 border border-[#2a3050] rounded-2xl p-2 max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar">
                {gtkProfiles.filter(p => 
                  !gtkSearchQuery || p.full_name.toLowerCase().includes(gtkSearchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-medium">
                    Tidak ada nama yang cocok dengan pencarian Anda.
                  </div>
                ) : (
                  gtkProfiles.filter(p => 
                    !gtkSearchQuery || p.full_name.toLowerCase().includes(gtkSearchQuery.toLowerCase())
                  ).map(p => {
                    const isVoted = p.voting_status === 'sudah';
                    const isSelected = selectedGtkId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={isVoted}
                        onClick={() => {
                          setSelectedGtkId(p.id);
                          setGtkSearchQuery(p.full_name);
                        }}
                        className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                          isSelected 
                            ? 'bg-indigo-600/20 border-2 border-indigo-500 text-white' 
                            : isVoted 
                              ? 'opacity-40 cursor-not-allowed bg-black/10 text-slate-500 border border-transparent' 
                              : 'bg-transparent border border-transparent hover:bg-[#1c2030] text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold truncate text-white">{p.full_name}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Sektor Guru & Tenaga Kependidikan</p>
                        </div>
                        <div>
                          {isVoted ? (
                            <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                              Sudah Memilih
                            </span>
                          ) : isSelected ? (
                            <span className="text-[9px] bg-indigo-500 text-white px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-md shadow-indigo-600/20">
                              Terpilih
                            </span>
                          ) : (
                            <span className="text-[9px] bg-[#1c2030] hover:bg-[#252b42] text-slate-400 border border-[#2a3050] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider transition-all">
                              Pilih
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!isGtkMode && (
            <>
              <div className="w-full flex items-center gap-4 my-3 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span className="h-px bg-[#2a3050] flex-1"></span>
                atau scan qr code
                <span className="h-px bg-[#2a3050] flex-1"></span>
              </div>

              <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl overflow-hidden shadow-2xl relative mb-4">
                <div id="qr-reader-container" className="w-full h-[180px] sm:h-[200px] relative bg-black/40 flex flex-col items-center justify-center overflow-hidden">
                  {!isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-default bg-black/80 p-4 text-center">
                      <Camera className="w-12 h-12 mb-2 text-slate-500" />
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Kamera tidak tersedia
                      </span>
                    </div>
                  )}

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

                <div className="flex gap-2 p-3 bg-[#1c2030] border-t border-[#2a3050] justify-center items-center">
                  <button 
                    disabled={true}
                    className="w-full py-2 bg-[#2a3050] text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5" /> Kamera Nonaktif
                  </button>
                </div>
              </div>
            </>
          )}

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

          <button 
            onClick={() => isGtkMode ? handleVerifyGtkVoter(selectedGtkId) : handleVerifyCardId(cardIdInput)}
            disabled={searchLoading || (isGtkMode ? !selectedGtkId : !cardIdInput.trim())}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#2a3050] disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {searchLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Sedang Memproses...
              </>
            ) : (
              <>
                {isGtkMode ? 'Validasi Identitas GTK' : 'Lanjutkan Verifikasi'} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </main>
      )}

      {/* SCREEN 1.1: GELOMBANG VOTING ACTIVE MATCH */}
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
              onClick={handleCancelVotingFlow}
              className="w-full py-3.5 bg-[#1c2030] hover:bg-[#232840] text-slate-400 hover:text-white border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              ← Batal
            </button>
          </div>
        </main>
      )}

      {/* SCREEN 1.2: GELOMBANG VOTING BLOCKED */}
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
            onClick={handleCancelVotingFlow}
            className="w-full py-4 bg-[#1c2030] hover:bg-[#232840] text-slate-200 border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            ← Kembali ke Layar Awal
          </button>
        </main>
      )}

      {/* SCREEN 2: VOTER PROFILE CONFIRMATION */}
      {screen === 'profile' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto">
          {searchLoading ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-xs text-slate-400">Sedang menyinkronkan data pemilih...</p>
            </div>
          ) : voter ? (
            <>
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
                {isGtkMode 
                  ? 'Berikut ini adalah data Guru dan Tenaga Kependidikan sesuai dengan identitas asli Anda.' 
                  : 'Berikut ini adalah data siswa sesuai dengan identitas asli Anda.'}
              </p>

              <div className="w-full bg-[#151821] border border-[#2a3050] rounded-2xl p-6 shadow-2xl relative mb-6 overflow-hidden">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl"></div>

                <div className="flex items-center gap-4 mb-6 relative">
                  <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-500/5">
                    <User className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-white text-lg truncate leading-tight">{voter.full_name}</h3>
                    {!isGtkMode && (
                      <span className="text-xs text-slate-500 font-mono tracking-wide">{voter.card_id}</span>
                    )}
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

              <div className="w-full space-y-3">
                {voter.account_status === 'dikonfirmasi' && voter.voting_status !== 'sudah' && !isVoterAllCompleted && (
                  <button 
                    onClick={proceedToCategories}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-600/10 flex items-center justify-center gap-2 group cursor-pointer"
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
                  onClick={handleCancelVotingFlow}
                  className="w-full py-3.5 bg-[#1c2030] hover:bg-[#232840] text-slate-400 hover:text-white border border-[#2a3050] rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  ← Batal & Keluar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertTriangle className="w-10 h-10 text-rose-500" />
              <p className="text-xs text-rose-400 font-semibold">{errorMessage || 'Gagal memuat profil pemilih.'}</p>
              <button 
                onClick={handleCancelVotingFlow}
                className="py-2.5 px-6 bg-[#1c2030] hover:bg-[#232840] border border-[#2a3050] text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Kembali
              </button>
            </div>
          )}
        </main>
      )}

      {/* SCREEN 3: CATEGORY SELECTION LIST */}
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
              onClick={handleFinalFinish}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Selesai & Keluar Sesi'
              )}
            </button>
          </main>
        ) : (
          <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
                      alt="PPU Logo"
                      className="w-16 h-16 object-contain"
                    />
                  </div>

                  <div className="bg-[#121620]/80 backdrop-blur-md border border-[#2a3050] px-4 py-2.5 rounded-2xl text-right shrink-0 shadow-lg shadow-black/20 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pemilih Aktif</div>
                      <div className="text-white font-extrabold text-sm truncate max-w-[150px]">{isGtkMode ? 'Pemilih Anonymous' : voter.full_name}</div>
                    </div>
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Pilih <span className="text-sky-400 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">Kategori</span> <span className="text-purple-400 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Pemilu</span>
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                  Anda harus menyelesaikan seluruh kategori pemungutan suara di bawah ini. Setelah seluruh kategori selesai dipilih, hasil akhir akan dikirim secara kolektif ke sistem.
                </p>
              </div>

              {/* ILLUSTRATION */}
              <div className="hidden md:flex flex-1 justify-end items-center relative h-56 max-w-xs ml-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
                <motion.div 
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-56 h-52"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_10px_30px_rgba(99,102,241,0.25)]">
                    {/* Orbital circles */}
                    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="1" />
                    
                    <defs>
                      <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#3730a3" />
                      </linearGradient>
                      <linearGradient id="lidGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                      <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                      </linearGradient>
                    </defs>

                    {/* Sparkles (Stars) */}
                    <path d="M 35 45 L 37 40 L 42 38 L 37 36 L 35 31 L 33 36 L 28 38 L 33 40 Z" fill="url(#starGrad)" className="opacity-80" />
                    <path d="M 165 145 L 166 141 L 170 140 L 166 139 L 165 135 L 164 139 L 160 140 L 164 141 Z" fill="url(#starGrad)" className="opacity-90" />
                    <path d="M 170 45 L 172 40 L 177 38 L 172 36 L 170 31 L 168 36 L 163 38 L 168 40 Z" fill="#818cf8" className="opacity-75" />

                    {/* 3D Ballot Box */}
                    <path d="M 60 100 L 140 100 L 140 160 L 60 160 Z" fill="url(#boxGrad)" />
                    <path d="M 60 100 L 100 100 L 100 160 L 60 160 Z" fill="black" fillOpacity="0.1" />
                    
                    {/* Top Lid */}
                    <path d="M 50 100 L 150 100 L 150 90 L 50 90 Z" fill="url(#lidGrad)" rx="2" />
                    
                    {/* Slot on Lid */}
                    <rect x="80" y="93" width="40" height="4" rx="2" fill="#1e1b4b" />

                    {/* Ballot Paper entering slot */}
                    <g transform="translate(0, -10)">
                      <path d="M 85 55 L 115 55 L 115 93 L 85 93 Z" fill="url(#paperGrad)" rx="2" />
                      <line x1="90" y1="65" x2="110" y2="65" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="90" y1="73" x2="105" y2="73" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="100" cy="80" r="6" fill="url(#checkGrad)" />
                      <path d="M 97 80 L 99 82 L 103 78" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    
                    {/* Front Panel details */}
                    <rect x="80" y="115" width="40" height="30" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                    <line x1="88" y1="124" x2="112" y2="124" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="88" y1="131" x2="105" y2="131" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                    <line x1="88" y1="138" x2="110" y2="138" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Kemajuan Pemilihan Card */}
            <div className="bg-[#121620]/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-6 mb-8 shadow-2xl shadow-black/40">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kemajuan Pemilihan</span>
                </div>
                <span className="text-sm font-black text-indigo-400 font-mono tracking-wider">
                  <span className="text-lg text-indigo-300">{completedCategories}</span> / {totalCategories} Selesai
                </span>
              </div>
              
              <div className="w-full h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-[2px]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentComplete}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative"
                >
                  <div className="absolute inset-y-0 right-0 w-8 h-full bg-white/20 blur-[1px] animate-pulse"></div>
                </motion.div>
              </div>
            </div>

            {/* Kategori Tersedia Section Title */}
            <div className="mb-6 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-[4px] h-5 bg-indigo-500 rounded-full"></span>
                <h2 className="text-lg font-extrabold text-white">Kategori Tersedia</h2>
              </div>
              <p className="text-xs text-slate-400">Pilih kategori di bawah untuk memulai proses pemungutan suara.</p>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {categories.map((cat) => {
                const voted = !!votedCategories[cat.id];
                const { gradient, desc, icon } = getCategoryDetails(cat.id, cat.name, cat.type);
                
                return (
                  <motion.div 
                    key={cat.id}
                    whileHover={{ y: -6, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openCategory(cat.id)}
                    className={`flex flex-col bg-white rounded-3xl overflow-hidden shadow-xl shadow-indigo-950/10 border border-slate-100 transition-all cursor-pointer ${
                      voted ? 'ring-2 ring-emerald-500/30 animate-pulse' : 'hover:shadow-2xl hover:shadow-indigo-500/10'
                    }`}
                  >
                    {/* Card Header (Gradient Area) */}
                    <div className={`relative h-44 bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10"></div>
                      <div className="absolute top-0 left-0 w-full h-full opacity-25 mix-blend-overlay">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <circle cx="20" cy="20" r="15" fill="white" />
                          <circle cx="80" cy="70" r="25" fill="white" />
                        </svg>
                      </div>
                      
                      {/* Decorative Floating Sparkles */}
                      <div className="absolute inset-0 pointer-events-none">
                        <span className="absolute top-6 left-12 text-sm opacity-30 text-white animate-pulse">✦</span>
                        <span className="absolute bottom-8 right-16 text-xs opacity-40 text-white animate-pulse">✦</span>
                        <span className="absolute top-12 right-12 text-lg opacity-25 text-white animate-pulse">✦</span>
                      </div>

                      {/* Floating Glass Container for the Icon */}
                      <div className="relative z-10 w-24 h-24 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-700/50 flex items-center justify-center shadow-2xl shadow-black/40">
                        {voted ? (
                          <div className="relative flex items-center justify-center">
                            <div className="absolute -inset-1 bg-emerald-500/30 blur-md rounded-full animate-pulse"></div>
                            <Check className="w-10 h-10 text-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" strokeWidth={3} />
                          </div>
                        ) : (
                          icon
                        )}
                      </div>
                    </div>

                    {/* Card Body (White Background) */}
                    <div className="p-6 flex-1 flex flex-col text-center">
                      <h3 className="font-extrabold text-[#0B1220] text-xl tracking-tight leading-snug mb-2">
                        {cat.name}
                      </h3>
                      
                      {/* Badge Status */}
                      <div className="mb-4">
                        {voted ? (
                          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Sudah Memilih
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-4.5 py-1.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            Belum Memilih
                          </span>
                        )}
                      </div>

                      <p className="text-slate-500 text-xs leading-relaxed max-w-[280px] mx-auto mb-6 flex-1">
                        {desc}
                      </p>

                      {/* Custom Button inside Card */}
                      <div 
                        className={`w-full py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-between border ${
                          voted 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/70' 
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-indigo-600 hover:border-indigo-500 hover:text-indigo-700'
                        }`}
                      >
                        <span className="mx-auto flex items-center gap-2">
                          {voted ? 'Lihat Pilihan' : 'Pilih Kategori'}
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Bottom Actions Area */}
            <div className="mt-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleCancelVotingFlow}
                disabled={isSubmitting || completedCategories > 0}
                title={completedCategories > 0 ? 'Voting tidak dapat dibatalkan karena Anda telah memilih minimal 1 kategori' : undefined}
                className="py-4 px-6 bg-red-950/40 hover:bg-red-950/70 border border-red-500/20 text-red-400 hover:text-red-300 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-black/20 cursor-pointer disabled:bg-slate-900/40 disabled:border-slate-800/60 disabled:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Batalkan Voting</span>
              </button>

              {allCompleted ? (
                <div className="flex-1 py-4.5 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span>Pemilihan Selesai — Memproses Finalisasi Otomatis...</span>
                </div>
              ) : (
                <div className="flex-1 py-4.5 bg-[#0c1411] border border-slate-800/60 text-slate-400 font-semibold text-xs md:text-sm rounded-2xl flex items-center justify-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  <span>Silakan selesaikan seluruh kategori ({completedCategories}/{totalCategories}) untuk finalisasi</span>
                </div>
              )}
            </div>

            {/* Information Card at the very bottom */}
            <div className="w-full bg-[#11131c] border border-slate-800/60 p-4 rounded-2xl flex items-start sm:items-center gap-3 mt-6">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Pastikan Anda telah memilih semua kategori sebelum mengirim suara akhir.
              </p>
            </div>
          </main>
        )
      )}

      {/* SCREEN 4: CANDIDATES SELECTION GRID */}
      {screen === 'candidates' && voter && selectedCatId && (() => {
        const activeCat = categories.find(c => c.id === selectedCatId);
        const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';
        const voterDapil = isSelectedCatMpk 
          ? dapils.find(d => d.eligible_classes.includes(voter.class)) 
          : null;

        return (
          <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-8 flex flex-col justify-start">
            {/* Top Bar with Back Button and Active Voter info */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-8 gap-4">
              <button 
                onClick={() => triggerBack('categories')}
                className="flex items-center justify-center gap-2 text-xs font-extrabold text-slate-300 hover:text-white bg-[#121620]/80 backdrop-blur-md border border-slate-800/80 hover:border-slate-700/80 px-5 py-3 rounded-full cursor-pointer shadow-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-400" /> Kembali ke Kategori Pemilu
              </button>

              <div className="bg-[#121620]/80 backdrop-blur-md border border-[#2a3050] px-4 py-2.5 rounded-2xl text-right shrink-0 shadow-lg shadow-black/20 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pemilih Aktif</div>
                  <div className="text-white font-extrabold text-sm truncate max-w-[150px]">{isGtkMode ? 'Pemilih Anonymous' : voter.full_name}</div>
                </div>
              </div>
            </div>

            {/* HERO SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-gradient-to-br from-[#131724]/90 via-[#191e30]/80 to-[#1e1b4b]/20 border border-slate-800/60 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xl shadow-indigo-950/20">
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <div className="flex-1 space-y-4 relative z-10 text-left">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Kategori: {activeCat?.name}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                  {(() => {
                    const catName = activeCat?.name || '';
                    const catId = activeCat?.id || '';
                    const nid = catId.toLowerCase();
                    const nname = catName.toLowerCase();
                    if (nid.includes('osis') || nname.includes('osis')) {
                      return "Pilih Calon Ketua dan Wakil Ketua OSIS";
                    } else if (nid.includes('mpk') || nname.includes('mpk') || activeCat?.type === 'mpk_smaba') {
                      return "Pilih Calon Anggota MPK";
                    } else if (nid.includes('duta') || nname.includes('duta')) {
                      return "Pilih Calon Duta Sekolah";
                    } else if (nid.includes('ekskul') || nname.includes('ekskul') || nname.includes('ekstrakurikuler')) {
                      return "Pilih Calon Ketua Ekstrakurikuler";
                    }
                    return `Pilih Calon ${catName}`;
                  })()}
                </h1>
                
                <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl font-medium">
                  Tentukan pilihan Anda dengan cermat. Setelah suara dikirim, pilihan tidak dapat diubah kembali.
                </p>
              </div>

              {/* ILLUSTRATION */}
              <div className="hidden md:flex justify-end items-center relative h-40 w-40 shrink-0 ml-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/10 blur-2xl rounded-full"></div>
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-full h-full"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow-[0_10px_20px_rgba(99,102,241,0.2)]">
                    {/* Orbital circles */}
                    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                    
                    <defs>
                      <linearGradient id="boxGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#3730a3" />
                      </linearGradient>
                      <linearGradient id="lidGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                      <linearGradient id="checkGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="starGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="paperGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                      </linearGradient>
                    </defs>

                    {/* Sparkles (Stars) */}
                    <path d="M 35 45 L 37 40 L 42 38 L 37 36 L 35 31 L 33 36 L 28 38 L 33 40 Z" fill="url(#starGrad2)" className="opacity-80" />
                    <path d="M 165 145 L 166 141 L 170 140 L 166 139 L 165 135 L 164 139 L 160 140 L 164 141 Z" fill="url(#starGrad2)" className="opacity-90" />

                    {/* 3D Ballot Box */}
                    <path d="M 60 100 L 140 100 L 140 160 L 60 160 Z" fill="url(#boxGrad2)" />
                    <path d="M 60 100 L 100 100 L 100 160 L 60 160 Z" fill="black" fillOpacity="0.1" />
                    
                    {/* Top Lid */}
                    <path d="M 50 100 L 150 100 L 150 90 L 50 90 Z" fill="url(#lidGrad2)" rx="2" />
                    
                    {/* Slot on Lid */}
                    <rect x="80" y="93" width="40" height="4" rx="2" fill="#1e1b4b" />

                    {/* Ballot Paper entering slot */}
                    <g transform="translate(0, -10)">
                      <path d="M 85 55 L 115 55 L 115 93 L 85 93 Z" fill="url(#paperGrad2)" rx="2" />
                      <line x1="90" y1="65" x2="110" y2="65" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                      <line x1="90" y1="73" x2="105" y2="73" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="100" cy="80" r="6" fill="url(#checkGrad2)" />
                      <path d="M 97 80 L 99 82 L 103 78" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  </svg>
                </motion.div>
              </div>
            </div>

            {isSelectedCatMpk && !voterDapil && !isFreeVote ? (
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
                {isSelectedCatMpk && voterDapil && !isFreeVote && (
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

                {isSelectedCatMpk && isFreeVote && (
                  <div className="w-full bg-[#151821] border border-indigo-500/30 p-6 rounded-3xl text-sm flex gap-4 text-indigo-300 leading-relaxed mb-8 items-start shadow-2xl shadow-indigo-500/5 transition-all">
                    <div className="bg-indigo-500/20 p-3 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 shrink-0 text-indigo-400" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-black text-white text-base tracking-tight">Daerah Pemilihan MPK (Mandiri)</p>
                      <p className="text-white/80 font-medium text-xs sm:text-sm">
                        Anda sedang berada dalam mode Bilik Suara Mandiri. Seluruh pilihan perwakilan kelas MPK ditampilkan secara lengkap.
                      </p>
                      <p className="text-indigo-400/70 text-xs sm:text-sm font-medium">
                        Silakan pilih 1 perwakilan pada setiap kelas di bawah ini dengan menekan gambar salah satu kandidat.
                      </p>
                    </div>
                  </div>
                )}

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
                    const currentClassIndex = Math.min(activeMpkClassIndex, Math.max(0, classesWithCandidates.length - 1));
                    const currentClass = classesWithCandidates[currentClassIndex];
                    const clsCands = grouped[currentClass] ? grouped[currentClass].sort((a, b) => a.number - b.number) : [];
                    const chosenCandId = selectedMpkVotes[currentClass];

                    const slideVariants = {
                      enter: (direction: 'left' | 'right') => ({
                        x: direction === 'right' ? 80 : -80,
                        opacity: 0
                      }),
                      center: {
                        x: 0,
                        opacity: 1
                      },
                      exit: (direction: 'left' | 'right') => ({
                        x: direction === 'right' ? -80 : 80,
                        opacity: 0
                      })
                    };

                    return (
                      <div className="flex-1 flex flex-col pb-12">
                        {/* Class Selector Bar */}
                        <div className="flex items-center justify-between bg-[#151821]/80 backdrop-blur-md border border-[#2a3050] rounded-3xl p-6 shadow-xl mb-8 text-left">
                          {/* Left Button '<' */}
                          <button
                            type="button"
                            onClick={() => {
                              if (currentClassIndex > 0) {
                                setSlideDirection('left');
                                setActiveMpkClassIndex(currentClassIndex - 1);
                              }
                            }}
                            disabled={currentClassIndex === 0}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                              currentClassIndex === 0
                                ? 'bg-[#12141c] border-[#1d2235] text-slate-600 cursor-not-allowed opacity-50'
                                : 'bg-[#1c2030] hover:bg-[#252a42] border-[#2a3050] text-slate-200 hover:text-indigo-400 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>

                          {/* Class Header */}
                          <div className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono block mb-1">
                              Calon Perwakilan MPK
                            </span>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                              Kelas {currentClass}
                            </h2>
                          </div>

                          {/* Right Button '>' */}
                          <button
                            type="button"
                            onClick={() => {
                              if (currentClassIndex < classesWithCandidates.length - 1) {
                                setSlideDirection('right');
                                setActiveMpkClassIndex(currentClassIndex + 1);
                              }
                            }}
                            disabled={currentClassIndex === classesWithCandidates.length - 1}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${
                              currentClassIndex === classesWithCandidates.length - 1
                                ? 'bg-[#12141c] border-[#1d2235] text-slate-600 cursor-not-allowed opacity-50'
                                : 'bg-[#1c2030] hover:bg-[#252a42] border-[#2a3050] text-slate-200 hover:text-indigo-400 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Slide animation container for active class candidates */}
                        <div className="relative overflow-hidden w-full flex-1 min-h-[400px]">
                          <AnimatePresence mode="wait" custom={slideDirection}>
                            <motion.div
                              key={currentClass}
                              custom={slideDirection}
                              variants={slideVariants}
                              initial="enter"
                              animate="center"
                              exit="exit"
                              transition={{ duration: 0.25, ease: 'easeInOut' }}
                              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch w-full h-full pb-20"
                            >
                              {clsCands.map(cand => {
                                const isSelected = chosenCandId === cand.id;

                                return (
                                  <motion.div 
                                    key={cand.id}
                                    whileHover={{ y: -6, scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => {
                                      setSelectedMpkVotes(prev => ({
                                        ...prev,
                                        [currentClass]: cand.id
                                      }));
                                    }}
                                    className={`bg-white rounded-3xl overflow-hidden shadow-xl border-2 flex flex-col h-full group transition-all duration-300 cursor-pointer ${
                                      isSelected 
                                        ? 'border-indigo-600 ring-4 ring-indigo-600/15 shadow-indigo-600/10' 
                                        : 'border-slate-100 hover:border-indigo-500/30'
                                    }`}
                                  >
                                    {/* Header Gradient + Photo Area */}
                                    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-indigo-50 to-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border-b border-slate-100">
                                      {cand.photo_url ? (
                                        <img 
                                          src={cand.photo_url} 
                                          alt={cand.chairman} 
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50/50 to-slate-100">
                                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pasfoto Kandidat</span>
                                        </div>
                                      )}
                                      
                                      {/* Nomor Paslon Badge */}
                                      <div className={`absolute left-4 top-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                                        isSelected ? 'bg-indigo-600 shadow-indigo-600/25' : 'bg-slate-800'
                                      }`}>
                                        KANDIDAT {String(cand.number).padStart(2, '0')}
                                      </div>

                                      {/* Selection Check Badge */}
                                      <div className="absolute right-4 top-4">
                                        {isSelected ? (
                                          <motion.div 
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="px-3 py-1.5 bg-indigo-600 border border-indigo-400 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30"
                                          >
                                            Dipilih
                                          </motion.div>
                                        ) : (
                                          <div className="w-6 h-6 rounded-full border-2 border-slate-300/80 bg-white/40 backdrop-blur-md flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card Content Area (White background) */}
                                    <div className="p-6 flex-1 flex flex-col justify-between text-left">
                                      <div className="flex-1 flex flex-col justify-between">
                                        <div className="space-y-3 mb-5">
                                          <div>
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Ketua / Perwakilan</span>
                                            <span className="font-black text-slate-800 text-lg leading-tight block">
                                              {cand.chairman}
                                            </span>
                                          </div>
                                          {cand.vice && (
                                            <div>
                                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Wakil Ketua</span>
                                              <span className="font-extrabold text-slate-700 text-sm sm:text-base leading-tight block">
                                                {cand.vice}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Visi preview - Plain Document Style */}
                                        {cand.visi && cand.visi.trim() !== '' && (
                                          <div className="mb-4 text-left">
                                            <span className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 font-mono">VISI</span>
                                            <p className="text-slate-600 text-xs font-normal leading-relaxed text-justify">
                                              "{cand.visi}"
                                            </p>
                                          </div>
                                        )}

                                        {/* Misi preview - Plain Document Style */}
                                        {cand.misi && cand.misi.length > 0 && (
                                          <div className="mb-6 text-left">
                                            <span className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 font-mono">MISI</span>
                                            <ul className="space-y-1 text-left">
                                              {cand.misi.slice(0, 3).map((m, mIdx) => (
                                                <li key={mIdx} className="text-slate-600 text-xs font-normal leading-relaxed flex gap-2 items-start text-justify">
                                                  <span className="text-slate-400 shrink-0 select-none">•</span>
                                                  <span>{m}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Sticky Bottom Action Bar */}
                        <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-[#090b11]/90 backdrop-blur-2xl border-t border-slate-800/60 z-[50] shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
                          <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 self-start sm:self-auto">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-indigo-400" />
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Progres Pilihan MPK</div>
                                <p className="text-xs sm:text-sm font-bold text-white">
                                  {Object.keys(selectedMpkVotes).length} dari {classesWithCandidates.length} Kelas Dipilih
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (isAllSelected) {
                                  setShowModal1(true);
                                }
                              }}
                              disabled={!isAllSelected || isSubmitting}
                              className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-black tracking-wider shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
                                isAllSelected
                                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20 active:scale-95 duration-150'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                              }`}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                                </>
                              ) : (
                                <>
                                  Kirim Pilihan MPK <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {!isAllSelected && (
                          <div className="w-full max-w-lg mx-auto bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-center">
                            <p className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5">
                              ⚠️ Anda wajib menentukan tepat satu perwakilan pada setiap kelompok kelas untuk menyimpan pilihan MPK.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
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
                    <div className="flex-1 flex flex-col pb-24 text-left">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 items-stretch">
                        {candidates.map((cand) => {
                          const isSelected = selectedCandidate?.id === cand.id;
                          return (
                            <motion.div 
                              key={cand.id}
                              whileHover={{ y: -6, scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => setSelectedCandidate(cand)}
                              className={`bg-white rounded-3xl overflow-hidden shadow-xl border-2 flex flex-col h-full group transition-all duration-300 cursor-pointer ${
                                isSelected 
                                  ? 'border-indigo-600 ring-4 ring-indigo-600/15 shadow-indigo-600/10' 
                                  : 'border-slate-100 hover:border-indigo-500/30'
                              }`}
                            >
                              {/* Header Gradient + Photo Area */}
                              <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-indigo-50 to-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border-b border-slate-100">
                                {cand.photo_url ? (
                                  <img 
                                    src={cand.photo_url} 
                                    alt={cand.chairman} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50/50 to-slate-100">
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pasfoto Kandidat</span>
                                  </div>
                                )}
                                
                                {/* Nomor Paslon Badge */}
                                <div className={`absolute left-4 top-4 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                                  isSelected ? 'bg-indigo-600 shadow-indigo-600/25' : 'bg-slate-800'
                                }`}>
                                  PASLON {String(cand.number).padStart(2, '0')}
                                </div>

                                {/* Selection Check Badge */}
                                <div className="absolute right-4 top-4">
                                  {isSelected ? (
                                    <motion.div 
                                      initial={{ scale: 0, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="px-3 py-1.5 bg-indigo-600 border border-indigo-400 text-white font-extrabold text-[10px] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30"
                                    >
                                      Dipilih
                                    </motion.div>
                                  ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-slate-300/80 bg-white/40 backdrop-blur-md flex items-center justify-center">
                                      <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Card Content Area (White background) */}
                              <div className="p-6 flex-1 flex flex-col justify-between text-left">
                                <div className="flex-1 flex flex-col justify-between">
                                  <div className="space-y-3 mb-5">
                                    <div>
                                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Ketua</span>
                                      <span className="font-black text-slate-800 text-lg leading-tight block">
                                        {cand.chairman}
                                      </span>
                                    </div>
                                    {cand.vice && (
                                      <div>
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Wakil Ketua</span>
                                        <span className="font-extrabold text-slate-700 text-sm sm:text-base leading-tight block">
                                          {cand.vice}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Visi preview - Plain Document Style */}
                                  {cand.visi && cand.visi.trim() !== '' && (
                                    <div className="mb-4 text-left">
                                      <span className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 font-mono">VISI</span>
                                      <p className="text-slate-600 text-xs font-normal leading-relaxed text-justify">
                                        "{cand.visi}"
                                      </p>
                                    </div>
                                  )}

                                  {/* Misi preview - Plain Document Style */}
                                  {cand.misi && cand.misi.length > 0 && (
                                    <div className="mb-6 text-left">
                                      <span className="block text-[11px] font-extrabold text-slate-800 uppercase tracking-wider mb-1 font-mono">MISI</span>
                                      <ul className="space-y-1 text-left">
                                        {cand.misi.slice(0, 3).map((m, mIdx) => (
                                          <li key={mIdx} className="text-slate-600 text-xs font-normal leading-relaxed flex gap-2 items-start text-justify">
                                            <span className="text-slate-400 shrink-0 select-none">•</span>
                                            <span>{m}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Sticky Bottom Action Bar */}
                      <div className="sticky bottom-0 left-0 right-0 p-4 md:p-6 bg-[#090b11]/90 backdrop-blur-2xl border-t border-slate-800/60 z-[50] shadow-[0_-15px_40px_rgba(0,0,0,0.5)]">
                        <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Info Paslon Terpilih */}
                          <div className="flex items-center gap-4 text-left self-start sm:self-auto">
                            {selectedCandidate ? (
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                  <span className="text-lg font-black text-indigo-400">
                                    {String(selectedCandidate.number).padStart(2, '0')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paslon Terpilih</div>
                                  <h4 className="font-extrabold text-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-[300px]">
                                    {selectedCandidate.chairman}
                                  </h4>
                                  {selectedCandidate.vice && (
                                    <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-[300px] italic">
                                      & {selectedCandidate.vice}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                                  <HelpCircle className="w-6 h-6 text-slate-500" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paslon Terpilih</div>
                                  <p className="text-xs font-bold text-slate-400">Belum ada pilihan</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => {
                              if (selectedCandidate) {
                                setShowModal1(true);
                              }
                            }}
                            disabled={!selectedCandidate || isSubmitting}
                            className={`w-full sm:w-auto px-10 py-4 rounded-2xl text-sm font-black tracking-wider shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer ${
                              selectedCandidate
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/20 active:scale-95 duration-150'
                                : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                            }`}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                              </>
                            ) : (
                              <>
                                Kirim Pilihan <ArrowRight className="w-4 h-4" />
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

      {/* SCREEN 5: INTERSTITIAL VOTE REGISTERED (COUNTDOWN) */}
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

      {/* SCREEN 6: FULLSCREEN FINAL THANK YOU COUNTDOWN */}
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

      {/* SCREEN 7: AUTOMATIC FINALIZATION TRANSITION (10s COUNTDOWN) */}
      {screen === 'auto_finalize' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto text-center my-auto">
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black tracking-widest uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            PEMILIHAN SELESAI
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
            PEMILIHAN SELESAI
          </h1>

          <p className="text-sm sm:text-base text-slate-200 font-semibold max-w-md leading-relaxed mb-1">
            Seluruh kategori pemilihan telah berhasil Anda lakukan.
          </p>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-8">
            Anda akan diarahkan untuk menyelesaikan proses pemilihan...
          </p>

          {/* 10-Second Countdown Display */}
          <div className="w-28 h-28 rounded-3xl border-2 border-indigo-500/80 bg-[#121620] flex flex-col items-center justify-center shadow-2xl shadow-indigo-500/20 mb-8 relative">
            <span className="text-4xl font-black text-white font-mono">{countdown}</span>
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Detik</span>
          </div>

          <button
            onClick={() => {
              clearCountdown();
              if (isFreeVote) {
                handleFinalFinishFreeVote(votedCategories);
              } else {
                handleFinalFinish();
              }
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-black rounded-2xl shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Memproses Finalisasi...
              </>
            ) : (
              <>
                <span>Selesaikan Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </main>
      )}

      {/* MODAL 1: CANDIDATE CHOICE RE-CONFIRMATION */}
      {showModal1 && (() => {
        const activeCat = categories.find(c => c.id === selectedCatId);
        const isSelectedCatMpk = activeCat?.type === 'mpk_smaba';

        if (!isSelectedCatMpk && !selectedCandidate) return null;

        return (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 text-left select-none animate-fade-in">
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

      {/* MODAL 2: ABSOLUTE COMMIT WARNING */}
      {showModal2 && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#151821] border border-red-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in">
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
                className="flex-1 py-3 bg-[#1c2030] hover:bg-[#232840] border border-[#2a3050] text-slate-400 hover:text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ← Kembali
              </button>
              <button 
                onClick={confirmVoteSubmit}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/10 cursor-pointer"
              >
                Kirim Suara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ENFORCEMENT OVERLAY */}
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

      {/* FALLSCREEN MANUAL CORNER FALLBACK BUTTON */}
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
