import React, { useRef, useState, useEffect } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { QRCodeCanvas } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { LogOut, Download, MessageSquare, LifeBuoy, Edit3, X, Info, CalendarDays, FileText, AlertCircle, Megaphone, ChevronRight, Clock, MapPin, Home, CreditCard, QrCode, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getHelpdeskButtons } from '../../lib/helpdesk';
import { HelpdeskButton, Dapil } from '../../types';
import { supabase } from '../../lib/supabase';
import { getUserAccessSettings, UserAccessSettings } from '../../lib/userAccessService';
import { getVotingCompletionStatus, getDapils } from '../../lib/votingService';
import { getGelombangConfigActive, getGelombangSesiList, GelombangSesi } from '../../lib/gelombangService';
import { ALL_CLASSES } from '../../lib/classConstants';
import WafoSlider from '../../components/WafoSlider';
import StatusTab from '../../components/user/StatusTab';
import VoterCardTab from '../../components/user/VoterCardTab';
import ScanQrTab from '../../components/user/ScanQrTab';
import ProfileTab from '../../components/user/ProfileTab';
import InformasiTab from '../../components/user/InformasiTab';

export default function UserDashboard() {
  const { profile, signOut } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
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

  const [activeTab, setActiveTab] = useState<'status' | 'kartu' | 'scan' | 'profil' | 'informasi'>('status');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('wafo_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching WAFO inside Dashboard tab:", error);
      } else {
        setAnnouncements(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInfoLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'informasi') {
      setInfoLoading(true);
      fetchAnnouncements();
    }
  }, [activeTab]);

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
    <div className="h-screen bg-slate-50 dark:bg-[#1a1a1a] font-sans text-slate-900 dark:text-[#f5f5f5] flex flex-col overflow-hidden transition-colors duration-300">
      {/* Top Navigation */}
      <nav className="h-16 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-[#2a2a2a] px-4 sm:px-8 flex items-center justify-between shadow-sm z-10 shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-sm overflow-hidden flex items-center justify-center shadow-sm shrink-0">
            <img 
              src={isDark ? "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp" : "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"} 
              alt="PPU Logo" 
              className="w-full h-full object-contain p-0.5" 
            />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-800 dark:text-slate-150 transition-colors">PPU <span className="hidden sm:inline font-normal text-slate-500 dark:text-[#a3a3a3] text-sm ml-2">Portal Pemilihan Umum</span></span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Theme Toggle Button */}
          <button
            type="button"
            className="text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors focus:outline-none flex items-center justify-center"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
          >
            <span className="css-icon-container" aria-hidden="true">
              <span className={theme === 'dark' ? 'css-icon-moon' : 'css-icon-sun'} />
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-none text-slate-800 dark:text-[#f5f5f5] transition-colors">{profile.full_name}</p>
              <p className="text-[10px] text-slate-400 dark:text-[#a3a3a3]">User ID: {(profile.id || '').split('-')[0].toUpperCase()}</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-100 dark:bg-[#2a2a2a] flex items-center justify-center border border-indigo-200 dark:border-[#333333] text-indigo-700 dark:text-[#f5f5f5] font-bold uppercase transition-colors">
              {profile.full_name.substring(0, 2)}
            </div>
            <button onClick={handleLogout} className="ml-1 sm:ml-2 text-slate-400 dark:text-[#a3a3a3] hover:text-red-500 dark:hover:text-red-400 group transition-colors focus:outline-none" title="Logout">
              <LogOut className="w-5 h-5 group-hover:stroke-red-500 dark:group-hover:stroke-red-400" />
            </button>
          </div>
        </div>
      </nav>

      {/* Alert if Profile is Incomplete (Always visible on top of scrollable area, if incomplete) */}
      {accessSettings.edit_profil_enabled && (!profile.full_name || !profile.class) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-3 sm:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-10 shrink-0 select-none animate-fade-in transition-colors">
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-700 dark:text-amber-300 font-bold text-xs">!</span>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-semibold text-left transition-colors">
              Data profil Anda belum lengkap. Silakan lengkapi Nama Lengkap dan Kelas Anda agar kartu pemilih Anda sah & dapat diverifikasi oleh panitia.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-amber-900 dark:text-amber-350 hover:text-amber-700 dark:hover:text-amber-200 underline shrink-0 transition-colors focus:outline-none"
          >
            Lengkapi Profil Sekarang &rarr;
          </button>
        </div>
      )}

      {/* Main Scrollable Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-28 w-full max-w-7xl mx-auto transition-all duration-300">
        {activeTab === 'status' && (
          <StatusTab
            profile={profile}
            isAllCompleted={isAllCompleted}
            isSessionConfigActive={isSessionConfigActive}
            userSession={userSession}
            userDapil={userDapil}
            accessSettings={accessSettings}
            helpdeskButtons={helpdeskButtons}
          />
        )}

        {activeTab === 'kartu' && (
          <VoterCardTab
            profile={profile}
            isAllCompleted={isAllCompleted}
            accessSettings={accessSettings}
            isDownloading={isDownloading}
            handleDownload={handleDownload}
            cardRef={cardRef}
            qrRef={qrRef}
            renderBlurredEmail={renderBlurredEmail}
          />
        )}

        {activeTab === 'scan' && (
          <ScanQrTab />
        )}

        {activeTab === 'profil' && (
          <ProfileTab
            profile={profile}
            accessSettings={accessSettings}
            setIsEditModalOpen={setIsEditModalOpen}
            isAllCompleted={isAllCompleted}
          />
        )}

        {activeTab === 'informasi' && (
          <InformasiTab
            announcements={announcements}
            infoLoading={infoLoading}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-[#2a2a2a] py-2 px-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-40 transition-colors duration-300">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          {/* Tab 1: Status */}
          <button
            onClick={() => setActiveTab('status')}
            className="flex flex-col items-center justify-center flex-1 py-1 relative focus:outline-none bg-transparent border-none outline-none"
            type="button"
          >
            <Home className={`w-5 h-5 transition-colors ${
              activeTab === 'status' ? 'text-ppu-blue dark:text-sky-400' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`} />
            <span className={`text-[10px] mt-1 transition-colors font-medium ${
              activeTab === 'status' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`}>
              Status
            </span>
            {activeTab === 'status' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-ppu-blue dark:bg-sky-400 rounded-full" />
            )}
          </button>

          {/* Tab 2: Kartu Pemilih */}
          <button
            onClick={() => setActiveTab('kartu')}
            className="flex flex-col items-center justify-center flex-1 py-1 relative focus:outline-none bg-transparent border-none outline-none"
            type="button"
          >
            <CreditCard className={`w-5 h-5 transition-colors ${
              activeTab === 'kartu' ? 'text-ppu-blue dark:text-sky-400' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`} />
            <span className={`text-[10px] mt-1 transition-colors font-medium ${
              activeTab === 'kartu' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`}>
              Kartu
            </span>
            {activeTab === 'kartu' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-ppu-blue dark:bg-sky-400 rounded-full" />
            )}
          </button>

          {/* Tab 3: Scan QR (Prominent highlighted button) */}
          <div className="flex-1 flex justify-center -mt-5">
            <button
              onClick={() => setActiveTab('scan')}
              className="flex flex-col items-center justify-center focus:outline-none bg-transparent border-none outline-none"
              type="button"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                activeTab === 'scan'
                  ? 'bg-ppu-blue dark:bg-sky-500 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/50'
                  : 'bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] text-slate-500 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400 shadow-md'
              }`}>
                <QrCode className="w-7 h-7" />
              </div>
              <span className={`text-[10px] mt-1 transition-colors font-semibold ${
                activeTab === 'scan' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-[#a3a3a3]'
              }`}>
                Scan QR
              </span>
            </button>
          </div>

          {/* Tab 4: Profil */}
          <button
            onClick={() => setActiveTab('profil')}
            className="flex flex-col items-center justify-center flex-1 py-1 relative focus:outline-none bg-transparent border-none outline-none"
            type="button"
          >
            <User className={`w-5 h-5 transition-colors ${
              activeTab === 'profil' ? 'text-ppu-blue dark:text-sky-400' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`} />
            <span className={`text-[10px] mt-1 transition-colors font-medium ${
              activeTab === 'profil' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`}>
              Profil
            </span>
            {activeTab === 'profil' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-ppu-blue dark:bg-sky-400 rounded-full" />
            )}
          </button>

          {/* Tab 5: Informasi */}
          <button
            onClick={() => setActiveTab('informasi')}
            className="flex flex-col items-center justify-center flex-1 py-1 relative focus:outline-none bg-transparent border-none outline-none"
            type="button"
          >
            <Info className={`w-5 h-5 transition-colors ${
              activeTab === 'informasi' ? 'text-ppu-blue dark:text-sky-400' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`} />
            <span className={`text-[10px] mt-1 transition-colors font-medium ${
              activeTab === 'informasi' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-400 dark:text-[#a3a3a3]'
            }`}>
              Informasi
            </span>
            {activeTab === 'informasi' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 bg-ppu-blue dark:bg-sky-400 rounded-full" />
            )}
          </button>

        </div>
      </nav>

      {/* Edit Profile Modal Dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#2a2a2a] rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-[#333333] overflow-hidden animate-scale-up transition-colors">
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
                <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl border border-red-100 dark:border-red-900/50">
                  {editError}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#a3a3a3] uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-[#333333] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-[#f5f5f5] transition-colors"
                  placeholder="Nama Lengkap Anda"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-[#a3a3a3] uppercase tracking-wider mb-1.5">Kelas</label>
                <div className="relative">
                  <button
                    type="button"
                    ref={triggerRef}
                    onClick={toggleDropdown}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#333333] rounded-xl text-sm text-left bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-[#f5f5f5] focus:outline-none focus:ring-2 focus:ring-indigo-500 flex justify-between items-center transition-colors"
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
                  className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[#333333] hover:bg-slate-200 dark:hover:bg-opacity-80 text-slate-700 dark:text-[#f5f5f5] font-bold text-sm rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-indigo-100 dark:shadow-none"
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
          className="fixed z-[100] bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-xl shadow-xl p-3 max-h-60 overflow-y-auto transition-colors"
          style={{
            top: dropdownPosition.top + 'px',
            left: dropdownPosition.left + 'px',
            width: dropdownPosition.width + 'px',
          }}
        >
          {/* Special Classes (GTK) Section */}
          {specialClasses.length > 0 && (
            <div className="mb-3 pb-2 border-b border-slate-100 dark:border-[#333333] flex flex-wrap gap-2">
              {specialClasses.map(cls => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    setEditClass(cls);
                    setDropdownOpen(false);
                  }}
                  className={`flex-1 py-1 text-[11px] text-center rounded hover:bg-indigo-50 dark:hover:bg-[#333333] hover:text-indigo-650 dark:hover:text-[#a3a3a3] font-bold transition-all border ${
                    editClass === cls ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 dark:text-[#a3a3a3] border-slate-150 dark:border-[#333333] bg-white dark:bg-[#1a1a1a]'
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
                  <div className="text-[9px] uppercase font-bold text-slate-400 dark:text-[#a3a3a3] border-b border-slate-100 dark:border-[#333333] pb-1 mb-1 text-center font-mono">{grade}</div>
                  {cols[idx].map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setEditClass(cls);
                        setDropdownOpen(false);
                      }}
                      className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 dark:hover:bg-[#333333] hover:text-indigo-650 dark:hover:text-white font-bold transition-all ${
                        editClass === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-slate-600 dark:text-[#a3a3a3]'
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
