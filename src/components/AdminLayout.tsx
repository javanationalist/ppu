import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Users, Settings, BarChart, FileText, LifeBuoy, Menu, X, ShieldCheck, Layers, Eye, ShieldAlert } from 'lucide-react';

export const AdminLayout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/admin', icon: Home, label: 'Dashboard' },
    { to: '/admin/pengaturan', icon: Settings, label: 'Kelola Kategori' },
    { to: '/admin/kandidat', icon: Layers, label: 'Kelola Kandidat' },
    { to: '/admin/konfirmasi', icon: ShieldCheck, label: 'Konfirmasi Pemilih' },
    { to: '/admin/pemilih', icon: Users, label: 'Kelola Pemilih' },
    { to: '/admin/wafo', icon: FileText, label: 'WAFO (Warung Informasi)' },
    { to: '/admin/helpdesk', icon: LifeBuoy, label: 'Kelola Helpdesk' },
    { to: '/admin/visibilitas', icon: ShieldAlert, label: 'Visibilitas User' },
    { to: '/admin/hasil', icon: BarChart, label: 'Hasil Voting' },
    { to: '/admin/audit', icon: FileText, label: 'Audit Log' },
    { to: '/admin/export', icon: FileText, label: 'Export Data' },
    { to: '/admin/maintenance', icon: Settings, label: 'Maintenance' },
  ];

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
          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
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
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={() => {
              closeSidebar();
              handleLogout();
            }}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-500'}`} />
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center gap-3 px-3 py-2 text-sm font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors"
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
