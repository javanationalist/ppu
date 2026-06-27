import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, Vote, BarChart3, BookOpen, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

export default function Landing() {
  const { isDark } = useTheme();
  const [visibility, setVisibility] = useState({
    bilik_suara: true,
    lihat_hasil: true,
    login: true,
    register: true,
    cara_menggunakan: true,
  });
  const [loading, setLoading] = useState(true);
  const [activeCountdown, setActiveCountdown] = useState<any | null>(null);
  const [serverOffset, setServerOffset] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState({
    months: 0,
    days: 0,
    hours: 0,
    seconds: 0,
    isExpired: false,
  });

  // Fetch server time offset
  useEffect(() => {
    async function getOffset() {
      try {
        const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.utc_datetime) {
            const serverMs = new Date(data.utc_datetime).getTime();
            const browserMs = Date.now();
            setServerOffset(serverMs - browserMs);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch from worldtimeapi, using fallback method:', e);
        try {
          const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
          const dateHeader = res.headers.get('date');
          if (dateHeader) {
            setServerOffset(new Date(dateHeader).getTime() - Date.now());
          }
        } catch (err) {
          console.warn('Failed to fetch fallback server date header:', err);
        }
      }
    }
    getOffset();
  }, []);

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

    async function fetchActiveCountdown() {
      try {
        const { data, error } = await supabase
          .from('countdown')
          .select('*')
          .eq('is_active', true);

        if (error) {
          if (error.code === '42P01') {
            console.warn('Countdown table does not exist in Supabase yet. Please run the SQL migration in Supabase SQL editor.');
          } else {
            console.error('Error fetching countdown:', error);
          }
        } else if (data && data.length > 0) {
          setActiveCountdown(data[0]);
        } else {
          setActiveCountdown(null);
        }
      } catch (err) {
        console.error('Exception fetching countdown:', err);
      }
    }

    fetchVisibility();
    fetchActiveCountdown();

    const channel = supabase
      .channel('countdown-landing-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'countdown' },
        () => {
          fetchActiveCountdown();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update countdown display every second
  useEffect(() => {
    if (!activeCountdown) return;

    const calculateTimeLeft = () => {
      const targetTime = new Date(activeCountdown.target_datetime).getTime();
      const currentServerTime = Date.now() + serverOffset;
      const msDiff = targetTime - currentServerTime;

      if (msDiff <= 0) {
        setTimeLeft({
          months: 0,
          days: 0,
          hours: 0,
          seconds: 0,
          isExpired: true,
        });
      } else {
        const totalSec = Math.floor(msDiff / 1000);
        const SEC_IN_DAY = 86400;
        const SEC_IN_MONTH = 30 * SEC_IN_DAY;
        const SEC_IN_HOUR = 3600;

        const months = Math.floor(totalSec / SEC_IN_MONTH);
        const days = Math.floor((totalSec % SEC_IN_MONTH) / SEC_IN_DAY);
        const hours = Math.floor((totalSec % SEC_IN_DAY) / SEC_IN_HOUR);
        const seconds = totalSec % 60;

        setTimeLeft({
          months,
          days,
          hours,
          seconds,
          isExpired: false,
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [activeCountdown, serverOffset]);

  return (
    <div className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto w-full space-y-6">
      
      {/* 1. HERO SECTION */}
      <div className="flex flex-col items-center text-center space-y-3.5 max-w-xl mx-auto mt-2">
        {/* Official Logo PPU - Crisp and compact */}
        <div className="mb-1">
          <img
            src={isDark ? "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp" : "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"}
            alt="Logo Resmi PPU"
            className="w-16 sm:w-20 h-auto object-contain select-none"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Title */}
        <h1 className="text-slate-800 dark:text-[#f5f5f5] font-bold tracking-tight text-[22px] sm:text-[24px] md:text-[26px] leading-snug max-w-lg transition-colors">
          Pilih Pemimpin Terbaik Kamu di Portal Pemilihan Umum
        </h1>

        {/* Description */}
        <p className="text-slate-500 dark:text-[#a3a3a3] text-[13px] sm:text-[14px] leading-[1.6] max-w-lg font-normal transition-colors">
          Website ini dibuat untuk memberi kemudahan akses pemungutan suara dengan memanfaatkan kemajuan teknologi yang efisien, aman, dan transparan. Akses fitur lengkap portal untuk melakukan pemilihan umum secara online.
        </p>
      </div>

      {/* 2. AREA TOMBOL */}
      <div className="w-full flex justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <div className="w-6 h-6 border-2 border-ppu-blue dark:border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] text-slate-400 dark:text-[#a3a3a3] font-semibold uppercase tracking-wide">Menghubungkan ke verifikasi...</p>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap justify-center items-center gap-2 w-full max-w-lg px-2">
            
            {/* 1. Bilik Suara (Voting) */}
            {visibility.bilik_suara && (
              <Link
                to="/vote"
                className="bg-ppu-blue hover:bg-ppu-blue-dark dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-[13px] font-medium px-4 py-2 rounded-md transition-all shadow-xs flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <Vote className="w-3.5 h-3.5 shrink-0" />
                <span>Bilik Suara (Voting)</span>
              </Link>
            )}

            {/* 2. Lihat Hasil Pemilu */}
            {visibility.lihat_hasil && (
              <Link
                to="/hasil"
                className="bg-white dark:bg-[#2a2a2a] border border-ppu-blue dark:border-sky-500 text-ppu-blue dark:text-sky-400 hover:bg-ppu-blue/5 dark:hover:bg-sky-500/10 text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span>Lihat Hasil Pemilu</span>
              </Link>
            )}

            {/* 3. Login */}
            {visibility.login && (
              <Link
                to="/login"
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] text-slate-600 dark:text-[#a3a3a3] hover:bg-slate-50 dark:hover:bg-[#333333] text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Login</span>
              </Link>
            )}

            {/* 4. Register */}
            {visibility.register && (
              <Link
                to="/signup"
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] text-slate-600 dark:text-[#a3a3a3] hover:bg-slate-50 dark:hover:bg-[#333333] text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Register</span>
              </Link>
            )}

            {/* 5. Cara Menggunakan */}
            {visibility.cara_menggunakan && (
              <Link
                to="/cara-menggunakan"
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] text-slate-600 dark:text-[#a3a3a3] hover:bg-slate-50 dark:hover:bg-[#333333] text-[13px] font-medium px-4 py-2 rounded-md transition-all flex items-center justify-center gap-1.5 focus:outline-hidden"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Cara Menggunakan</span>
              </Link>
            )}

          </div>
        )}
      </div>

      {/* 3. INFORMASI PENTING */}
      <div className="w-full text-center space-y-1.5 mt-1 max-w-lg border border-slate-100 dark:border-[#2a2a2a] rounded-lg p-3.5 bg-slate-50/50 dark:bg-[#2a2a2a]/40 transition-colors">
        <h3 className="text-slate-400 dark:text-[#a3a3a3] text-[11px] font-bold uppercase tracking-wider">Informasi Penting</h3>
        <p className="text-slate-500 dark:text-[#a3a3a3] text-[12.5px] leading-relaxed transition-colors">
          Baca pengumuman terbaru dan informasi penting di{' '}
          <Link to="/informasi" className="text-ppu-blue dark:text-sky-400 font-medium hover:underline inline-flex items-center gap-0.5 text-[12.5px]">
            Informasi
            <ExternalLink className="w-3 h-3 inline-block" />
          </Link>.
        </p>
        <p className="text-slate-500 dark:text-[#a3a3a3] text-[12.5px] leading-relaxed transition-colors">
          Untuk mengakses laman resmi SMA Negeri 1 dapat melalui tautan berikut:{' '}
          <a
            href="https://sman1.sch.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ppu-blue dark:text-sky-400 font-medium hover:underline inline-flex items-center gap-0.5 text-[12.5px]"
          >
            Situs SMA Negeri 1
            <ExternalLink className="w-3 h-3 inline-block" />
          </a>
        </p>
      </div>

      {/* 3.5. COUNTDOWN */}
      {activeCountdown && (
        <div className="w-full max-w-lg bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-lg p-5 shadow-xs transition-colors text-center space-y-4">
          <div className="space-y-1">
            <h4 className="text-slate-800 dark:text-[#f5f5f5] text-base font-extrabold tracking-tight leading-snug whitespace-pre-line">
              {activeCountdown.title}
            </h4>
          </div>
          
          {!timeLeft.isExpired ? (
            <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto pt-2">
              <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-[#1a1a1a]/60 rounded-md border border-slate-100 dark:border-[#333333]">
                <span className="text-xl sm:text-2xl font-black text-ppu-blue dark:text-sky-400 font-mono">
                  {timeLeft.months}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider mt-1">
                  Bulan
                </span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-[#1a1a1a]/60 rounded-md border border-slate-100 dark:border-[#333333]">
                <span className="text-xl sm:text-2xl font-black text-ppu-blue dark:text-sky-400 font-mono">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider mt-1">
                  Hari
                </span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-[#1a1a1a]/60 rounded-md border border-slate-100 dark:border-[#333333]">
                <span className="text-xl sm:text-2xl font-black text-ppu-blue dark:text-sky-400 font-mono">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider mt-1">
                  Jam
                </span>
              </div>
              <div className="flex flex-col items-center p-2 bg-slate-50 dark:bg-[#1a1a1a]/60 rounded-md border border-slate-100 dark:border-[#333333]">
                <span className="text-xl sm:text-2xl font-black text-ppu-blue dark:text-sky-400 font-mono">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider mt-1">
                  Detik
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
              <p className="text-emerald-800 dark:text-emerald-400 text-sm font-semibold leading-relaxed">
                {activeCountdown.finished_text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 4. ILUSTRASI */}
      <div className="w-full max-w-lg overflow-hidden rounded-lg shadow-xs border border-slate-100/60 dark:border-[#2a2a2a] transition-colors">
        <img
          src={isDark ? "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Landing(2).png" : "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Landing%20Page.jpg"}
          alt="Ilustrasi Portal PPU"
          className="w-full h-auto object-cover select-none dark:opacity-85"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* 5. FOOTER */}
      <footer className="w-full text-center border-t border-slate-200/40 dark:border-[#2a2a2a] pt-4 mt-2 select-none transition-colors">
        <p className="text-[11px] text-slate-400 dark:text-[#a3a3a3] leading-normal transition-colors">
          © 2026 | Tim Pelaksana Pemilihan. v1.0.4 Foundation. Illustration by{' '}
          <a
            href="https://www.magnific.com/author/pch-vector"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ppu-blue dark:text-sky-400 hover:underline font-semibold text-[11px]"
          >
            Pch.Vector
          </a>
        </p>
      </footer>

    </div>
  );
}
