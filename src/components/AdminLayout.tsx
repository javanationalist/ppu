import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Settings, BarChart, FileText, LifeBuoy, Menu, X, ShieldCheck, Layers, Lock, Clock, Timer, Monitor, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { getAdminButtonSettings, AdminButtonSettings, subscribeToAdminButtonSettings } from '../lib/adminButtonService';
import { motion, AnimatePresence } from 'motion/react';

const ROUTE_KEY_MAP: Record<string, keyof AdminButtonSettings> = {
  '/admin/gelombang': 'gelombang_voting',
  '/admin/mode-vote': 'mode_vote',
  '/admin/pengaturan': 'kelola_kategori',
  '/admin/kategori': 'kelola_kategori',
  '/admin/kandidat': 'kelola_kandidat',
  '/admin/pemilih': 'kelola_pemilih',
  '/admin/scanner': 'kelola_pemilih',
  '/admin/admins': 'kelola_admin',
  '/admin/bilik': 'kelola_bilik',
  '/admin/helpdesk': 'kelola_helpdesk',
  '/admin/hasil': 'hasil_voting',
  '/admin/konfirmasi': 'konfirmasi_pemilih',
  '/admin/scanner-pro': 'konfirmasi_pemilih',
  '/admin/confirm-account': 'konfirmasi_pemilih',
  '/confirm-account': 'konfirmasi_pemilih',
  '/admin/countdown': 'countdown',
  '/admin/wafo': 'wafo',
  '/admin/maintenance': 'maintenance',
  '/admin/audit': 'audit_log',
  '/admin/export': 'export_data',
  '/admin/system-update': 'system_update',
};

interface GroupItem {
  to: string;
  label: string;
  icon: any;
  key?: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: GroupItem[];
}

export const AdminLayout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [btnSettings, setBtnSettings] = useState<AdminButtonSettings | null>(null);
  const [voteMode, setVoteMode] = useState<'regular' | 'booth'>('regular');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    dashboard: true, // Default open Dashboard
  });

  const groups: NavGroup[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      items: [
        { to: '/admin', icon: Home, label: 'Utama' },
        { to: '/admin/gelombang', icon: Clock, label: 'Gelombang Voting', key: 'gelombang_voting' },
        { to: '/admin/mode-vote', icon: Settings, label: 'Mode Vote', key: 'mode_vote' },
      ],
    },
    {
      id: 'kelola',
      title: 'Kelola',
      items: [
        { to: '/admin/pengaturan', icon: Settings, label: 'Kelola Kategori', key: 'kelola_kategori' },
        { to: '/admin/kandidat', icon: Layers, label: 'Kelola Kandidat', key: 'kelola_kandidat' },
        { to: '/admin/pemilih', icon: Users, label: 'Kelola Pemilih', key: 'kelola_pemilih' },
        { to: '/admin/scanner', icon: Zap, label: 'Kelola Scanner', key: 'kelola_pemilih' },
        { to: '/admin/admins', icon: ShieldCheck, label: 'Kelola Admin', key: 'kelola_admin' },
        ...(voteMode === 'booth' ? [{ to: '/admin/bilik', icon: Monitor, label: 'Kelola Bilik Suara', key: 'kelola_bilik' }] : []),
        { to: '/admin/helpdesk', icon: LifeBuoy, label: 'Kelola Helpdesk', key: 'kelola_helpdesk' },
        { to: '/admin/hasil', icon: BarChart, label: 'Hasil Voting', key: 'hasil_voting' },
      ],
    },
    {
      id: 'konfirmasi',
      title: 'Konfirmasi',
      items: [
        { to: '/admin/konfirmasi', icon: ShieldCheck, label: 'Konfirmasi Pemilih', key: 'konfirmasi_pemilih' },
      ],
    },
    {
      id: 'lainnya',
      title: 'Lainnya',
      items: [
        { to: '/admin/countdown', icon: Timer, label: 'Countdown', key: 'countdown' },
        { to: '/admin/wafo', icon: FileText, label: 'WAFO (Warung Informasi)', key: 'wafo' },
        { to: '/admin/maintenance', icon: Settings, label: 'Maintenance', key: 'maintenance' },
      ],
    },
    {
      id: 'data',
      title: 'Data',
      items: [
        { to: '/admin/audit', icon: FileText, label: 'Audit Log', key: 'audit_log' },
        { to: '/admin/export', icon: FileText, label: 'Export Data', key: 'export_data' },
        { to: '/admin/system-update', icon: Sparkles, label: 'System Update', key: 'system_update' },
      ],
    },
  ];

  const isItemActive = (to: string): boolean => {
    if (to === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  const isGroupActive = (group: NavGroup): boolean => {
    return group.items.some(item => isItemActive(item.to));
  };

  useEffect(() => {
    const loadBtnSettings = async () => {
      try {
        const s = await getAdminButtonSettings();
        setBtnSettings(s);
      } catch (err) {
        console.error('Failed to load admin button settings', err);
      }
    };
    const loadVoteMode = async () => {
      try {
        const { getVoteMode } = await import('../lib/voteModeService');
        const mode = await getVoteMode();
        setVoteMode(mode);
      } catch (err) {
        console.error('Failed to load vote mode', err);
      }
    };

    loadBtnSettings();
    loadVoteMode();

    const unsubscribeRealtime = subscribeToAdminButtonSettings((updatedSettings) => {
      setBtnSettings(updatedSettings);
    });

    const interval = setInterval(() => {
      loadBtnSettings();
      loadVoteMode();
    }, 4000);

    return () => {
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (btnSettings && location.pathname !== '/admin' && location.pathname !== '/admin/akses-pro') {
      const currentPath = location.pathname;
      const matchedRoute = Object.keys(ROUTE_KEY_MAP).find(route => 
        currentPath === route || currentPath.startsWith(route + '/')
      );
      if (matchedRoute) {
        const key = ROUTE_KEY_MAP[matchedRoute];
        if (key && (btnSettings as any)[key] === false) {
          navigate('/admin/akses-pro', { replace: true });
        }
      }
    }
  }, [location.pathname, btnSettings, voteMode]);

  useEffect(() => {
    const activeGroup = groups.find(isGroupActive);
    if (activeGroup) {
      setOpenGroups(prev => ({
        ...prev,
        [activeGroup.id]: true
      }));
    }
  }, [location.pathname, voteMode]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isLinkEnabled = (key?: string): boolean => {
    if (!key) return true;
    if (!btnSettings) return true;
    return (btnSettings as any)[key] !== false;
  };

  const getSortedGroupItems = (items: GroupItem[]) => {
    return [...items].sort((a, b) => {
      const aEnabled = isLinkEnabled(a.key);
      const bEnabled = isLinkEnabled(b.key);
      if (aEnabled && !bEnabled) return -1;
      if (!aEnabled && bEnabled) return 1;
      return 0;
    });
  };

  const closeSidebar = () => setIsMobileOpen(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const renderSidebarContent = (isMobile: boolean = false) => {
    return (
      <div className="space-y-4">
        {groups.map((group) => {
          const isOpen = !!openGroups[group.id];
          const hasActiveChild = isGroupActive(group);
          const sortedItems = getSortedGroupItems(group.items);

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
                  hasActiveChild 
                    ? 'text-ppu-blue' 
                    : 'text-gray-400 hover:text-gray-650'
                }`}
              >
                <span>{group.title}</span>
                <ChevronRight 
                  className={`w-3.5 h-3.5 transition-transform duration-250 ${
                    isOpen ? 'rotate-90 text-ppu-blue' : 'text-gray-400'
                  }`} 
                />
              </button>

              {/* Submenu with height animation */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden space-y-1 pl-4"
                  >
                    {sortedItems.map((item) => {
                      const isActive = isItemActive(item.to);
                      const enabled = isLinkEnabled(item.key);

                      const content = (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <item.icon 
                              className={`w-4 h-4 shrink-0 ${
                                !enabled 
                                  ? 'text-gray-400' 
                                  : isActive 
                                    ? 'text-ppu-blue' 
                                    : 'text-gray-500 hover:text-gray-750'
                              }`} 
                            />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {!enabled && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                        </>
                      );

                      if (!enabled) {
                        return (
                          <div
                            key={item.to}
                            className="flex items-center justify-between px-3 py-1.5 text-[13px] font-semibold rounded-lg bg-[#F5F7FA] text-gray-400 select-none pb-1.5"
                            style={{
                              filter: "blur(0.8px)",
                              opacity: 0.5,
                              cursor: "not-allowed",
                              userSelect: "none",
                              pointerEvents: "none"
                            }}
                          >
                            {content}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={isMobile ? closeSidebar : undefined}
                          className={`flex items-center justify-between px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${
                            isActive
                              ? 'bg-ppu-blue-light text-ppu-blue font-bold'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
                          }`}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row bg-gray-50 min-h-screen overflow-x-hidden w-full relative">
      {/* Mobile Header */}
      <div className="lg:hidden h-16 w-full bg-white border-b flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30">
        <img
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
          alt="PPU Logo"
          className="h-10 w-auto"
        />
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-gray-600 hover:text-ppu-blue hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Backdrop for Mobile Drawer */}
      {isMobileOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out shadow-xl flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="h-10 w-auto"
          />
          <button
            onClick={closeSidebar}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {renderSidebarContent(true)}
          <button
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-[#E31B23]/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </div>

      {/* Desktop Sidebar (Permanent) */}
      <div className="hidden lg:flex lg:flex-col w-64 bg-white border-r h-screen sticky top-0 shrink-0">
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="h-10 w-auto"
          />
        </div>
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {renderSidebarContent(false)}
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-[#E31B23]/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 max-w-full overflow-x-hidden">
        <Outlet />
      </div>
    </div>
  );
};
