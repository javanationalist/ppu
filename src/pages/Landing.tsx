import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Vote, BarChart3, BookOpen, ExternalLink } from 'lucide-react';
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
    <div className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full space-y-6">
      
      {/* 1. HERO SECTION */}
      <div className="flex flex-col items-center text-center space-y-3.5 max-w-xl mx-auto mt-2">
        {/* Official Logo PPU - Crisp and compact */}
        <div className="mb-1">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="Logo Resmi PPU"
            className="w-16 sm:w-20 h-auto object-contain select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Title */}
        <h1 className="text-slate-800 font-bold tracking-tight text-[22px] sm:text-[24px] md:text-[26px] leading-snug max-w-lg">
          Pilih Pemimpin Terbaik Kamu di Portal Pemilihan Umum
        </h1>

        {/* Description */}
        <p className="text-slate-500 text-[13px] sm:text-[14px] leading-[1.6] max-w-lg font-normal">
          Website ini dibuat untuk memberi kemudahan akses pemungutan suara dengan memanfaatkan kemajuan teknologi yang efisien, aman, dan transparan. Akses fitur lengkap portal untuk melakukan pemilihan umum secara online.
        </p>
      </div>

      {/* 2. AREA TOMBOL */}
      <div className="w-full flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <div className="w-6 h-6 border-2 border-ppu-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Menghubungkan ke verifikasi...</p>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap justify-center items-center gap-2 w-full max-w-lg px-2">
            
            {/* 1. Bilik Suara (Voting) */}
            {visibility.bilik_suara && (
              <Link
                to="/vote"
                className="bg-ppu-blue hover:bg-ppu-blue-dark text-white text-[13px] font-medium px-4 py-2 rounded-md transition-all shadow-xs flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <Vote className="w-3.5 h-3.5 shrink-0" />
                <span>Bilik Suara (Voting)</span>
              </Link>
            )}

            {/* 2. Lihat Hasil Pemilu */}
            {visibility.lihat_hasil && (
              <Link
                to="/hasil"
                className="bg-white border border-ppu-blue text-ppu-blue hover:bg-ppu-blue/5 text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Lihat Hasil Pemilu</span>
              </Link>
            )}

            {/* 3. Login */}
            {visibility.login && (
              <Link
                to="/login"
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Login</span>
              </Link>
            )}

            {/* 4. Register */}
            {visibility.register && (
              <Link
                to="/signup"
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Register</span>
              </Link>
            )}

            {/* 5. Cara Menggunakan */}
            {visibility.cara_menggunakan && (
              <Link
                to="/cara-menggunakan"
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Cara Menggunakan</span>
              </Link>
            )}

          </div>
        )}
      </div>

      {/* 3. INFORMASI PENTING */}
      <div className="w-full text-center space-y-1.5 mt-1 max-w-lg border border-slate-100 rounded-lg p-3.5 bg-slate-50/50">
        <h3 className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Informasi Penting</h3>
        <p className="text-slate-500 text-[12.5px] leading-relaxed">
          Baca pengumuman terbaru dan informasi penting di{' '}
          <Link to="/informasi" className="text-ppu-blue font-medium hover:underline inline-flex items-center gap-0.5 text-[12.5px]">
            Informasi
            <ExternalLink className="w-3 h-3 inline-block" />
          </Link>.
        </p>
        <p className="text-slate-500 text-[12.5px] leading-relaxed">
          Untuk mengakses laman resmi SMA Negeri 1 dapat melalui tautan berikut:{' '}
          <a
            href="https://sman1.sch.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ppu-blue font-medium hover:underline inline-flex items-center gap-0.5 text-[12.5px]"
          >
            Situs SMA Negeri 1
            <ExternalLink className="w-3 h-3 inline-block" />
          </a>
        </p>
      </div>

      {/* 4. ILUSTRASI */}
      <div className="w-full max-w-lg overflow-hidden rounded-lg shadow-xs border border-slate-100/60">
        <img
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Landing%20Page.jpg"
          alt="Ilustrasi Portal PPU"
          className="w-full h-auto object-cover select-none"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 5. FOOTER */}
      <footer className="w-full text-center border-t border-slate-200/40 pt-4 mt-2 select-none">
        <p className="text-[11px] text-slate-400 leading-normal">
          © 2026 | Tim Pelaksana Pemilihan. v1.0.4 Foundation. Illustration by{' '}
          <a
            href="https://www.magnific.com/author/pch-vector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ppu-blue hover:underline font-semibold text-[11px]"
          >
            Pch.Vector
          </a>
        </p>
      </footer>

    </div>
  );
}
