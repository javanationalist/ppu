import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Settings, BarChart, FileText, LifeBuoy, Menu, X, ShieldCheck, Layers, Eye, ShieldAlert, Lock, Clock, Timer } from 'lucide-react';
import { getAdminButtonSettings, AdminButtonSettings } from '../lib/adminButtonService';

export const AdminLayout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [btnSettings, setBtnSettings] = useState<AdminButtonSettings | null>(null);

  useEffect(() => {
    const loadBtnSettings = async () => {
      try {
        const s = await getAdminButtonSettings();
        setBtnSettings(s);
      } catch (err) {
        console.error('Failed to load admin button settings', err);
      }
    };
    loadBtnSettings();
    const interval = setInterval(loadBtnSettings, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (btnSettings) {
      const currentLink = navLinks.find(link => 
        location.pathname === link.to || 
        (link.to !== '/admin' && location.pathname.startsWith(link.to + '/'))
      );
      if (currentLink && currentLink.key && !isLinkEnabled(currentLink.key)) {
        navigate('/admin/akses-pro', { replace: true });
      }
    }
  }, [location.pathname, btnSettings]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/admin', icon: Home, label: 'Dashboard' },
    { to: '/admin/gelombang', icon: Clock, label: 'Gelombang Voting', key: 'gelombang_voting' },
    { to: '/admin/pengaturan', icon: Settings, label: 'Kelola Kategori', key: 'kelola_kategori' },
    { to: '/admin/kandidat', icon: Layers, label: 'Kelola Kandidat', key: 'kelola_kandidat' },
    { to: '/admin/konfirmasi', icon: ShieldCheck, label: 'Konfirmasi Pemilih', key: 'konfirmasi_pemilih' },
    { to: '/admin/pemilih', icon: Users, label: 'Kelola Pemilih', key: 'kelola_pemilih' },
    { to: '/admin/wafo', icon: FileText, label: 'WAFO (Warung Informasi)', key: 'wafo' },
    { to: '/admin/countdown', icon: Timer, label: 'Countdown', key: 'countdown' },
    { to: '/admin/helpdesk', icon: LifeBuoy, label: 'Kelola Helpdesk', key: 'kelola_helpdesk' },
    { to: '/admin/hasil', icon: BarChart, label: 'Hasil Voting', key: 'hasil_voting' },
    { to: '/admin/audit', icon: FileText, label: 'Audit Log', key: 'audit_log' },
    { to: '/admin/export', icon: FileText, label: 'Export Data', key: 'export_data' },
    { to: '/admin/maintenance', icon: Settings, label: 'Maintenance', key: 'maintenance' },
  ];

  const isLinkEnabled = (key?: string): boolean => {
    if (!key) return true;
    if (!btnSettings) return true; // Default to allow access until loaded
    return (btnSettings as any)[key] !== false;
  };

  const closeSidebar = () => setIsMobileOpen(false);

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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const enabled = isLinkEnabled(link.key);
            
            const content = (
              <>
                <div className="flex items-center gap-3">
                  <link.icon className={`w-5 h-5 ${!enabled ? 'text-gray-400' : isActive ? 'text-ppu-blue' : 'text-gray-500'}`} />
                  <span>{link.label}</span>
                </div>
                {!enabled && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              </>
            );

            if (!enabled) {
              return (
                <div
                  key={link.to}
                  className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg bg-[#F5F7FA] text-gray-400 select-none pb-2"
                  style={{
                    filter: "blur(1.5px)",
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
                key={link.to}
                to={link.to}
                onClick={closeSidebar}
                className={`flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'bg-ppu-blue-light text-ppu-blue font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {content}
              </Link>
            );
          })}
          <button
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-[#E31B23]/10 transition-colors"
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
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            const enabled = isLinkEnabled(link.key);
            
            const content = (
              <>
                <div className="flex items-center gap-3">
                  <link.icon className={`w-5 h-5 ${!enabled ? 'text-gray-400' : isActive ? 'text-ppu-blue' : 'text-gray-500'}`} />
                  <span>{link.label}</span>
                </div>
                {!enabled && <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              </>
            );

            if (!enabled) {
              return (
                <div
                  key={link.to}
                  className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg bg-[#F5F7FA] text-gray-400 select-none pb-2"
                  style={{
                    filter: "blur(1.5px)",
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
                key={link.to}
                to={link.to}
                className={`flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'bg-ppu-blue-light text-ppu-blue font-bold'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {content}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-[#E31B23]/10 transition-colors"
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
