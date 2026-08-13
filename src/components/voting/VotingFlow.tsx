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
  AlertCircle,
  LogOut, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
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
import { M3ExpressiveLoadingIndicator } from '../ui/M3ExpressiveLoadingIndicator';
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
  searchProfilesByClassAndQuery
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
  isStudentMode?: boolean;
}


export default function VotingFlow({ voteMode, initialVoterCardId, onComplete, onCancel, isGtkMode = false, isStudentMode = false }: VotingFlowProps) {
  const navigate = useNavigate();

  const [accessSettings, setAccessSettings] = useState<UserAccessSettings | null>(null);

  // Screen state: 'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir' | 'auto_finalize'
  const [screen, setScreen] = useState<'scan' | 'profile' | 'categories' | 'candidates' | 'success' | 'thankyou' | 'forbidden' | 'gelombang_aktif' | 'gelombang_blokir' | 'auto_finalize'>(
    voteMode === 'booth' ? 'profile' : 'scan'
  );

  // Input states
  const [cardIdInput, setCardIdInput] = useState(initialVoterCardId || '');
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

  // Pin / Coblos Animation state
  const [animatingCandId, setAnimatingCandId] = useState<string | null>(null);
  const animTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCoblosAnimation = (candId: string) => {
    setAnimatingCandId(candId);
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
    }
    animTimeoutRef.current = setTimeout(() => {
      setAnimatingCandId(null);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) {
        clearTimeout(animTimeoutRef.current);
      }
    };
  }, []);

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

  // Protection Modal for Bilik Default
  const [showBilikDefaultModal, setShowBilikDefaultModal] = useState<boolean>(false);
  const [bilikCodeInput, setBilikCodeInput] = useState<string>('');
  const [bilikCodeError, setBilikCodeError] = useState<string | null>(null);

  const handleOpenBilikDefaultModal = () => {
    setBilikCodeInput('');
    setBilikCodeError(null);
    setShowBilikDefaultModal(true);
  };

  const handleVerifyBilikCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (bilikCodeInput.trim() === '2026') {
      setShowBilikDefaultModal(false);
      setBilikCodeInput('');
      setBilikCodeError(null);
      navigate('/bilik');
    } else {
      setBilikCodeError('Kode salah. Aksi dibatalkan.');
    }
  };

  // Student Mode States
  const [studentProfiles, setStudentProfiles] = useState<Profile[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dapilClasses, setDapilClasses] = useState<string[]>([]);
  const [classDropdownOpen, setClassDropdownOpen] = useState<boolean>(false);

  const STUDENT_CLASSES = [
    ...Array.from({ length: 12 }, (_, i) => `X-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `XI-${i + 1}`),
    ...Array.from({ length: 12 }, (_, i) => `XII-${i + 1}`),
  ];

  useEffect(() => {
    if (isStudentMode) {
      getDapils().then(dList => {
        if (dList && dList.length > 0) {
          const classesFromDapils = Array.from(
            new Set(dList.flatMap(d => d.eligible_classes || []))
          ).filter(c => c && !c.toUpperCase().includes('GTK') && !c.toUpperCase().includes('GURU'));
          if (classesFromDapils.length > 0) {
            setDapilClasses(classesFromDapils);
          }
        }
      }).catch(err => console.error('Error loading dapil classes:', err));
    }
  }, [isStudentMode]);

  const classOptions = dapilClasses.length > 0 ? dapilClasses : STUDENT_CLASSES;
  const studentColX = classOptions.filter(c => c.startsWith('X-'));
  const studentColXI = classOptions.filter(c => c.startsWith('XI-'));
  const studentColXII = classOptions.filter(c => c.startsWith('XII-'));
  const studentColOther = classOptions.filter(c => !c.startsWith('X-') && !c.startsWith('XI-') && !c.startsWith('XII-') && !c.toUpperCase().includes('GTK') && !c.toUpperCase().includes('GURU'));

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

  useEffect(() => {
    const searchStudents = async () => {
      if (!isStudentMode || !selectedClass || studentSearchQuery.length < 2) {
        setStudentProfiles([]);
        return;
      }

      setSearchLoading(true);
      try {
        const profiles = await searchProfilesByClassAndQuery(selectedClass, studentSearchQuery);
        setStudentProfiles(profiles);
      } catch (err) {
        console.error('Failed to search student profiles:', err);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchStudents, 400);
    return () => clearTimeout(debounceTimer);
  }, [isStudentMode, selectedClass, studentSearchQuery]);

  const handleVerifyStudentVoter = async (voterId: string) => {
    if (!voterId) return;

    if (accessSettings && !accessSettings.voting_global_enabled) {
      setScreen('forbidden');
      return;
    }

    setSearchLoading(true);
    setErrorMessage(null);

    try {
      const profile = studentProfiles.find(p => p.id === voterId);
      if (!profile) {
        setErrorMessage('Profil Siswa tidak ditemukan.');
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
        setErrorMessage('Sesi voting untuk Siswa ini sudah diselesaikan. Setiap pemilih hanya dapat memberikan suara sekali.');
        setSearchLoading(false);
        return;
      }

      setScreen('profile');
      setSearchLoading(false);
    } catch (err: any) {
      console.error('Error verifying Student voter:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat memvalidasi profil Siswa.');
      setSearchLoading(false);
    }
  };

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
    // Student mode resets
    setSelectedClass('');
    setStudentProfiles([]);
    setStudentSearchQuery('');
    setSelectedStudentId('');
    // GTK mode resets
    setSelectedGtkId('');
    setGtkSearchQuery('');
  };

  const triggerBack = (targetScreen: 'scan' | 'categories') => {
    clearCountdown();
    setScreen(targetScreen);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased relative w-full selection:bg-blue-600 selection:text-white">
      {/* Background Radial Highlight & Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-slate-100 pointer-events-none select-none z-0" />

      {/* Top Header Bar matching Informasi Design System */}
      {!isGtkMode && !isStudentMode && (
        <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex justify-between items-center z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-blue-600/20">
              PPU
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm tracking-tight">BILIK SUARA</span>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200/80">
                PEMILIH
              </span>
            </div>
          </div>

          {screen !== 'thankyou' && (
            <div className="flex items-center gap-2">
              {voter && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  {voter.full_name}
                </span>
              )}
              <button
                onClick={handleCancelVotingFlow}
                className="text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{voter ? 'Batal Sesi' : 'Kembali'}</span>
              </button>
            </div>
          )}
        </header>
      )}

      <div className="relative z-10 flex-1 flex flex-col w-full">
      {/* SCREEN 0: FORBIDDEN / DISABLED */}
      {screen === 'forbidden' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center my-auto">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-20 h-20 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center shadow-xs">
              <Lock className="w-9 h-9 text-rose-600" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
            <span>Bilik Suara Ditutup</span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase">Akses Ditutup</h1>
          <p className="text-slate-600 font-medium text-xs sm:text-sm mb-6 leading-relaxed max-w-sm">
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
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            {voteMode === 'booth' ? 'Kembali ke Layar Utama' : 'Kembali ke Halaman Depan'}
          </button>
        </main>
      )}

      {/* SCREEN 1: SCAN OR INPUT CARD ID */}
      {screen === 'scan' && (
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-md mx-auto my-auto">
          
          {/* Top Button: Bilik Default (for GTK / Siswa mode) */}
          {(isGtkMode || isStudentMode) && (
            <div className="w-full flex justify-start mb-4">
              <button
                type="button"
                onClick={handleOpenBilikDefaultModal}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200/90 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Bilik Default</span>
              </button>
            </div>
          )}

          {/* Header Title & Subtitle */}
          <div className="text-center mb-6 space-y-1.5">
            {!isGtkMode && !isStudentMode && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-200/80 mb-1 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>IDENTIFIKASI PEMILIH</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isGtkMode ? 'Bilik Guru & Tenaga Kependidikan' : isStudentMode ? 'Bilik Siswa' : 'Verifikasi Pemilih'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium max-w-sm mx-auto">
              {isGtkMode 
                ? 'Silakan cari nama Anda pada daftar Guru dan Tenaga Kependidikan di bawah untuk memvalidasi identitas Anda.' 
                : isStudentMode
                  ? 'Pilih kelas kamu, masukkan nama lengkap, lalu pilih profil kamu yang tersedia untuk melanjutkan pemilihan.'
                  : 'Silakan masukkan Card ID secara manual atau scan QR Code yang ada di Voters Card'}
            </p>
          </div>

          <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 mb-4">
            {!isGtkMode && !isStudentMode ? (
              <div className="w-full mb-2">
                <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                  CARD ID
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
                      className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl outline-none text-slate-900 font-mono font-black text-center text-2xl transition-all shadow-2xs focus:ring-4 focus:ring-blue-500/10"
                    />
                  ))}
                </div>
              </div>
            ) : isGtkMode ? (
              <div className="w-full space-y-4">
                <div className="relative">
                  <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Cari Nama Anda
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama Anda di sini..."
                      value={gtkSearchQuery}
                      onChange={(e) => {
                        setGtkSearchQuery(e.target.value);
                        setSelectedGtkId('');
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 rounded-xl outline-none text-slate-900 text-sm transition-all placeholder:text-slate-400 font-semibold"
                    />
                    {gtkSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setGtkSearchQuery('');
                          setSelectedGtkId('');
                        }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs font-bold bg-slate-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </div>

                {/* List of matched GTK profiles (Tampil HANYA jika query >= 2 karakter) */}
                {gtkSearchQuery.trim().length >= 2 && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2 max-h-[220px] overflow-y-auto space-y-1.5 custom-scrollbar">
                    {gtkProfiles.filter(p => 
                      p.full_name.toLowerCase().includes(gtkSearchQuery.trim().toLowerCase())
                    ).length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-500 font-medium">
                        Tidak ditemukan akun GTK yang sesuai.
                      </div>
                    ) : (
                      gtkProfiles.filter(p => 
                        p.full_name.toLowerCase().includes(gtkSearchQuery.trim().toLowerCase())
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
                                ? 'bg-blue-50 border-2 border-blue-600 text-slate-900 shadow-2xs' 
                                : isVoted 
                                  ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200' 
                                  : 'bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold truncate text-slate-900">{p.full_name}</p>
                              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Sektor Guru & Tenaga Kependidikan</p>
                            </div>
                            <div>
                              {isVoted ? (
                                <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                  Sudah Memilih
                                </span>
                              ) : isSelected ? (
                                <span className="text-[9px] bg-blue-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-2xs">
                                  Terpilih
                                </span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 hover:bg-blue-50 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider transition-all">
                                  Pilih
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="space-y-4">
                  {/* DROPDOWN KELAS */}
                  <div className="relative">
                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      KELAS
                    </label>
                    <button
                      type="button"
                      onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                      className="appearance-none rounded-xl relative block w-full px-4 py-3.5 border-2 border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-blue-600 text-left text-sm font-semibold cursor-pointer select-none transition-all flex items-center justify-between"
                    >
                      <span className={selectedClass ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                        {selectedClass || 'Pilih Kelas'}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${classDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Class Dropdown Panel */}
                    {classDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setClassDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-50 p-3 max-h-72 overflow-y-auto custom-scrollbar">
                          {studentColOther.length > 0 && (
                            <div className="mb-3 pb-2 border-b border-slate-100 grid grid-cols-2 gap-2">
                              {studentColOther.map(cls => (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setSelectedStudentId('');
                                    setStudentSearchQuery('');
                                    setStudentProfiles([]);
                                    setClassDropdownOpen(false);
                                  }}
                                  className={`w-full py-2 text-xs text-center rounded-lg font-bold transition-all border cursor-pointer ${
                                    selectedClass === cls
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                  }`}
                                >
                                  {cls}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            {/* Kelas X */}
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1.5 text-center">
                                Kelas X
                              </div>
                              {studentColX.map(cls => (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setSelectedStudentId('');
                                    setStudentSearchQuery('');
                                    setStudentProfiles([]);
                                    setClassDropdownOpen(false);
                                  }}
                                  className={`w-full py-2 text-xs text-center rounded-lg font-bold transition-all border cursor-pointer ${
                                    selectedClass === cls
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                  }`}
                                >
                                  {cls}
                                </button>
                              ))}
                            </div>

                            {/* Kelas XI */}
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1.5 text-center">
                                Kelas XI
                              </div>
                              {studentColXI.map(cls => (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setSelectedStudentId('');
                                    setStudentSearchQuery('');
                                    setStudentProfiles([]);
                                    setClassDropdownOpen(false);
                                  }}
                                  className={`w-full py-2 text-xs text-center rounded-lg font-bold transition-all border cursor-pointer ${
                                    selectedClass === cls
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                  }`}
                                >
                                  {cls}
                                </button>
                              ))}
                            </div>

                            {/* Kelas XII */}
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase font-mono font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1.5 text-center">
                                Kelas XII
                              </div>
                              {studentColXII.map(cls => (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClass(cls);
                                    setSelectedStudentId('');
                                    setStudentSearchQuery('');
                                    setStudentProfiles([]);
                                    setClassDropdownOpen(false);
                                  }}
                                  className={`w-full py-2 text-xs text-center rounded-lg font-bold transition-all border cursor-pointer ${
                                    selectedClass === cls
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                                  }`}
                                >
                                  {cls}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* INPUT NAMA */}
                  <div className="relative">
                    <label className="block text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                      NAMA LENGKAP
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={selectedClass ? "Masukkan nama lengkapkamu" : "Pilih kelas terlebih dahulu"}
                        value={studentSearchQuery}
                        disabled={!selectedClass}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStudentSearchQuery(val);
                          setSelectedStudentId('');
                        }}
                        className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl outline-none text-slate-900 text-sm transition-all placeholder:text-slate-400 font-semibold"
                      />
                      {studentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentSearchQuery('');
                            setSelectedStudentId('');
                            setStudentProfiles([]);
                          }}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs font-bold bg-slate-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* LIST HASIL PENCARIAN PROFIL SISWA */}
                {selectedClass && studentSearchQuery.length >= 2 && (
                  <div className="space-y-2 mt-3">
                    {searchLoading ? (
                      <div className="text-center py-6 text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                        <M3ExpressiveLoadingIndicator size="small" className="text-blue-600" />
                        <span>Mencari profil siswa...</span>
                      </div>
                    ) : studentProfiles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50 border border-slate-200 rounded-2xl">
                        <User className="w-8 h-8 text-slate-400 mb-2 opacity-60" />
                        <p className="text-xs font-bold text-slate-700">Tidak ada profil yang ditemukan</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Coba periksa ejaan nama yang kamu ketik.</p>
                      </div>
                    ) : (
                      <div className="max-h-[240px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                        {studentProfiles.map(p => {
                          const isVoted = p.voting_status === 'sudah';
                          const isSelected = selectedStudentId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isVoted}
                              onClick={() => {
                                setSelectedStudentId(p.id);
                                setStudentSearchQuery(p.full_name);
                              }}
                              className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-blue-50 border-2 border-blue-600 text-slate-900 shadow-xs'
                                  : isVoted
                                    ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200'
                                    : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-extrabold text-xs ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white' 
                                    : isVoted
                                      ? 'bg-slate-200 text-slate-500'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {p.full_name ? p.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-slate-900 group-hover:text-blue-700 transition-colors">
                                    {p.full_name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    {p.class || selectedClass}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isVoted ? (
                                  <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                    Sudah Memilih
                                  </span>
                                ) : isSelected ? (
                                  <div className="flex items-center gap-1 text-xs text-blue-600 font-bold">
                                    <span>Terpilih</span>
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isGtkMode && !isStudentMode && (
              <>
                <div className="w-full flex items-center gap-4 my-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <span className="h-px bg-slate-200 flex-1"></span>
                  atau scan qr code
                  <span className="h-px bg-slate-200 flex-1"></span>
                </div>

                <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs relative mb-4">
                  <div id="qr-reader-container" className="w-full h-[180px] sm:h-[200px] relative bg-black/40 flex flex-col items-center justify-center overflow-hidden">
                    {!isScanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-default bg-slate-900 p-4 text-center">
                        <Camera className="w-10 h-10 mb-1 text-slate-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Kamera tidak aktif
                        </span>
                      </div>
                    )}

                    {isScanning && (
                      <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none flex flex-col justify-between p-4 z-10">
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-2 border-l-2 border-blue-400 rounded-tl"></div>
                          <div className="w-6 h-6 border-t-2 border-r-2 border-blue-400 rounded-tr"></div>
                        </div>
                        <div className="text-[10px] bg-black/70 px-3 py-1 rounded-full text-blue-300 font-semibold uppercase tracking-widest text-center self-center shadow-lg">
                          🟢 Memindai Kode QR...
                        </div>
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-2 border-l-2 border-blue-400 rounded-bl"></div>
                          <div className="w-6 h-6 border-b-2 border-r-2 border-blue-400 rounded-br"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 p-3 bg-slate-800 border-t border-slate-700 justify-center items-center">
                    <button 
                      disabled={true}
                      className="w-full py-2 bg-slate-700 text-slate-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Camera className="w-3.5 h-3.5" /> Kamera Nonaktif
                    </button>
                  </div>
                </div>
              </>
            )}

            {camError && (
              <div className="w-full mb-4 bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs flex gap-2.5 text-rose-700 leading-relaxed items-start mt-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{camError}</span>
              </div>
            )}

            {errorMessage && (
              <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-semibold leading-relaxed mb-4 flex gap-2 items-start mt-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button 
              onClick={() => isGtkMode ? handleVerifyGtkVoter(selectedGtkId) : isStudentMode ? handleVerifyStudentVoter(selectedStudentId) : handleVerifyCardId(cardIdInput)}
              disabled={searchLoading || (isGtkMode ? !selectedGtkId : isStudentMode ? !selectedStudentId : !cardIdInput.trim())}
              className="w-full py-3.5 mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {searchLoading ? (
                <>
                  <M3ExpressiveLoadingIndicator size="small" className="text-white" /> Sedang Memproses...
                </>
              ) : (
                <>
                  {isGtkMode ? 'Validasi Identitas GTK' : isStudentMode ? 'Validasi Identitas Siswa' : 'Lanjutkan Verifikasi'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </main>
      )}

      {/* SCREEN 1.1: GELOMBANG VOTING ACTIVE MATCH */}
      {screen === 'gelombang_aktif' && voter && detectedActiveSession && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto text-center my-auto">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-center shadow-xs">
              <Check className="w-8 h-8 text-blue-600 stroke-[3]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            <span>Sesi Sesuai</span>
          </div>

          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase">Sesi Aktif</h1>
          <p className="text-slate-600 font-medium text-xs mb-6 leading-relaxed max-w-sm">
            Waktu pemilihan untuk kelas Anda sedang berlangsung aktif sekarang. Anda dapat melanjutkan proses pemungutan suara.
          </p>

          <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-3 shadow-2xs">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Nama Sesi</span>
              <span className="font-extrabold text-blue-700">{detectedActiveSession.nama_sesi}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Waktu Sesi</span>
              <span className="font-extrabold text-slate-800 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">{detectedActiveSession.jam_mulai} - {detectedActiveSession.jam_selesai}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Kelas Anda</span>
              <span className="font-extrabold text-slate-900 font-mono">{voter.class}</span>
            </div>
          </div>

          <div className="w-full space-y-3">
            <button 
              onClick={() => setScreen('profile')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 group cursor-pointer transition-colors"
            >
              Lanjutkan Validasi Profil <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={handleCancelVotingFlow}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              ← Batal
            </button>
          </div>
        </main>
      )}

      {/* SCREEN 1.2: GELOMBANG VOTING BLOCKED */}
      {screen === 'gelombang_blokir' && voter && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto text-center my-auto">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center shadow-xs">
              <Lock className="w-8 h-8 text-rose-600" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
            <span>Akses Ditangguhkan</span>
          </div>

          <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2 uppercase">Sesi Tidak Aktif</h1>
          <p className="text-slate-600 font-medium text-xs mb-6 leading-relaxed max-w-sm">
            Kelas Anda belum memiliki sesi voting aktif saat ini. Silakan datang kembali sesuai jadwal yang telah ditentukan panitia.
          </p>

          {detectedClassSchedule && (
            <div className="w-full bg-rose-50/50 border border-rose-200 rounded-2xl p-5 mb-6 text-left space-y-3 shadow-2xs">
              <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest border-b border-rose-200 pb-2 mb-2">
                Informasi Sesi Kelas {voter.class}
              </h4>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Nama Sesi</span>
                <span className="font-extrabold text-rose-800">{detectedClassSchedule.nama_sesi}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Jadwal</span>
                <span className="font-extrabold text-slate-800 bg-white px-2.5 py-1 rounded border border-rose-200">{detectedClassSchedule.jam_mulai} - {detectedClassSchedule.jam_selesai}</span>
              </div>
            </div>
          )}

          <button 
            onClick={handleCancelVotingFlow}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
          >
            ← Kembali ke Layar Awal
          </button>
        </main>
      )}

      {/* SCREEN 2: VOTER PROFILE CONFIRMATION */}
      {screen === 'profile' && (
        <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-md mx-auto my-auto">
          {searchLoading ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Sedang menyinkronkan data pemilih...</p>
            </div>
          ) : voter ? (
            <>
              {/* Header */}
              <div className="text-center mb-6 space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-bold tracking-wider uppercase border border-blue-200/80 mb-1 shadow-2xs">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>PROFIL PEMILIH</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Periksa Profil Kamu
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium max-w-xs mx-auto">
                  Pastikan data berikut sudah sesuai sebelum melanjutkan.
                </p>
              </div>

              {/* Profile Confirmation Card */}
              <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/50 relative mb-6 flex flex-col items-center text-center overflow-hidden">
                {/* Avatar / Initials */}
                <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center text-blue-700 font-black text-2xl mb-4 shadow-xs">
                  {voter.full_name ? voter.full_name.charAt(0).toUpperCase() : <User className="w-9 h-9" />}
                </div>

                {/* Nama Lengkap */}
                <h3 className="font-black text-slate-900 text-xl tracking-tight leading-snug mb-1 max-w-full truncate px-2">
                  {voter.full_name}
                </h3>

                {/* Email */}
                <p className="text-xs text-slate-500 font-medium mb-3 truncate max-w-full px-2">
                  {voter.email || 'email@siswa.com'}
                </p>

                {/* Kelas */}
                <div className="inline-flex items-center px-3.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold font-mono mb-6">
                  {voter.class || 'N/A'}
                </div>

                {/* Status Verifikasi (Green Circle Checkmark) */}
                <div className="pt-5 border-t border-slate-100 w-full flex flex-col items-center justify-center">
                  {voter.account_status === 'dikonfirmasi' ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <span className="text-xs font-bold text-emerald-600 tracking-wide">
                        Terverifikasi
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-amber-600 tracking-wide">
                        Menunggu Verifikasi
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning messages if applicable */}
              {voter.account_status !== 'dikonfirmasi' ? (
                <div className="w-full bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs flex gap-3 text-amber-800 leading-relaxed mb-6 items-start shadow-2xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                  <div>
                    <p className="font-bold mb-1">Akses Voting</p>
                    <p className="text-amber-700 font-medium">
                      Akun ini belum dikonfirmasi oleh panitia. Silakan pergi ke Pusat Konfirmasi di dekat Bilik Suara untuk mengonfirmasi identitas sebelum melanjutkan sesi voting.
                    </p>
                  </div>
                </div>
              ) : (voter.voting_status === 'sudah' || isVoterAllCompleted) ? (
                <div className="w-full bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs flex gap-3 text-rose-800 leading-relaxed mb-6 items-start shadow-2xs">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <p className="font-bold mb-1">Sudah Memilih</p>
                    <p className="text-rose-700 font-medium">
                      Seluruh hak pilih telah digunakan. Anda tidak dapat melakukan pemilihan ulang.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Buttons */}
              <div className="w-full space-y-3">
                {voter.account_status === 'dikonfirmasi' && voter.voting_status !== 'sudah' && !isVoterAllCompleted && (
                  <button 
                    onClick={proceedToCategories}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    Lanjutkan Pemilihan <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                {(voter.voting_status === 'sudah' || isVoterAllCompleted) && (
                  <button 
                    disabled={true}
                    className="w-full py-3.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Hak Pilih Sudah Digunakan (Terkunci)
                  </button>
                )}

                <button 
                  onClick={handleCancelVotingFlow}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                >
                  Kembali
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
              <p className="text-xs text-rose-600 font-semibold">{errorMessage || 'Gagal memuat profil pemilih.'}</p>
              <button 
                onClick={handleCancelVotingFlow}
                className="py-2.5 px-6 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
          <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center my-auto">
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mb-6 text-emerald-600 shadow-xs">
              <Check className="w-8 h-8 font-black stroke-[3]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Voting Selesai</h1>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Terima kasih telah menggunakan hak pilih Anda. <br/>
              Sesi voting Anda telah berakhir dan Anda tidak dapat melakukan pemilihan ulang.
            </p>
            <button 
              onClick={handleFinalFinish}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2 transition-all"
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
          <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 flex flex-col justify-start">
            {/* Top Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Kategori Pemilihan
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Pilih kategori untuk melanjutkan.
                </p>
              </div>

              {/* Active Voter Chip */}
              <div className="bg-white border border-slate-200/90 px-3.5 py-1.5 rounded-xl flex items-center gap-2.5 self-start sm:self-auto shadow-2xs">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold border border-blue-200/80">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pemilih</div>
                  <div className="text-slate-900 font-bold text-xs truncate max-w-[140px]">
                    {isGtkMode ? 'Pemilih Anonymous' : voter.full_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 shadow-2xs">
              <div className="flex justify-between items-center mb-2 text-xs">
                <span className="font-bold text-slate-700">Kemajuan Pemilihan</span>
                <span className="font-black text-blue-700">
                  {completedCategories} dari {totalCategories} selesai
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentComplete}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>

            {/* Compact Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {categories.map((cat, idx) => {
                const voted = !!votedCategories[cat.id];
                const formattedNum = String(idx + 1).padStart(2, '0');

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => openCategory(cat.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between group shadow-2xs ${
                      voted
                        ? 'bg-emerald-50/70 border-emerald-200/90 hover:bg-emerald-50'
                        : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-mono font-black tracking-wider ${
                          voted ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {formattedNum}
                        </span>
                        {voted && (
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight truncate group-hover:text-blue-700 transition-colors">
                        {cat.name}
                      </h3>

                      <div className="mt-1.5">
                        {voted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            Belum dipilih
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      voted
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                    }`}>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions Area */}
            <div className="mt-auto pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handleCancelVotingFlow}
                disabled={isSubmitting || completedCategories > 0}
                title={completedCategories > 0 ? 'Voting tidak dapat dibatalkan karena Anda telah memilih minimal 1 kategori' : undefined}
                className="py-3.5 px-6 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Batalkan Voting</span>
              </button>

              {allCompleted ? (
                <div className="flex-1 py-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                  <span>Pemilihan Selesai — Memproses Finalisasi Otomatis...</span>
                </div>
              ) : (
                <div className="flex-1 py-3.5 bg-white border border-slate-200 text-slate-600 font-semibold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping shrink-0" />
                  <span>Silakan selesaikan seluruh kategori ({completedCategories}/{totalCategories}) untuk finalisasi</span>
                </div>
              )}
            </div>

            {/* Information Card at the very bottom */}
            <div className="w-full bg-white border border-slate-200/90 p-4 rounded-2xl flex items-start sm:items-center gap-3 mt-6 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200/80 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
              <button 
                onClick={() => triggerBack('categories')}
                className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white border border-slate-200/90 hover:bg-slate-50 px-5 py-2.5 rounded-full cursor-pointer shadow-2xs transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-blue-600" /> Kembali ke Kategori Pemilu
              </button>

              <div className="bg-white border border-slate-200/90 px-4 py-2 rounded-2xl shrink-0 shadow-2xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/80">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Pemilih Aktif</div>
                  <div className="text-slate-900 font-extrabold text-xs truncate max-w-[150px]">{isGtkMode ? 'Pemilih Anonymous' : voter.full_name}</div>
                </div>
              </div>
            </div>

            {/* HERO SECTION */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/90 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-2xs">
              <div className="flex-1 space-y-3 relative z-10 text-left">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest bg-blue-50 text-blue-700 border border-blue-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Kategori: {activeCat?.name}
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
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
                
                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium">
                  Tentukan pilihan Anda dengan cermat. Setelah suara dikirim, pilihan tidak dapat diubah kembali.
                </p>
              </div>

              {/* ILLUSTRATION */}
              <div className="hidden md:flex justify-end items-center relative h-36 w-36 shrink-0 ml-auto">
                <motion.div 
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-full h-full"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full filter drop-shadow">
                    <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                    <defs>
                      <linearGradient id="boxGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient id="lidGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                      <linearGradient id="checkGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="starGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient id="paperGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="100%" stopColor="#f1f5f9" />
                      </linearGradient>
                    </defs>

                    <path d="M 35 45 L 37 40 L 42 38 L 37 36 L 35 31 L 33 36 L 28 38 L 33 40 Z" fill="url(#starGrad2)" className="opacity-80" />
                    <path d="M 165 145 L 166 141 L 170 140 L 166 139 L 165 135 L 164 139 L 160 140 L 164 141 Z" fill="url(#starGrad2)" className="opacity-90" />

                    <path d="M 60 100 L 140 100 L 140 160 L 60 160 Z" fill="url(#boxGrad2)" />
                    <path d="M 60 100 L 100 100 L 100 160 L 60 160 Z" fill="black" fillOpacity="0.05" />
                    
                    <path d="M 50 100 L 150 100 L 150 90 L 50 90 Z" fill="url(#lidGrad2)" rx="2" />
                    
                    <rect x="80" y="93" width="40" height="4" rx="2" fill="#1e293b" />

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

            {isSelectedCatMpk && !voterDapil ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto shadow-2xs">
                <span className="text-4xl filter drop-shadow">⚠️</span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Kelas Belum Teralokasi</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                    Kelas Anda (<strong>{voter.class}</strong>) belum didaftarkan ke dalam Daerah Pemilihan (Dapil) manapun untuk Pemilihan MPK SMABA oleh administrator.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                    Silakan hubungi Panitia KPPS di tempat pemilihan untuk mengonfigurasi alokasi kelas Anda ke Dapil yang sesuai.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                {isSelectedCatMpk && voterDapil && (
                  <div className="w-full bg-blue-50/80 border border-blue-200/90 p-5 rounded-3xl text-sm flex gap-4 text-blue-900 leading-relaxed mb-6 items-start shadow-2xs">
                    <div className="bg-blue-100 p-2.5 rounded-2xl flex items-center justify-center shrink-0 border border-blue-200">
                      <CheckCircle2 className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-slate-900 text-base tracking-tight">Daerah Pemilihan MPK</p>
                      <p className="text-slate-700 font-medium text-xs sm:text-sm">
                        Kelas Anda (<strong className="text-blue-700 font-black">{voter.class}</strong>) masuk dalam Daerah Pemilihan: <strong className="text-blue-800 font-extrabold">{voterDapil.name}</strong>
                      </p>
                      <p className="text-slate-600 text-xs font-medium">
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
                        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto shadow-2xs">
                          <span className="text-4xl filter drop-shadow">🗳️</span>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base">Kandidat Tidak Tersedia</h3>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
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
                        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs mb-6 text-left">
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
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border ${
                              currentClassIndex === 0
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>

                          {/* Class Header */}
                          <div className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 font-mono block mb-0.5">
                              Calon Perwakilan MPK
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
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
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all border ${
                              currentClassIndex === classesWithCandidates.length - 1
                                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-blue-700 active:scale-95 cursor-pointer'
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
                                    whileHover={{ y: -4, scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => {
                                      if (selectedMpkVotes[currentClass] !== cand.id) {
                                        setSelectedMpkVotes(prev => ({
                                          ...prev,
                                          [currentClass]: cand.id
                                        }));
                                        triggerCoblosAnimation(cand.id);
                                      }
                                    }}
                                    className={`bg-white rounded-3xl overflow-hidden shadow-xs border-2 flex flex-col h-full group transition-all duration-200 cursor-pointer ${
                                      isSelected 
                                        ? 'border-blue-600 ring-4 ring-blue-600/15 shadow-md' 
                                        : 'border-slate-200/90 hover:border-blue-400'
                                    }`}
                                  >
                                    {/* Header Gradient + Photo Area */}

                                    <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border-b border-slate-100">

                                      {/* Nomor Paslon Badge (z-30, never blurred) */}

                                      <div className={`absolute left-3 top-3 min-w-[32px] h-8 px-2.5 rounded-xl font-black text-xs sm:text-sm text-white shadow-md transition-all z-30 inline-flex items-center justify-center ${isSelected ? 'bg-blue-600 ring-2 ring-white/90' : 'bg-slate-900/80 backdrop-blur-xs'}`}>

                                        {cand.number}

                                      </div>


                                      {/* Photo Layer (blurred ONLY during 1s coblos animation) */}

                                      <div className={`w-full h-full relative transition-all duration-300 ${isSelected && animatingCandId === cand.id ? 'filter blur-[3px] brightness-75 scale-105' : 'filter-none'}`}>

                                        {cand.photo_url ? (

                                          <img 

                                            src={cand.photo_url} 

                                            alt={cand.chairman} 

                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"

                                            referrerPolicy="no-referrer"

                                          />

                                        ) : (

                                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-100">

                                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pasfoto Kandidat</span>

                                          </div>

                                        )}

                                      </div>


                                      {/* Overlay Animasi & Status DICOBLOS */}

                                      {isSelected && (

                                        <>

                                          {animatingCandId === cand.id ? (

                                            /* Tahap 1: Animasi Coblos 📌 (durasi ~1 detik) */

                                            <div className="absolute inset-0 bg-slate-900/35 z-20 flex items-center justify-center p-2 pointer-events-none">

                                              <AnimatePresence mode="wait">

                                                <motion.div

                                                  key="pin-anim"

                                                  initial={{ scale: 2.2, y: -45, rotate: -25, opacity: 0 }}

                                                  animate={{

                                                    scale: [2.2, 0.9, 1.1, 1],

                                                    y: [-45, 2, -2, 0],

                                                    rotate: [-25, 4, -2, 0],

                                                    opacity: [0, 1, 1, 1]

                                                  }}

                                                  exit={{ scale: 0.5, opacity: 0 }}

                                                  transition={{ duration: 0.8, ease: "easeOut" }}

                                                  className="flex flex-col items-center justify-center"

                                                >

                                                  <span className="text-5xl sm:text-6xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] select-none">

                                                    📌

                                                  </span>

                                                </motion.div>

                                              </AnimatePresence>

                                            </div>

                                          ) : (

                                            /* Tahap 2: Status ✓ DICOBLOS (setelah 1s, foto jelas kembali) */

                                            <div className="absolute bottom-3 right-3 z-20 pointer-events-none">

                                              <motion.div

                                                key="coblos-badge"

                                                initial={{ scale: 0.8, opacity: 0 }}

                                                animate={{ scale: 1, opacity: 1 }}

                                                transition={{ duration: 0.25, ease: "easeOut" }}

                                                className="px-3 py-1.5 bg-emerald-500 border-2 border-emerald-300 text-white font-black text-xs tracking-wider uppercase rounded-xl flex items-center gap-1.5 shadow-lg"

                                              >

                                                <Check className="w-4 h-4 stroke-[3]" />

                                                <span>DICOBLOS</span>

                                              </motion.div>

                                            </div>

                                          )}

                                        </>

                                      )}


                                      {!isSelected && (

                                        <div className="absolute right-3 top-3 z-20">

                                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white/80 backdrop-blur-md flex items-center justify-center shadow-xs">

                                            <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>

                                          </div>

                                        </div>

                                      )}

                                    </div>
                                    {/* Card Content Area */}
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                      <div className="flex-1 flex flex-col space-y-4">
                                        {/* Ketua & Wakil Section - Horizontal */}
                                        {cand.vice ? (
                                          <div className="grid grid-cols-2 gap-3 text-center pb-3 border-b border-slate-100">
                                            <div>
                                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                                              <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block truncate">
                                                {cand.chairman}
                                              </span>
                                            </div>
                                            <div>
                                              <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">WAKIL KETUA</span>
                                              <span className="font-bold text-slate-800 text-xs sm:text-sm leading-tight block truncate">
                                                {cand.vice}
                                              </span>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-center pb-3 border-b border-slate-100">
                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                                            <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block truncate">
                                              {cand.chairman}
                                            </span>
                                          </div>
                                        )}

                                        {/* Visi Section */}
                                        {cand.visi && cand.visi.trim() !== '' && (
                                          <div className="text-center">
                                            <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">Visi</span>
                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-left">
                                              <p className="text-slate-600 text-xs font-normal leading-relaxed text-justify">
                                                "{cand.visi}"
                                              </p>
                                            </div>
                                          </div>
                                        )}

                                        {/* Misi Section */}
                                        {cand.misi && cand.misi.length > 0 && (
                                          <div className="text-center">
                                            <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">Misi</span>
                                            <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-left">
                                              <ul className="space-y-1 text-left">
                                                {cand.misi.slice(0, 3).map((m, mIdx) => (
                                                  <li key={mIdx} className="text-slate-600 text-xs font-normal leading-relaxed flex gap-1.5 items-start text-justify">
                                                    <span className="text-slate-400 shrink-0 select-none">•</span>
                                                    <span>{m}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
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
                        <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-[50] shadow-lg rounded-t-3xl">
                          <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3 self-start sm:self-auto">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Progres Pilihan MPK</div>
                                <p className="text-xs sm:text-sm font-bold text-slate-900">
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
                              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-black tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                isAllSelected
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95 duration-150'
                                  : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
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
                          <div className="w-full max-w-lg mx-auto bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center mt-4">
                            <p className="text-xs font-bold text-amber-800 flex items-center justify-center gap-1.5">
                              ⚠️ Anda wajib menentukan tepat satu perwakilan pada setiap kelompok kelas untuk menyimpan pilihan MPK.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  candidates.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4 my-auto shadow-2xs">
                      <span className="text-4xl filter drop-shadow">🗳️</span>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">Kandidat Tidak Tersedia</h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
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
                              whileHover={{ y: -4, scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => {
                                if (selectedCandidate?.id !== cand.id) {
                                  setSelectedCandidate(cand);
                                  triggerCoblosAnimation(cand.id);
                                }
                              }}
                              className={`bg-white rounded-3xl overflow-hidden shadow-xs border-2 flex flex-col h-full group transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'border-blue-600 ring-4 ring-blue-600/15 shadow-md' 
                                  : 'border-slate-200/90 hover:border-blue-400'
                              }`}
                            >
                              {/* Header Gradient + Photo Area */}

                              <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 border-b border-slate-100">

                                {/* Nomor Paslon Badge (z-30, never blurred) */}

                                <div className={`absolute left-3 top-3 min-w-[32px] h-8 px-2.5 rounded-xl font-black text-xs sm:text-sm text-white shadow-md transition-all z-30 inline-flex items-center justify-center ${isSelected ? 'bg-blue-600 ring-2 ring-white/90' : 'bg-slate-900/80 backdrop-blur-xs'}`}>

                                  {cand.number}

                                </div>


                                {/* Photo Layer (blurred ONLY during 1s coblos animation) */}

                                <div className={`w-full h-full relative transition-all duration-300 ${isSelected && animatingCandId === cand.id ? 'filter blur-[3px] brightness-75 scale-105' : 'filter-none'}`}>

                                  {cand.photo_url ? (

                                    <img 

                                      src={cand.photo_url} 

                                      alt={cand.chairman} 

                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"

                                      referrerPolicy="no-referrer"

                                    />

                                  ) : (

                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-100">

                                      <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Pasfoto Kandidat</span>

                                    </div>

                                  )}

                                </div>


                                {/* Overlay Animasi & Status DICOBLOS */}

                                {isSelected && (

                                  <>

                                    {animatingCandId === cand.id ? (

                                      /* Tahap 1: Animasi Coblos 📌 (durasi ~1 detik) */

                                      <div className="absolute inset-0 bg-slate-900/35 z-20 flex items-center justify-center p-2 pointer-events-none">

                                        <AnimatePresence mode="wait">

                                          <motion.div

                                            key="pin-anim"

                                            initial={{ scale: 2.2, y: -45, rotate: -25, opacity: 0 }}

                                            animate={{

                                              scale: [2.2, 0.9, 1.1, 1],

                                              y: [-45, 2, -2, 0],

                                              rotate: [-25, 4, -2, 0],

                                              opacity: [0, 1, 1, 1]

                                            }}

                                            exit={{ scale: 0.5, opacity: 0 }}

                                            transition={{ duration: 0.8, ease: "easeOut" }}

                                            className="flex flex-col items-center justify-center"

                                          >

                                            <span className="text-5xl sm:text-6xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)] select-none">

                                              📌

                                            </span>

                                          </motion.div>

                                        </AnimatePresence>

                                      </div>

                                    ) : (

                                      /* Tahap 2: Status ✓ DICOBLOS (setelah 1s, foto jelas kembali) */

                                      <div className="absolute bottom-3 right-3 z-20 pointer-events-none">

                                        <motion.div

                                          key="coblos-badge"

                                          initial={{ scale: 0.8, opacity: 0 }}

                                          animate={{ scale: 1, opacity: 1 }}

                                          transition={{ duration: 0.25, ease: "easeOut" }}

                                          className="px-3 py-1.5 bg-emerald-500 border-2 border-emerald-300 text-white font-black text-xs tracking-wider uppercase rounded-xl flex items-center gap-1.5 shadow-lg"

                                        >

                                          <Check className="w-4 h-4 stroke-[3]" />

                                          <span>DICOBLOS</span>

                                        </motion.div>

                                      </div>

                                    )}

                                  </>

                                )}


                                {!isSelected && (

                                  <div className="absolute right-3 top-3 z-20">

                                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white/80 backdrop-blur-md flex items-center justify-center shadow-xs">

                                      <div className="w-2.5 h-2.5 rounded-full bg-transparent"></div>

                                    </div>

                                  </div>

                                )}

                              </div>
                              {/* Card Content Area */}
                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="flex-1 flex flex-col space-y-4">
                                  {/* Ketua & Wakil Section - Horizontal */}
                                  {cand.vice ? (
                                    <div className="grid grid-cols-2 gap-3 text-center pb-3 border-b border-slate-100">
                                      <div>
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                                        <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block truncate">
                                          {cand.chairman}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">WAKIL KETUA</span>
                                        <span className="font-bold text-slate-800 text-xs sm:text-sm leading-tight block truncate">
                                          {cand.vice}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center pb-3 border-b border-slate-100">
                                      <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">KETUA</span>
                                      <span className="font-black text-slate-900 text-sm sm:text-base leading-tight block truncate">
                                        {cand.chairman}
                                      </span>
                                    </div>
                                  )}

                                  {/* Visi Section */}
                                  {cand.visi && cand.visi.trim() !== '' && (
                                    <div className="text-center">
                                      <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">Visi</span>
                                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-left">
                                        <p className="text-slate-600 text-xs font-normal leading-relaxed text-justify">
                                          "{cand.visi}"
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Misi Section */}
                                  {cand.misi && cand.misi.length > 0 && (
                                    <div className="text-center">
                                      <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1 font-mono">Misi</span>
                                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-left">
                                        <ul className="space-y-1 text-left">
                                          {cand.misi.slice(0, 3).map((m, mIdx) => (
                                            <li key={mIdx} className="text-slate-600 text-xs font-normal leading-relaxed flex gap-1.5 items-start text-justify">
                                              <span className="text-slate-400 shrink-0 select-none">•</span>
                                              <span>{m}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Sticky Bottom Action Bar */}
                      <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-5 bg-white/95 backdrop-blur-md border-t border-slate-200/90 z-[50] shadow-lg rounded-t-3xl">
                        <div className="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Info Paslon Terpilih */}
                          <div className="flex items-center gap-3 text-left self-start sm:self-auto">
                            {selectedCandidate ? (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                  <span className="text-sm font-black text-blue-700">
                                    {String(selectedCandidate.number).padStart(2, '0')}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paslon Terpilih</div>
                                  <h4 className="font-black text-slate-900 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-[300px]">
                                    {selectedCandidate.chairman}
                                  </h4>
                                  {selectedCandidate.vice && (
                                    <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-[300px] italic">
                                      & {selectedCandidate.vice}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 text-slate-400">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  <HelpCircle className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paslon Terpilih</div>
                                  <p className="text-xs font-bold text-slate-500">Belum ada pilihan</p>
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
                            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl text-xs font-black tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              selectedCandidate
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95 duration-150'
                                : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {isSubmitting ? (
                              <>
                                <M3ExpressiveLoadingIndicator size="small" className="text-white" /> Mengirim...
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
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto text-center my-auto">
          <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-3xl mb-5 shadow-xs text-emerald-600">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            Pilihan Suara Tercatat!
          </h1>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-8 font-medium">
            Pilihan Anda untuk kategori ini berhasil diamankan dan tersimpan dalam sistem database. Kembali otomatis dalam:
          </p>

          <div className="w-24 h-24 rounded-full border-4 border-blue-600 bg-white flex flex-col items-center justify-center shadow-md shadow-blue-600/10 relative">
            <span className="text-4xl font-black text-slate-900 font-mono">{countdown}</span>
            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Detik</span>
          </div>
        </main>
      )}

      {/* SCREEN 6: FULLSCREEN FINAL THANK YOU COUNTDOWN */}
      {screen === 'thankyou' && (
        <main className="flex-1 w-full flex flex-col items-center justify-center text-center p-6 my-auto">
          <div className="w-20 h-20 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-3xl mb-6 shadow-xs">
            🎉
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-3">
            Terima Kasih!
          </h1>
          <p className="text-sm text-slate-600 max-w-sm leading-relaxed mb-8 font-medium">
            Hak suara Anda sangat berharga untuk kemajuan sekolah kita. Silakan tinggalkan bilik suara digital secara aman.
          </p>

          <div className="w-24 h-24 rounded-full border-4 border-blue-600 bg-white flex flex-col items-center justify-center shadow-md shadow-blue-600/10 mb-6 relative">
            <span className="text-4xl font-black text-slate-900 font-mono">{thankyouCountdown}</span>
            <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Detik</span>
          </div>

          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            Mempersiapkan sesi berikutnya dalam {thankyouCountdown} detik
          </p>
        </main>
      )}

      {/* SCREEN 7: AUTOMATIC FINALIZATION TRANSITION (10s COUNTDOWN) */}
      {screen === 'auto_finalize' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-lg mx-auto text-center my-auto">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-emerald-50 border-2 border-emerald-200 rounded-3xl flex items-center justify-center text-emerald-600 shadow-2xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black tracking-widest uppercase mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            PEMILIHAN SELESAI
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            PEMILIHAN SELESAI
          </h1>

          <p className="text-sm sm:text-base text-slate-800 font-bold max-w-md leading-relaxed mb-1">
            Seluruh kategori pemilihan telah berhasil Anda lakukan.
          </p>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed mb-6 font-medium">
            Anda akan diarahkan untuk menyelesaikan proses pemilihan...
          </p>

          {/* 10-Second Countdown Display */}
          <div className="w-24 h-24 rounded-3xl border-2 border-blue-600 bg-white flex flex-col items-center justify-center shadow-md shadow-blue-600/10 mb-6 relative">
            <span className="text-3xl font-black text-slate-900 font-mono">{countdown}</span>
            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">Detik</span>
          </div>

          <button
            onClick={() => {
              clearCountdown();
              handleFinalFinish();
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <M3ExpressiveLoadingIndicator size="small" className="text-white" /> Memproses Finalisasi...
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 text-left select-none animate-fade-in">
            <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
              <HelpCircle className="w-10 h-10 text-blue-600 mb-3" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-2">
                Apakah Anda yakin dengan pilihan ini?
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed font-medium">
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
                      <div key={clsName} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex justify-between items-center gap-2">
                        <div>
                          <span className="block text-[8px] font-black text-blue-600 tracking-wider uppercase font-mono">Kelas {clsName}</span>
                          <span className="font-extrabold text-slate-900 text-xs block truncate leading-tight mt-0.5">{cand.chairman}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                          No. {cand.number}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                  <span className="block text-[8px] font-black text-blue-600 tracking-wider mb-0.5 uppercase">Kandidat Terpilih</span>
                  <span className="block text-[11px] font-extrabold text-slate-500 tracking-wider mb-1 uppercase">
                    No. {selectedCandidate?.number}
                  </span>
                  <span className="font-black text-slate-900 text-base leading-tight block truncate mb-0.5">
                    {selectedCandidate?.chairman}
                  </span>
                  {selectedCandidate?.vice && (
                    <span className="font-semibold text-slate-500 text-xs italic tracking-wide truncate block">
                      {selectedCandidate.vice}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowModal1(false)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Batal
                </button>
                <button 
                  onClick={openModal2}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md shadow-blue-600/20"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fade-in">
            <AlertTriangle className="w-10 h-10 text-rose-600 mb-3" />
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-2 uppercase">
              Pernyataan Integritas
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6 font-medium">
              Keputusan Anda final. Hak suara yang telah dikirim dan tercatat dalam database <strong className="text-rose-600">TIDAK DAPAT DIUBAH</strong> kembali dengan alasan apa pun.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowModal2(false);
                  setShowModal1(true);
                }}
                className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                ← Kembali
              </button>
              <button 
                onClick={confirmVoteSubmit}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 cursor-pointer transition-colors"
              >
                Kirim Suara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ENFORCEMENT OVERLAY */}
      {!isFullscreen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center select-none text-white">
          <div className="relative mb-6 flex items-center justify-center">
            <div className="w-16 h-16 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center shadow-lg">
              <Maximize className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-black tracking-widest uppercase mb-3">
            <span>Sistem Keamanan Layar</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 uppercase">
            Mode Layar Penuh Diperlukan
          </h2>
          
          <p className="text-slate-300 font-medium text-xs sm:text-sm max-w-sm mb-8 leading-relaxed">
            Demi menjaga ketertiban, keamanan, serta integritas jalannya pemilihan, bilik suara elektronik ini diwajibkan berjalan dalam mode Layar Penuh (Fullscreen).
          </p>

          <button
            onClick={triggerFullscreen}
            className="w-full max-w-xs flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all text-center cursor-pointer active:scale-95 duration-150"
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg hover:shadow-blue-600/20 active:scale-95 transition-all border border-blue-400/30 cursor-pointer"
          title="Manual Fullscreen Fallback"
        >
          <Maximize className="w-4 h-4" />
          <span>Layar Penuh (Fullscreen)</span>
        </button>
      )}

      {/* Modal Protection Kode Akses Bilik Default */}
      {showBilikDefaultModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-200 mx-auto shadow-xs">
              <Lock className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Proteksi Akses Bilik
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan kode keamanan untuk kembali ke halaman <span className="font-bold text-slate-800">Bilik Default</span>.
              </p>
            </div>

            <form onSubmit={handleVerifyBilikCode} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  placeholder="Masukkan kode..."
                  value={bilikCodeInput}
                  onChange={(e) => {
                    setBilikCodeInput(e.target.value);
                    if (bilikCodeError) setBilikCodeError(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-600 rounded-xl outline-none text-slate-900 font-mono text-center text-lg tracking-widest font-bold transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:font-sans placeholder:text-slate-400 placeholder:text-xs placeholder:tracking-normal"
                />
                {bilikCodeError && (
                  <p className="text-xs font-bold text-rose-600 mt-2 flex items-center justify-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{bilikCodeError}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowBilikDefaultModal(false);
                    setBilikCodeInput('');
                    setBilikCodeError(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Konfirmasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}


