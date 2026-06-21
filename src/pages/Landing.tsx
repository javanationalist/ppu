import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Vote, BarChart3, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Landing() {
  const [visibility, setVisibility] = useState({
    bilik_suara: true,
    lihat_hasil: true,
    login: true,
    register: true,
    cara_menggunakan: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisibility() {
      try {
        const { data, error } = await supabase
          .from('landing_page_visibility')
          .select('*');

        if (error) {
          console.error('Error fetching landing page button visibility:', error);
        } else if (data && data.length > 0) {
          const fetchedVis: typeof visibility = {
            bilik_suara: true,
            lihat_hasil: true,
            login: true,
            register: true,
            cara_menggunakan: true,
          };
          data.forEach((item: { id: string; is_visible: boolean }) => {
            if (item.id in fetchedVis) {
              fetchedVis[item.id as keyof typeof visibility] = item.is_visible;
            }
          });
          setVisibility(fetchedVis);
        }
      } catch (err) {
        console.error('Exception fetching button visibility:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVisibility();
  }, []);

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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-4 border-ppu-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-bold animate-pulse">Memuat menu portal...</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Group 1: Primary Actions */}
            {visibility.bilik_suara && (
              <Link
                to="/vote"
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-white bg-ppu-blue hover:bg-ppu-blue-dark active:bg-ppu-blue focus:outline-ppu-blue transition-all duration-300 shadow-md shadow-ppu-blue/20"
              >
                <Vote className="w-5 h-5" />
                <span>Bilik Suara (Voting)</span>
              </Link>
            )}
            
            {visibility.lihat_hasil && (
              <Link
                to="/hasil"
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-ppu-blue bg-white hover:bg-ppu-blue/5 border-2 border-ppu-blue transition-all duration-300 shadow-md shadow-ppu-blue/10"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Lihat Hasil Pemilu</span>
              </Link>
            )}

            {/* Group 2: Accounts */}
            {visibility.login && (
              <Link
                to="/login"
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-ppu-blue/5 border border-ppu-border hover:text-ppu-blue transition-all duration-300"
              >
                <LogIn className="w-5 h-5" />
                <span>Login ke Akun</span>
              </Link>
            )}

            {visibility.register && (
              <Link
                to="/signup"
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-ppu-blue/5 border border-ppu-border hover:text-ppu-blue transition-all duration-300"
              >
                <UserPlus className="w-5 h-5" />
                <span>Registrasi Baru</span>
              </Link>
            )}

            {/* Group 3: How to Use */}
            {visibility.cara_menggunakan && (
              <Link
                to="/cara-menggunakan"
                className="sm:col-span-2 w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all duration-300 shadow-sm"
              >
                <BookOpen className="w-5 h-5" />
                <span>Cara Menggunakan</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
