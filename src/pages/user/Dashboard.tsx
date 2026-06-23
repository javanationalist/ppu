import React, { useRef, useState, useEffect } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { QRCodeCanvas } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Download, MessageSquare, LifeBuoy, Edit3, X, Info, CalendarDays, FileText, AlertCircle, Megaphone, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getHelpdeskButtons } from '../../lib/helpdesk';
import { HelpdeskButton, Dapil } from '../../types';
import { supabase } from '../../lib/supabase';
import { getUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { getVotingCompletionStatus, getDapils } from '../../lib/votingService';
import { getGelombangConfigActive, getGelombangSesiList, GelombangSesi } from '../../lib/gelombangService';
import { ALL_CLASSES } from '../../lib/classConstants';
import WafoSlider from '../../components/WafoSlider';

export default function UserDashboard() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [helpdeskButtons, setHelpdeskButtons] = useState<HelpdeskButton[]>([]);
  const [isAllCompleted, setIsAllCompleted] = useState(false);
  const [isSessionConfigActive, setIsSessionConfigActive] = useState(false);
  const [userSession, setUserSession] = useState<GelombangSesi | null>(null);
  const [userDapil, setUserDapil] = useState<Dapil | null>(null);
  const [accessSettings, setAccessSettings] = useState<UserAccessSettings>({
    signup_enabled: true,
    lihat_hasil_enabled: true,
    edit_profil_enabled: true,
    download_kartu_enabled: true,
    visibilitas_kartu_enabled: true,
    maintenance_enabled: false,
    voting_global_enabled: true,
  });

  const renderBlurredEmail = (email: string) => {
    if (!email) return null;
    const parts = email.split('@');
    if (parts.length !== 2) return <span>{email}</span>;
    const [local, domain] = parts;

    if (local.length <= 3) {
      return <span>{email}</span>;
    }

    const prefix = local.slice(0, 2);
    const middle = local.slice(2, -1);
    const suffix = local.slice(-1);

    return (
      <span className="inline-flex items-center select-none" style={{ direction: 'ltr' }}>
        <span>{prefix}</span>
        <span 
          className="blur-[3px] select-none pointer-events-none mx-0.5 text-slate-100 opacity-80" 
          style={{ filter: 'blur(3px)', userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {middle}
        </span>
        <span>{suffix}</span>
        <span>@{domain}</span>
      </span>
    );
  };

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  useScrollLock(isEditModalOpen);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editClass, setEditClass] = useState(profile?.class || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-'));

  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const toggleDropdown = () => {
      if (!dropdownOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
      setDropdownOpen(!dropdownOpen);
    };

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    
    function updatePosition() {
        if (dropdownOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
              top: rect.bottom,
              left: rect.left,
              width: rect.width,
            });
        }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditClass(profile.class || '');
    }
  }, [profile]);

  useEffect(() => {
    const fetchHelpdeskAndSettings = async () => {
      try {
        const [data, s] = await Promise.all([
          getHelpdeskButtons(),
          getUserAccessSettings()
        ]);
        setHelpdeskButtons(data);
        setAccessSettings(s);

        if (profile?.id) {
          const status = await getVotingCompletionStatus(profile.id);
          setIsAllCompleted(status.allCompleted);

          // AUDIT RUNTIME
          console.log("=== DASHBOARD USER AUDIT ===");
          console.log("VOTER ID:", profile.id);
          console.log("ALL COMPLETED:", status.allCompleted);
          console.log("DASHBOARD STATUS SAAT INI (SOURCE profile.voting_status):", profile.voting_status === 'sudah' ? 'Sudah Memilih' : 'Belum Memilih');
          console.log("STATUS YANG SEHARUSNYA:", status.allCompleted ? 'Sudah Memilih' : 'Belum Memilih');
          console.log("============================");

          const voterClass = profile.class || '';

          // 1. Fetch Session allocation
          try {
            const sessionActive = await getGelombangConfigActive();
            setIsSessionConfigActive(sessionActive);
            if (sessionActive) {
              const listSesi = await getGelombangSesiList();
              const foundSesi = listSesi.find(s => s.kelas.includes(voterClass));
              setUserSession(foundSesi || null);
            }
          } catch (sessionErr) {
            console.error('Failed to fetch session configurations:', sessionErr);
          }

          // 2. Fetch Dapil allocation
          try {
            const listDapil = await getDapils();
            const foundDapil = listDapil.find(d => d.eligible_classes.includes(voterClass));
            setUserDapil(foundDapil || null);
          } catch (dapilErr) {
            console.error('Failed to fetch dapils:', dapilErr);
          }
        }
      } catch (err) {
        console.error('Failed to load helpdesk or settings:', err);
      }
    };
    fetchHelpdeskAndSettings();
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setEditLoading(true);
    setEditError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editFullName,
          class: editClass
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setIsEditModalOpen(false);
      window.location.reload(); // Quick & bulletproof page reload to refresh AuthContext
    } catch (err: any) {
      setEditError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogout = async () => {

    await signOut();
    navigate('/');
  };

  const handleDownload = async () => {
    if (!profile || !cardRef.current) return;
    setIsDownloading(true);

    try {
      // Using html-to-image to snapshot the cardRef component directly
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      
      const link = document.createElement('a');
      link.download = `Kartu_PU_${profile.full_name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image', err);
      alert('Gagal mengunduh kartu. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      {/* Top Navigation */}
      <nav className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white border border-slate-200 rounded-sm overflow-hidden flex items-center justify-center shadow-sm shrink-0">
            <img 
              src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp" 
              alt="PPU Logo" 
              className="w-full h-full object-contain p-0.5" 
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800">PPU <span className="hidden sm:inline font-normal text-slate-500 text-sm ml-2">Portal Pemilihan Umum</span></span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-none">{profile.full_name}</p>
              <p className="text-[10px] text-slate-400">User ID: {(profile.id || '').split('-')[0].toUpperCase()}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-700 font-bold uppercase">
              {profile.full_name.substring(0, 2)}
            </div>
            <button onClick={handleLogout} className="ml-1 sm:ml-2 text-slate-400 hover:text-red-500 group" title="Logout">
              <LogOut className="w-5 h-5 group-hover:stroke-red-500" />
            </button>
          </div>
        </div>
      </nav>

      {/* Information Slider (Copied from Landing) */}
      <WafoSlider />

      {/* Alert if Profile is Incomplete */}
      {accessSettings.edit_profil_enabled && (!profile.full_name || !profile.class) && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-10 shrink-0 select-none animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">!</span>
            <p className="text-xs sm:text-sm text-amber-800 font-semibold text-left">
              Data profil Anda belum lengkap. Silakan lengkapi Nama Lengkap dan Kelas Anda agar kartu pemilih Anda sah & dapat diverifikasi oleh panitia.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-amber-900 hover:text-amber-700 underline shrink-0"
          >
            Lengkapi Profil Sekarang &rarr;
          </button>
        </div>
      )}

      {/* Main Content Layout */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Status & Voting */}
          <div className="col-span-1 md:col-span-4 flex flex-col gap-6">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status Akun</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${profile.account_status === 'dikonfirmasi' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-bold ${profile.account_status === 'dikonfirmasi' ? 'text-emerald-700' : 'text-red-700'}`}>{profile.account_status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Belum Dikonfirmasi'}</span>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status PU</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${(profile.voting_status === 'sudah' || isAllCompleted) ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <span className={`text-sm font-bold truncate ${(!accessSettings.voting_global_enabled) ? 'text-rose-700' : (profile.voting_status === 'sudah' || isAllCompleted) ? 'text-emerald-700' : 'text-amber-700'}`}>{!accessSettings.voting_global_enabled ? 'Bilik Nonaktif' : (profile.voting_status === 'sudah' || isAllCompleted) ? 'Sudah Memilih' : 'Belum Memilih'}</span>
                </div>
              </div>
            </div>

            {/* Voting Section */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">Panel Pemungutan Suara</h3>
              </div>
              <div className="p-6 space-y-5">
                
                {/* Alokasi Sesi */}
                {isSessionConfigActive && (
                  <div className="space-y-1 pb-4 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alokasi Sesi</p>
                    {userSession ? (
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800">{userSession.nama_sesi}</h4>
                        <p className="text-xs text-slate-500 font-medium">{userSession.jam_mulai} - {userSession.jam_selesai} WIB</p>
                      </div>
                    ) : (
                      <div>
                        <h4 className="text-sm font-extrabold text-amber-700">Belum Dijadwalkan</h4>
                      </div>
                    )}
                  </div>
                )}

                {/* Alokasi Dapil */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alokasi Dapil</p>
                  {userDapil ? (
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 mb-1">{userDapil.name}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {userDapil.eligible_classes && userDapil.eligible_classes.length > 0 
                          ? userDapil.eligible_classes.join(', ') 
                          : 'Tidak ada kelompok kelas'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-500">Belum Dialokasikan</h4>
                      <p className="text-xs text-slate-400">Kelas Anda belum terdaftar di Dapil mana pun.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Helpdesk Section */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <LifeBuoy className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Layanan Bantuan
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Jika ada kendala atau membutuhkan informasi, silakan hubungi panitia melalui kanal berikut.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {helpdeskButtons.map((btn) => (
                    <a
                      key={btn.id}
                      href={btn.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 border border-slate-200 hover:border-indigo-100 hover:bg-slate-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition-all shadow-sm group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                      {btn.label}
                    </a>
                  ))}
                  {helpdeskButtons.length === 0 && (
                    <p className="col-span-2 text-center text-xs text-slate-400 italic py-2">
                      Layanan bantuan belum tersedia.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Digital Voter Card */}
          <div className="col-span-1 md:col-span-8 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Kartu Pemilih Digital</h2>
                <p className="text-slate-500 text-sm">Identitas untuk Pemilihan Umum</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {accessSettings.edit_profil_enabled && (
                  <button 
                    onClick={() => setIsEditModalOpen(true)} 
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shrink-0"
                    type="button"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Profil</span>
                  </button>
                )}
                {accessSettings.download_kartu_enabled && accessSettings.visibilitas_kartu_enabled && !(profile?.card_visibility === false && (profile?.voting_status === 'sudah' || isAllCompleted)) && (
                  <button 
                    onClick={handleDownload} 
                    disabled={isDownloading}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 shrink-0 disabled:opacity-50"
                    type="button"
                  >
                    <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                    <span>{isDownloading ? 'Sedang mengunduh...' : 'Download PNG'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* THE KARTU PU (VOTERS CARD) */}
            {profile?.card_visibility === false && (profile?.voting_status === 'sudah' || isAllCompleted) ? (
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Informasi Pemilih</h3>
                  <p className="text-slate-450 text-xs mt-1">Status penggunaan kartu pemilih digital Anda</p>
                  <div className="mt-4 p-3.5 bg-red-50 border border-red-100 rounded-xl text-xs flex flex-col gap-1.5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                      <span className="text-red-700 font-extrabold uppercase tracking-widest text-[10px]">Kartu Expired</span>
                    </div>
                    <p className="text-slate-700 font-semibold leading-relaxed">
                      Hak pilih Anda telah digunakan. <br className="hidden sm:inline"/>
                      Terima kasih telah berpartisipasi dalam pemilu.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</span>
                    <span className="block text-slate-800 text-base font-extrabold truncate">{profile.full_name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Terdaftar</span>
                    <span className="block text-slate-800 text-sm font-semibold truncate">{renderBlurredEmail(profile.email)}</span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kelas DPT</span>
                    <span className="block text-slate-800 text-sm font-black">{profile.class || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : !accessSettings.visibilitas_kartu_enabled ? (
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Informasi Pemilih</h3>
                  <p className="text-slate-400 text-xs mt-1">Data identitas Anda untuk verifikasi manual oleh panitia kesiswaan</p>
                  <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Kartu pemilih digital belum diterbitkan.
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Nama Lengkap</span>
                    <span className="block text-slate-800 text-base font-extrabold truncate">{profile.full_name}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Email Terdaftar</span>
                    <span className="block text-slate-800 text-sm font-semibold truncate">{renderBlurredEmail(profile.email)}</span>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest">Kelas DPT</span>
                    <span className="block text-slate-800 text-sm font-black">{profile.class || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-hidden flex justify-center bg-gray-100 sm:bg-transparent rounded-2xl">
                <div 
                  ref={cardRef} 
                  className="relative w-full max-w-[800px] aspect-[0.6/1] sm:aspect-[1.586/1] bg-gradient-to-br from-indigo-900 to-indigo-800 sm:rounded-2xl overflow-hidden sm:shadow-2xl sm:border-4 border-indigo-700 shrink-0 flex flex-col sm:block" 
                  style={{ backgroundColor: '#312e81' /* fallback color for image export */ }}
                >
                  {/* Card Background Pattern Overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                  </div>

                  {/* Card Header */}
                  <div className="relative p-6 sm:p-8 flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center shadow-md shrink-0 p-1">
                        <img 
                          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp" 
                          alt="PPU Logo" 
                          className="w-full h-full object-contain" 
                          crossOrigin="anonymous" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-black tracking-[0.15em] sm:tracking-[0.2em] text-lg sm:text-2xl truncate">VOTERS CARD</h3>
                        <p className="text-indigo-300 text-[9px] sm:text-xs font-bold uppercase tracking-widest leading-tight truncate">Portal Pemilihan Umum</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-indigo-200 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">Document Serial</p>
                      <p className="text-white font-mono text-[9px] sm:text-xs md:text-sm whitespace-nowrap overflow-visible">
                        PPU-26-{(profile.class || '').toUpperCase().replace(/[^A-Z0-9]/g, '')}{profile.card_id || '0000'}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="relative px-6 sm:px-8 py-4 sm:pt-2 sm:pb-16 flex flex-col sm:flex-row gap-6 sm:gap-10">
                    <div className="flex-1 flex flex-col gap-3 sm:gap-2.5 min-w-0">
                      <div>
                        <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">Nama Lengkap</label>
                        <p className="text-white text-xl sm:text-2xl font-bold truncate">{profile.full_name}</p>
                      </div>
                      <div>
                        <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">Email Terdaftar</label>
                        <p className="text-white text-md sm:text-lg truncate">{renderBlurredEmail(profile.email)}</p>
                      </div>
                      
                      {/* Kelas & Tanggal Cetak (Desktop Layout) */}
                      <div className="flex flex-col sm:flex-row sm:gap-12">
                        <div className="flex-1">
                          <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">Kelas</label>
                          <p className="text-white text-md sm:text-lg truncate">{profile.class || 'N/A'}</p>
                        </div>
                        {/* Tanggal Cetak (Desktop Only) */}
                        <div className="hidden sm:block flex-1">
                          <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">Tanggal Cetak</label>
                          <p className="text-white text-sm font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>

                      {/* Tanggal Cetak & ID Kartu (Mobile Only) */}
                      <div className="flex gap-8 mt-1 sm:hidden">
                        <div>
                          <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">Tanggal Cetak</label>
                          <p className="text-white text-sm font-medium">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="min-w-0">
                          <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">ID Kartu</label>
                          <p className="text-white text-sm font-medium uppercase truncate">{profile.card_id || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side Control: ID Kartu and QR Code container */}
                    <div className="flex flex-col items-center sm:items-start shrink-0">
                      {/* ID Kartu (Desktop Only, rendered above QR) */}
                      <div className="hidden sm:block mb-1.5 self-stretch">
                        <label className="block text-indigo-300 text-[10px] uppercase font-bold tracking-wider mb-1">ID Kartu</label>
                        <p className="text-white text-sm font-semibold uppercase truncate">{profile.card_id || 'N/A'}</p>
                      </div>

                      {/* QR Code */}
                      <div className="w-48 h-48 sm:w-[136px] sm:h-[136px] bg-white p-2 sm:p-2 rounded-xl shadow-inner flex flex-col items-center justify-center self-center sm:self-start mt-3 sm:mt-0 shrink-0">
                        <div className="w-full h-full border-2 border-slate-100 flex flex-col items-center justify-center p-2">
                           <QRCodeCanvas ref={qrRef} value={profile.card_id || ''} size={150} style={{ width: '100%', height: 'calc(100% - 14px)' }} />
                           <p className="text-[7px] text-slate-400 mt-2 font-mono">VERIFIED IDENTITY</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="sm:absolute bottom-0 left-0 right-0 h-auto sm:h-16 mt-auto sm:mt-0 bg-black/20 backdrop-blur-sm p-4 sm:px-8 flex items-center border-t border-white/10">
                    <p className="text-white/60 text-[10px] sm:text-[11px] leading-relaxed italic text-center sm:text-left">
                      Tunjukkan kartu ini kepada panitia di tempat pemilihan untuk melakukan pemilihan. Kartu ini merupakan bukti identitas sah dalam sistem PPU Digital.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Call to action for full Information Page */}
        <div className="mt-12 pt-10 border-t border-slate-200">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-xl">
            {/* Background Decorative */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-6 shadow-lg backdrop-blur-sm">
                <Megaphone className="w-8 h-8 text-indigo-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase mb-4">
                Pusat Informasi WAFO
              </h2>
              <p className="text-indigo-100 font-medium text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8">
                Dapatkan update terbaru, pengumuman resmi, dan panduan lengkap seputar pelaksanaan pemilihan umum digital melalui halaman Informasi terpadu.
              </p>
              <Link 
                to="/informasi"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl hover:scale-105 active:scale-95 group"
              >
                <span>Lihat Seluruh Informasi</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Info Bar */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 px-4 sm:px-8 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-widest shrink-0">
        <div className="flex gap-2 sm:gap-4">
          <span>Version 1.0.4 Foundation</span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline">Secure Node: Jakarta-S-01</span>
        </div>
        <div>
          Copyright &copy; 2026 PPU Digital
        </div>
      </footer>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="bg-indigo-900 text-white p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold">Lengkapi / Edit Profil</h3>
                <p className="text-xs text-indigo-200">Perbarui nama lengkap dan kelas Anda</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="text-white hover:text-indigo-200 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 text-red-600 text-xs font-semibold p-3 rounded-xl border border-red-100">
                  {editError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Nama Lengkap Anda"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kelas</label>
                <div className="relative">
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={toggleDropdown}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center"
                  >
                    <span>{editClass || 'Pilih Kelas'}</span>
                    <span className="text-slate-400 text-xs">▼</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold text-sm rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-100"
                >
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Dropdown Portal */}
      {dropdownOpen && (
        <div 
          ref={dropdownRef}
          className="fixed z-[100] bg-white border border-slate-200 rounded-xl shadow-xl p-3 max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top + 'px',
            left: dropdownPosition.left + 'px',
            width: dropdownPosition.width + 'px',
          }}
        >
          {/* Special Classes (GTK) Section */}
          {specialClasses.length > 0 && (
            <div className="mb-3 pb-2 border-b border-slate-100 flex flex-wrap gap-2">
              {specialClasses.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setEditClass(cls);
                    setDropdownOpen(false);
                  }}
                  className={`flex-1 py-1 text-[11px] text-center rounded hover:bg-indigo-50 hover:text-indigo-650 font-bold transition-all border ${
                    editClass === cls ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 border-slate-150 bg-white'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {['X', 'XI', 'XII'].map((grade, idx) => {
              const cols = [col1, col2, col3];
              return (
                <div key={grade} className="space-y-1">
                  <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100 pb-1 mb-1 text-center font-mono">{grade}</div>
                  {cols[idx].map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setEditClass(cls);
                        setDropdownOpen(false);
                      }}
                      className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 hover:text-indigo-650 font-bold transition-all ${
                        editClass === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-slate-600'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
