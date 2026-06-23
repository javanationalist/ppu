import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import WafoSlider from './WafoSlider';

export default function PortalLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme, isDark } = useTheme();

  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Informasi', path: '/informasi' },
    { name: 'Tentang', path: '/tentang' },
    { name: 'Cara Menggunakan', path: '/cara-menggunakan' },
    { name: 'Login', path: '/login' },
    { name: 'Sign Up', path: '/signup' },
  ];

  return (
    <div className="min-h-screen bg-ppu-surface dark:bg-[#1a1a1a] text-slate-800 dark:text-[#f5f5f5] flex flex-col relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background Grid Pattern Overlay */}
      <div className="fixed inset-0 opacity-[0.08] dark:opacity-[0.04] pointer-events-none z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="landing-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? "#38bdf8" : "#123E8A"} strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#landing-grid)" />
        </svg>
      </div>

      {/* Decorative Glow Dots */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-ppu-blue/5 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-ppu-blue/5 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md border-b border-ppu-border dark:border-[#2a2a2a] shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Name */}
            <Link to="/" className="flex items-center gap-2 group" onClick={closeMenu}>
              <img
                src={isDark ? "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp" : "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"}
                alt="PPU Logo"
                className="w-9 h-9 object-contain select-none shrink-0"
              />
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-ppu-blue/10 dark:bg-sky-500/10 text-ppu-blue dark:text-sky-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 transition-colors group-hover:bg-ppu-blue/15 dark:group-hover:bg-sky-500/15">
                PPU 2026
              </div>
            </Link>

            {/* Desktop / Mobile Menu Toggle */}
            <div className="flex items-center">
              {/* Desktop Nav */}
              <nav className="hidden md:flex gap-6 items-center mr-6">
                <Link to="/informasi" className={`text-sm font-semibold transition-colors ${location.pathname === '/informasi' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400'}`}>Informasi</Link>
                <Link to="/tentang" className={`text-sm font-semibold transition-colors ${location.pathname === '/tentang' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400'}`}>Tentang</Link>
                <Link to="/cara-menggunakan" className={`text-sm font-semibold transition-colors ${location.pathname === '/cara-menggunakan' ? 'text-ppu-blue dark:text-sky-400 font-bold' : 'text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400'}`}>Cara Menggunakan</Link>
              </nav>

              {/* Theme Toggle Button */}
              <button
                type="button"
                className="text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400 p-2 mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors focus:outline-none flex items-center justify-center"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
              >
                <span className="css-icon-container" aria-hidden="true">
                  <span className={theme === 'dark' ? 'css-icon-moon' : 'css-icon-sun'} />
                </span>
              </button>
              
              <button
                type="button"
                className="text-slate-600 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors focus:outline-none"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-xs"
          onClick={closeMenu}
        />
      )}

      {/* Drawer Menu */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-[#1a1a1a] border-l border-ppu-border dark:border-[#2a2a2a] shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-ppu-border dark:border-[#2a2a2a]">
          <span className="text-ppu-blue dark:text-sky-400 font-bold tracking-wider uppercase text-sm">Menu Navigasi</span>
          <button 
            onClick={closeMenu}
            className="text-slate-500 dark:text-[#a3a3a3] hover:text-ppu-blue dark:hover:text-sky-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col py-4 px-3 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={closeMenu}
              className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                location.pathname === link.path 
                  ? 'bg-ppu-blue/10 dark:bg-sky-500/10 text-ppu-blue dark:text-sky-400 border border-ppu-blue/20 dark:border-sky-500/20' 
                  : 'text-slate-600 dark:text-[#a3a3a3] hover:bg-slate-50 dark:hover:bg-[#333333] hover:text-ppu-blue dark:hover:text-sky-400'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 pt-16 flex flex-col">
        {location.pathname === '/' && <WafoSlider />}
        <Outlet />
      </main>
    </div>
  );
}
