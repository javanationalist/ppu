import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import WafoSlider from './WafoSlider';

export default function PortalLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = [
    { name: 'Beranda', path: '/' },
    { name: 'Informasi', path: '/informasi' },
    { name: 'Tentang', path: '/tentang' },
    { name: 'Login', path: '/login' },
    { name: 'Sign Up', path: '/signup' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-900 flex flex-col relative overflow-hidden font-sans">
      {/* Background Grid Pattern Overlay */}
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none z-0">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="landing-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#landing-grid)" />
        </svg>
      </div>

      {/* Decorative Glow Dots */}
      <div className="fixed -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="fixed -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Name */}
            <Link to="/" className="flex items-center gap-3 group" onClick={closeMenu}>
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 shadow-md">
                <img
                  src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
                  alt="PPU Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-white font-bold tracking-wide text-sm sm:text-base leading-tight uppercase group-hover:text-indigo-300 transition-colors">
                  PORTAL PEMILIHAN UMUM
                </h1>
                <p className="text-indigo-300/80 text-[10px] sm:text-xs font-semibold uppercase tracking-widest hidden sm:block">
                  Sistem Informasi & Pemungutan Suara
                </p>
                <p className="text-indigo-300/80 text-[10px] font-semibold uppercase tracking-widest sm:hidden">
                  PPU
                </p>
              </div>
            </Link>

            {/* Desktop / Mobile Menu Toggle */}
            <div className="flex items-center">
              {/* Desktop Nav */}
              <nav className="hidden md:flex gap-6 items-center mr-6">
                <Link to="/informasi" className={`text-sm font-semibold transition-colors ${location.pathname === '/informasi' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}>Informasi</Link>
                <Link to="/tentang" className={`text-sm font-semibold transition-colors ${location.pathname === '/tentang' ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}>Tentang</Link>
              </nav>
              
              <button
                type="button"
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors focus:outline-none"
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
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Drawer Menu */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 border-l border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          <span className="text-white font-bold tracking-wider uppercase text-sm">Menu Navigasi</span>
          <button 
            onClick={closeMenu}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors focus:outline-none"
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
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
