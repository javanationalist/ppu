import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { LogIn, UserPlus, Vote, BarChart3, ShieldAlert, BookOpen } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <div className="relative max-w-xl w-full space-y-8 text-center bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-ppu-border mt-8 mb-12">
        {/* Welcome Text */}
        <div className="space-y-4">
          <h1 className="text-[#0B1220] font-black tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight">
            Selamat datang di<br/>
            <span className="text-ppu-blue">
              Portal Pemilihan Umum (PPU)
            </span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
            Sistem pemungutan suara digital yang aman, transparan, dan dapat diandalkan untuk demokrasi masa depan.
          </p>
        </div>
        
        {/* Action Button stack */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Group 1: Primary Actions */}
          <Link
            to="/vote"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-white bg-ppu-blue hover:bg-ppu-blue-dark active:bg-ppu-blue focus:outline-ppu-blue transition-all duration-300 shadow-md shadow-ppu-blue/20"
          >
            <Vote className="w-5 h-5" />
            <span>Bilik Suara (Voting)</span>
          </Link>
          
          <Link
            to="/hasil"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-ppu-blue bg-white hover:bg-ppu-blue/5 border-2 border-ppu-blue transition-all duration-300 shadow-md shadow-ppu-blue/10"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Lihat Hasil Pemilu</span>
          </Link>

          {/* Group 2: Accounts */}
          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-ppu-blue/5 border border-ppu-border hover:text-ppu-blue transition-all duration-300"
          >
            <LogIn className="w-5 h-5" />
            <span>Login ke Akun</span>
          </Link>

          <Link
            to="/signup"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-ppu-blue/5 border border-ppu-border hover:text-ppu-blue transition-all duration-300"
          >
            <UserPlus className="w-5 h-5" />
            <span>Registrasi Baru</span>
          </Link>

          {/* Group 3: How to Use (Full-width bridge) */}
          <Link
            to="/cara-menggunakan"
            className="sm:col-span-2 w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all duration-300 shadow-sm"
          >
            <BookOpen className="w-5 h-5" />
            <span>Cara Menggunakan</span>
          </Link>
        </div>

        {/* Sandbox Indicator (Dynamic) */}
        {!isSupabaseConfigured && (
          <div className="mt-8 p-5 border border-ppu-red/30 bg-ppu-red/5 rounded-2xl text-left shadow-md">
            <h4 className="text-xs font-bold text-ppu-red uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              💡 Sandbox Demo Mode
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed mb-4 font-medium">
              Database cloud belum terhubung. Portal disimulasikan menggunakan data lokal berikut:
            </p>
            <div className="space-y-3 text-xs text-slate-800 font-mono bg-slate-50 p-4 rounded-xl border border-ppu-border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="font-semibold text-ppu-blue bg-ppu-blue/10 px-2 py-1 rounded inline-block w-fit">[User]</span>
                <span><span className="text-slate-500">email:</span> <span className="font-bold text-slate-900">user@ppu.demo</span></span>
                <span><span className="text-slate-500">pass:</span> <span className="font-bold text-slate-900">user12345</span></span>
              </div>
              <div className="border-t border-ppu-border pt-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="font-semibold text-ppu-red bg-ppu-red/10 px-2 py-1 rounded inline-block w-fit">[Admin]</span>
                  <span><span className="text-slate-500">email:</span> <span className="font-bold text-slate-900">admin@ppu.demo</span></span>
                  <span><span className="text-slate-500">pass:</span> <span className="font-bold text-slate-900">admin12345</span></span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 leading-normal font-semibold">
              Gunakan variable <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono border border-slate-200">VITE_SUPABASE_URL</code> & <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono border border-slate-200">VITE_SUPABASE_ANON_KEY</code> untuk database cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
