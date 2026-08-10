import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import BackToHomeButton from '../components/BackToHomeButton';
import { getUserAccessSettings } from '../lib/userAccessService';
import { ALL_CLASSES } from '../lib/classConstants';
import { Skeleton } from '../components/Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, RefreshCw, CheckCircle2, AlertTriangle, LogIn, ArrowRight } from 'lucide-react';

// Helper to generate random number
const getRandomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Generate 4-digit code
const generateCardId = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [classField, setClassField] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // Signup Queue States
  const [queueId, setQueueId] = useState<string | null>(() => localStorage.getItem('ppu_signup_queue_id'));
  const [queueStatus, setQueueStatus] = useState<'waiting' | 'processing' | 'success' | 'failed' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(-1);
  const [peopleAhead, setPeopleAhead] = useState<number>(-1);
  const [queueError, setQueueError] = useState<string | null>(null);
  
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-')); // GTK and others
  
  const navigate = useNavigate();

  const generateCaptcha = () => {
    setNum1(getRandomInt(1, 30));
    setNum2(getRandomInt(1, 20));
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
    async function checkSignupAccess() {
      try {
        const s = await getUserAccessSettings();
        setSignupEnabled(s.signup_enabled);
      } catch (err) {
        console.error('Failed to load signup settings:', err);
      } finally {
        setCheckingAccess(false);
      }
    }
    checkSignupAccess();
  }, []);

  // Polling Server-Side Queue Status
  useEffect(() => {
    if (!queueId) return;

    let active = true;
    let timerId: any = null;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/signup/status?queueId=${queueId}`);
        if (!response.ok) {
          if (response.status === 404) {
            localStorage.removeItem('ppu_signup_queue_id');
            setQueueId(null);
            setQueueStatus(null);
            setError('Sesi antrean pendaftaran Anda telah kedaluwarsa atau tidak ditemukan. Silakan coba mendaftar kembali.');
          }
          return;
        }

        const data = await response.json();
        if (!active) return;

        setQueueStatus(data.status);
        setQueuePosition(data.position);
        setPeopleAhead(data.peopleAhead);

        if (data.status === 'success') {
          localStorage.removeItem('ppu_signup_queue_id');
          
          if (data.result && data.result.session) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: data.result.session.access_token,
              refresh_token: data.result.session.refresh_token
            });
            if (sessionError) {
              console.error('Failed to set session client-side:', sessionError);
              setQueueError('Gagal mengaktifkan sesi login di browser Anda: ' + sessionError.message);
              setQueueStatus('failed');
              return;
            }
          }

          localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
          localStorage.setItem('lastActivity', Date.now().toString());

          setTimeout(() => {
            if (active) {
              setQueueId(null);
              setQueueStatus(null);
              navigate('/dashboard');
            }
          }, 3000);
        } else if (data.status === 'failed') {
          localStorage.removeItem('ppu_signup_queue_id');
          if (data.error === 'EMAIL_EXISTS') {
            setQueueError('EMAIL_EXISTS');
          } else {
            setQueueError(data.error || 'Terjadi kesalahan saat pendaftaran.');
          }
        } else {
          timerId = setTimeout(checkStatus, 2000);
        }
      } catch (err: any) {
        console.error('Failed to poll queue status:', err);
        if (active) {
          timerId = setTimeout(checkStatus, 3000);
        }
      }
    };

    checkStatus();

    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [queueId, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Database Cloud tidak terhubung. Pembungkus demo ditiadakan, Anda harus menghubungkan Supabase untuk menggunakan portal.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      setLoading(false);
      return;
    }

    if (parseInt(captchaInput, 10) !== num1 + num2) {
      setError('Captcha answer is incorrect. Please try again.');
      setPassword('');
      setConfirmPassword('');
      generateCaptcha();
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/signup/enqueue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          classField
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat menghubungi server pendaftaran.');
      }

      const data = await response.json();
      localStorage.setItem('ppu_signup_queue_id', data.queueId);
      setQueueId(data.queueId);
      setQueueStatus(data.status);
      setQueuePosition(data.position);
      setPeopleAhead(data.peopleAhead);
      setQueueError(null);
    } catch (err: any) {
      console.error('Signup queue error:', err);
      let errorMsg = err.message || 'Terjadi kesalahan saat mendaftar.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border border-ppu-border shadow-xl">
          <div className="flex flex-col items-center">
            {/* Logo skeleton */}
            <Skeleton className="w-24 h-24 rounded-full mb-6" />
            {/* Title skeleton */}
            <Skeleton className="h-8 w-48 rounded mb-2" />
          </div>
          
          <div className="space-y-5 pt-4">
            <div>
              <Skeleton className="h-3 w-28 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-3 w-24 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-3 w-24 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-3 w-40 mb-1.5" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-3.5 w-full rounded" />
            </div>
            <div className="pt-2">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!signupEnabled) {
    return (
      <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-6 left-6 z-10">
          <BackToHomeButton />
        </div>
        <div className="max-w-md w-full space-y-8 text-center bg-white p-8 sm:p-12 rounded-3xl shadow-2xl border border-ppu-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-ppu-red"></div>
          
          <img 
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/signup.png" 
            alt="Pendaftaran Ditutup" 
            className="w-full max-w-[280px] mx-auto transform hover:scale-[1.02] transition-transform duration-500"
          />

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-[#0B1220] tracking-tight">Pendaftaran Ditutup</h2>
            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
              Terima kasih atas antusiasme Anda. Pendaftaran akun pemilih telah resmi ditutup oleh panitia.
            </p>
          </div>

          <div className="pt-6 border-t border-ppu-border">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-3.5 px-6 bg-ppu-blue hover:bg-ppu-blue-dark active:scale-[0.98] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-ppu-blue/20"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 left-6 z-10">
        <BackToHomeButton />
      </div>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border border-ppu-border shadow-xl">
        <div>
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="mx-auto w-24 h-auto mb-6 animate-pulse-subtle"
          />
          <h2 className="text-center text-3xl font-extrabold text-ppu-blue">
            Daftar Akun SUARAKU
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-ppu-red/5 text-ppu-red border border-ppu-red/20 p-3 rounded text-sm text-center font-semibold">
              {error}
            </div>
          )}
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Nama Lengkap</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Alamat Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Contoh: pemilih@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kelas / Unit</label>
              <button
                type="button"
                id="signup-class-dropdown"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue text-left text-sm font-semibold cursor-pointer select-none transition-all flex items-center justify-between"
              >
                <span>{classField || 'Pilih Kelas (e.g. XI-2)'}</span>
                <span className="text-slate-400 text-xs">▼</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-ppu-border rounded-xl shadow-2xl z-50 p-3 max-h-72 overflow-y-auto">
                  {/* Special Classes (GTK) */}
                  {specialClasses.length > 0 && (
                    <div className="mb-3 pb-2 border-b border-ppu-border grid grid-cols-2 gap-2">
                      {specialClasses.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-2 text-xs text-center rounded-lg hover:bg-slate-50 font-black transition-all border ${
                            classField === cls ? 'bg-ppu-blue text-white border-ppu-blue shadow-sm' : 'text-slate-800 border-ppu-border'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {/* Kelas X */}
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-ppu-border pb-1 mb-1 text-center font-mono">Kelas X</div>
                      {col1.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded-lg hover:bg-ppu-blue-light hover:text-ppu-blue font-bold transition-all ${
                            classField === cls ? 'bg-ppu-blue text-white hover:bg-ppu-blue hover:text-white' : 'text-slate-600'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>

                    {/* Kelas XI */}
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-ppu-border pb-1 mb-1 text-center font-mono">Kelas XI</div>
                      {col2.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded-lg hover:bg-ppu-blue-light hover:text-ppu-blue font-bold transition-all ${
                            classField === cls ? 'bg-ppu-blue text-white hover:bg-ppu-blue hover:text-white' : 'text-slate-600'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>

                    {/* Kelas XII */}
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-slate-400 border-b border-ppu-border pb-1 mb-1 text-center font-mono">Kelas XII</div>
                      {col3.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded-lg hover:bg-ppu-blue-light hover:text-ppu-blue font-bold transition-all ${
                            classField === cls ? 'bg-ppu-blue text-white hover:bg-ppu-blue hover:text-white' : 'text-slate-600'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* Hidden input to satisfy HTML form validity */}
              <input type="hidden" name="classField" required value={classField} />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Kata Sandi (Minimum 6 Karakter)</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Masukkan password minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Konfirmasi Kata Sandi</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Konfirmasi password Anda"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-ppu-border/80">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {/* KOTAK SOAL */}
                  <div className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold font-mono shadow-xs flex items-center justify-center shrink-0 select-none min-w-[100px]">
                    <span className="text-ppu-blue font-black">{num1} + {num2} =</span>
                  </div>

                  {/* FORM JAWAB */}
                  <div className="flex-1">
                    <input
                      id="captcha"
                      name="captcha"
                      type="number"
                      required
                      className="appearance-none rounded-xl relative block w-full px-3.5 py-2 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue text-sm font-semibold bg-white"
                      placeholder="Masukkan jawaban"
                      value={captchaInput}
                      onChange={(e) => setCaptchaInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-ppu-blue hover:bg-ppu-blue-dark active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ppu-blue disabled:opacity-50 cursor-pointer shadow-md shadow-ppu-blue/15"
            >
              {loading ? 'Mendaftar...' : 'Daftarkan Akun'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4 border-t border-ppu-border pt-4">
          <span className="text-xs font-semibold text-slate-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-ppu-blue hover:text-ppu-blue-dark font-bold">
              Login
            </Link>
          </span>
        </div>
      </div>

      {/* Signup Queue Overlay */}
      <AnimatePresence>
        {queueId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center text-white relative overflow-hidden"
            >
              {/* Glowing Top Accent */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

              {queueStatus === 'waiting' && (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold tracking-tight">Pendaftaran Sedang Ramai</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Banyak siswa sedang membuat akun PPU. Anda sedang berada dalam antrean pendaftaran akun.
                    </p>
                  </div>

                  {/* Queue Number Box */}
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-1 shadow-inner">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Nomor Antrean Anda</span>
                    <div className="text-2xl font-mono font-black text-indigo-400">{queueId}</div>
                  </div>

                  {/* People Ahead */}
                  <div className="text-sm font-semibold text-slate-300">
                    {peopleAhead > 0 ? (
                      <>
                        <span className="text-indigo-400 text-lg font-black font-mono">{peopleAhead}</span> pendaftar di depan Anda.
                      </>
                    ) : (
                      <>Anda berada di urutan berikutnya!</>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Menunggu Giliran
                  </div>

                  <p className="text-xs text-slate-500 font-medium">
                    Mohon jangan menutup halaman ini agar antrean tidak hilang.
                  </p>
                </div>
              )}

              {queueStatus === 'processing' && (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold tracking-tight text-indigo-400">Giliran Anda</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Pendaftaran akun sedang diproses... Mohon tunggu.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-inner">
                    <span className="text-xs text-slate-400 font-bold block mb-1">Status</span>
                    <div className="inline-flex items-center gap-1.5 text-indigo-400 text-sm font-bold">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                      Memproses Pendaftaran...
                    </div>
                  </div>

                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 text-left">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      <strong className="text-slate-300 block mb-0.5">Pendaftaran masih diproses:</strong>
                      Server sedang sangat sibuk. Sistem akan mencoba kembali secara otomatis jika terjadi limitasi.
                    </p>
                  </div>
                </div>
              )}

              {queueStatus === 'success' && (
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold tracking-tight text-emerald-400">✓ Akun Berhasil Dibuat</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      Akun Anda berhasil dibuat. Silakan lanjutkan ke proses berikutnya.
                    </p>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-semibold text-slate-400 text-xs">
                    Mempersiapkan dasbor Anda...
                  </div>
                </div>
              )}

              {queueStatus === 'failed' && (
                <div className="space-y-6">
                  {queueError === 'EMAIL_EXISTS' ? (
                    <>
                      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                        <AlertTriangle className="w-8 h-8" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold tracking-tight text-rose-400">Email Sudah Terdaftar</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          Email tersebut sudah memiliki akun PPU. Silakan gunakan halaman Login.
                        </p>
                      </div>

                      <div className="pt-4 space-y-3">
                        <Link
                          to="/login"
                          onClick={() => {
                            setQueueId(null);
                            setQueueStatus(null);
                          }}
                          className="w-full inline-flex items-center justify-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all"
                        >
                          Langsung Login <LogIn className="w-4 h-4 ml-2" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setQueueId(null);
                            setQueueStatus(null);
                          }}
                          className="w-full py-2.5 bg-transparent hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                        >
                          Kembali ke Pendaftaran
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
                        <AlertTriangle className="w-8 h-8" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-xl font-extrabold tracking-tight text-rose-400">Pendaftaran Gagal</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {queueError || 'Terjadi kesalahan tidak terduga pada server.'}
                        </p>
                      </div>

                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setQueueId(null);
                            setQueueStatus(null);
                          }}
                          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg transition-all cursor-pointer"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
