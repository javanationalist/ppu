import { Link } from 'react-router-dom';
import { isSupabaseConfigured } from '../lib/supabase';
import { LogIn, UserPlus, Vote, BarChart3, ShieldAlert } from 'lucide-react';

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <div className="relative max-w-xl w-full space-y-8 text-center bg-slate-900/40 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-2xl border border-white/10 mt-8 mb-12">
        {/* Welcome Text */}
        <div className="space-y-4">
          <h1 className="text-white font-black tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight">
            Selamat datang di<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">
              Portal Pemilihan Umum (PPU)
            </span>
          </h1>
          <p className="text-indigo-200/80 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
            Sistem pemungutan suara digital yang aman, transparan, dan dapat diandalkan untuk demokrasi masa depan.
          </p>
        </div>
        
        {/* Action Button stack */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Group 1: Primary Actions */}
          <Link
            to="/vote"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/40"
          >
            <Vote className="w-5 h-5" />
            <span>Bilik Suara (Voting)</span>
          </Link>
          
          <Link
            to="/hasil"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all duration-300 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
          >
            <BarChart3 className="w-5 h-5" />
            <span>Lihat Hasil Pemilu</span>
          </Link>

          {/* Group 2: Accounts */}
          <Link
            to="/login"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-300 bg-[#1c2030] hover:bg-[#232840] hover:text-white border border-[#2a3050] transition-all duration-300"
          >
            <LogIn className="w-5 h-5" />
            <span>Login ke Akun</span>
          </Link>

          <Link
            to="/signup"
            className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition-all duration-300"
          >
            <UserPlus className="w-5 h-5" />
            <span>Registrasi Baru</span>
          </Link>
        </div>

        {/* Sandbox Indicator (Dynamic) */}
        {!isSupabaseConfigured && (
          <div className="mt-8 p-5 border border-amber-500/30 bg-amber-500/10 rounded-2xl text-left backdrop-blur-sm shadow-xl">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              💡 Sandbox Demo Mode
            </h4>
            <p className="text-xs text-amber-300/90 leading-relaxed mb-4">
              Database cloud belum terhubung. Portal disimulasikan menggunakan data lokal berikut:
            </p>
            <div className="space-y-3 text-xs text-indigo-100 font-mono bg-slate-950/80 p-4 rounded-xl border border-white/5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <span className="font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded inline-block w-fit">[User]</span>
                <span><span className="text-slate-400">email:</span> <span className="font-bold text-white">user@ppu.demo</span></span>
                <span><span className="text-slate-400">pass:</span> <span className="font-bold text-white">user12345</span></span>
              </div>
              <div className="border-t border-white/10 pt-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded inline-block w-fit">[Admin]</span>
                  <span><span className="text-slate-400">email:</span> <span className="font-bold text-white">admin@ppu.demo</span></span>
                  <span><span className="text-slate-400">pass:</span> <span className="font-bold text-white">admin12345</span></span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 leading-normal">
              Gunakan variable <code className="bg-slate-950 px-1.5 py-0.5 rounded text-white font-mono border border-slate-800">VITE_SUPABASE_URL</code> & <code className="bg-slate-950 px-1.5 py-0.5 rounded text-white font-mono border border-slate-800">VITE_SUPABASE_ANON_KEY</code> untuk database cloud.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
