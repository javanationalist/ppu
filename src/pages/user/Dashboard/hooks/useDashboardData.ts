import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as htmlToImage from 'html-to-image';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import { getHelpdeskButtons } from '../../../../lib/helpdesk';
import { HelpdeskButton, Dapil } from '../../../../types';
import { supabase } from '../../../../lib/supabase';
import { getUserAccessSettings, UserAccessSettings } from '../../../../lib/userAccessService';
import { getVotingCompletionStatus, getDapils } from '../../../../lib/votingService';
import { getGelombangConfigActive, getGelombangSesiList, GelombangSesi } from '../../../../lib/gelombangService';
import { getVoteMode } from '../../../../lib/voteModeService';

export function useDashboardData() {
  const { profile, signOut } = useAuth();
  const { isDark, theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
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
  const [voteMode, setVoteMode] = useState<'regular' | 'booth'>('regular');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [infoLoading, setInfoLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

  // Popover States and Refs
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [isLogoutPopoverOpen, setIsLogoutPopoverOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const logoutRef = useRef<HTMLDivElement>(null);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState(profile?.full_name || '');
  const [editClass, setEditClass] = useState(profile?.class || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setIsStatusPopoverOpen(false);
      }
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setIsLogoutPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const persistedId = localStorage.getItem('ppu_active_voting_session_id');
    if (persistedId) {
      setActiveTab('scan');
      setIsVoting(true);
    }
  }, []);

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

  const fetchHelpdeskAndSettings = async (isBackground = false) => {
    try {
      const [data, s, mode] = await Promise.all([
        getHelpdeskButtons(),
        getUserAccessSettings(),
        getVoteMode()
      ]);
      setHelpdeskButtons(data);
      setAccessSettings(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(s)) return s;
        return prev;
      });
      setVoteMode(mode);

      if (profile?.id) {
        const status = await getVotingCompletionStatus(profile.id);
        setIsAllCompleted(prev => {
          if (prev !== status.allCompleted) return status.allCompleted;
          return prev;
        });

        const voterClass = profile.class || '';

        try {
          const sessionActive = await getGelombangConfigActive();
          setIsSessionConfigActive(sessionActive);
          if (sessionActive) {
            const listSesi = await getGelombangSesiList();
            const foundSesi = listSesi.find(s => s.kelas.includes(voterClass));
            setUserSession(prev => {
              if (JSON.stringify(prev) !== JSON.stringify(foundSesi)) return foundSesi || null;
              return prev;
            });
          }
        } catch (sessionErr) {
          console.error('Failed to fetch session configurations:', sessionErr);
        }

        try {
          const listDapil = await getDapils();
          const foundDapil = listDapil.find(d => d.eligible_classes.includes(voterClass));
          setUserDapil(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(foundDapil)) return foundDapil || null;
            return prev;
          });
        } catch (dapilErr) {
          console.error('Failed to fetch dapils:', dapilErr);
        }
      }
    } catch (err) {
      console.error('Failed to load helpdesk or settings:', err);
    } finally {
      if (!isBackground) {
        setDashboardLoading(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'informasi') {
      setInfoLoading(true);
      fetchAnnouncements();
    } else if (activeTab === 'scan') {
      fetchHelpdeskAndSettings(true);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchHelpdeskAndSettings(false);
  }, [profile]);

  useEffect(() => {
    if (!profile?.id) return;

    const profileChannel = supabase
      .channel(`profile_dashboard_changes_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${profile.id}`,
        },
        () => {
          fetchHelpdeskAndSettings(true);
        }
      )
      .subscribe();

    const votesChannel = supabase
      .channel(`votes_dashboard_changes_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `voter_id=eq.${profile.id}`,
        },
        () => {
          fetchHelpdeskAndSettings(true);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHelpdeskAndSettings(true);
      }
    }, 3000);

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(votesChannel);
      clearInterval(interval);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (profile) {
      setEditFullName(profile.full_name || '');
      setEditClass(profile.class || '');
    }
  }, [profile]);

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

  const handleSaveProfile = async (e: FormEvent) => {
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
      window.location.reload();
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

  return {
    profile,
    isDark,
    theme,
    toggleTheme,
    cardRef,
    qrRef,
    isDownloading,
    dashboardLoading,
    helpdeskButtons,
    isAllCompleted,
    isSessionConfigActive,
    userSession,
    userDapil,
    accessSettings,
    activeTab,
    setActiveTab,
    voteMode,
    announcements,
    infoLoading,
    isVoting,
    setIsVoting,
    isStatusPopoverOpen,
    setIsStatusPopoverOpen,
    isLogoutPopoverOpen,
    setIsLogoutPopoverOpen,
    statusRef,
    logoutRef,
    isEditModalOpen,
    setIsEditModalOpen,
    editFullName,
    setEditFullName,
    editClass,
    setEditClass,
    editLoading,
    editError,
    dropdownOpen,
    setDropdownOpen,
    triggerRef,
    dropdownRef,
    dropdownPosition,
    toggleDropdown,
    handleSaveProfile,
    handleLogout,
    handleDownload,
  };
}
