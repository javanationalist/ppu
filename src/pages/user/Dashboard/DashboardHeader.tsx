import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { LogOut, Home, Sun, Moon, Bell } from 'lucide-react';
import { Profile } from '../../../types';

interface DashboardHeaderProps {
  profile: Profile;
  isDark: boolean;
  theme: string;
  toggleTheme: () => void;
  isStatusPopoverOpen: boolean;
  setIsStatusPopoverOpen: (open: boolean) => void;
  isLogoutPopoverOpen: boolean;
  setIsLogoutPopoverOpen: (open: boolean) => void;
  statusRef: React.RefObject<HTMLDivElement | null>;
  logoutRef: React.RefObject<HTMLDivElement | null>;
  isVoting: boolean;
  handleLogout: () => void;
}

export function DashboardHeader({
  profile,
  isDark,
  theme,
  toggleTheme,
  isStatusPopoverOpen,
  setIsStatusPopoverOpen,
  isLogoutPopoverOpen,
  setIsLogoutPopoverOpen,
  statusRef,
  logoutRef,
  isVoting,
  handleLogout,
}: DashboardHeaderProps) {
  return (
    <nav className="h-16 bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-[#2a2a2a] px-4 sm:px-8 flex items-center justify-between shadow-sm z-15 shrink-0 transition-colors duration-300 animate-fade-in">
      {/* Left: Logo PPU */}
      <div className="flex items-center">
        <img 
          src={isDark ? "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp" : "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"} 
          alt="PPU Logo" 
          className="h-9 sm:h-11 w-auto object-contain transition-all" 
        />
      </div>

      {/* Right: Confirmation status, Toggle theme, and Logout dropdown */}
      <div className="flex items-center gap-3">
        {/* Status Konfirmasi */}
        <div 
          ref={statusRef} 
          className="relative"
          onMouseEnter={() => setIsStatusPopoverOpen(true)}
          onMouseLeave={() => setIsStatusPopoverOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#252525]/45 dark:hover:bg-[#303030]/60 border border-slate-200 dark:border-slate-800 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none"
            aria-label="Status Akun"
          >
            <span className={`w-3 h-3 rounded-full ${profile.account_status === 'dikonfirmasi' ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : profile.account_status === 'ditolak' || profile.account_status === 'tidak_valid' ? 'bg-rose-500 shadow-md shadow-rose-500/30' : 'bg-amber-500 shadow-md shadow-amber-500/30 animate-pulse'}`} />
          </button>
          <AnimatePresence>
            {isStatusPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#202020] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 z-50 text-left"
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-1">
                  Status Akun
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${profile.account_status === 'dikonfirmasi' ? 'bg-emerald-500' : profile.account_status === 'ditolak' || profile.account_status === 'tidak_valid' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  {profile.account_status === 'dikonfirmasi' ? 'Profil Terkonfirmasi' : profile.account_status === 'ditolak' || profile.account_status === 'tidak_valid' ? 'Profil Ditolak / Tidak Valid' : 'Menunggu Konfirmasi Panitia'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification Bell */}
        <Link
          to="/informasi"
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#252525]/45 dark:hover:bg-[#303030]/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-350 hover:text-ppu-blue dark:hover:text-sky-400 transition-all duration-200 cursor-pointer focus:outline-none shrink-0"
          aria-label="Notifikasi & Informasi"
          title="Notifikasi & Informasi"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
        </Link>

        {/* Toggle Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#252525]/45 dark:hover:bg-[#303030]/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-350 transition-all duration-200 cursor-pointer focus:outline-none"
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 sm:w-5 sm:h-5 transition-transform hover:rotate-12 duration-200" />
          ) : (
            <Sun className="w-4 h-4 sm:w-5 sm:h-5 transition-transform hover:rotate-45 duration-200" />
          )}
        </button>

        {/* Logout & Navigation Menu */}
        <div ref={logoutRef} className="relative">
          <button
            type="button"
            onClick={() => setIsLogoutPopoverOpen(!isLogoutPopoverOpen)}
            disabled={isVoting}
            className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#252525]/45 dark:hover:bg-[#303030]/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-350 transition-all duration-200 focus:outline-none ${isVoting ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isVoting ? 'Tidak dapat logout saat sedang memilih' : 'Logout'}
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <AnimatePresence>
            {isLogoutPopoverOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#202020] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-50 overflow-hidden"
              >
                <Link
                  to="/"
                  onClick={() => setIsLogoutPopoverOpen(false)}
                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 font-medium"
                >
                  <Home className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>Back to Home</span>
                </Link>
                <div className="border-t border-slate-100 dark:border-[#2a2a2a] my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsLogoutPopoverOpen(false);
                    handleLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Log Out</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
