import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getUserAccessSettings } from '../lib/userAccessService';
import { ALL_CLASSES } from '../lib/classConstants';

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      // Find a unique 4-digit card_id
      let uniqueCardId = '';
      let isUnique = false;
      
      while (!isUnique) {
        uniqueCardId = generateCardId();
        const { data } = await supabase
          .from('profiles')
          .select('card_id')
          .eq('card_id', uniqueCardId);
          
        if (!data || data.length === 0) {
          isUnique = true;
        }
      }

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: data.user.id,
              full_name: fullName,
              email: email,
              class: classField,
              card_id: uniqueCardId,
              role: 'user',
              account_status: 'belum_dikonfirmasi',
              voting_status: 'belum',
            },
          ]);

        if (profileError) throw profileError;
        
        // After signup, initialize active session duration
        localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
        localStorage.setItem('lastActivity', Date.now().toString());

        // After signup, redirect to dashboard or login
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Signup error detail:', err);
      let errorMsg = 'Terjadi kesalahan saat mendaftar.';
      
      if (err) {
        if (typeof err === 'string') {
          errorMsg = err;
        } else if (err.message) {
          errorMsg = err.message;
        } else if (err.error_description) {
          errorMsg = err.error_description;
        } else {
          try {
            const keys = Object.keys(err);
            if (keys.length > 0) {
              errorMsg = keys.map(k => `${k}: ${JSON.stringify(err[k])}`).join(', ');
            } else {
              errorMsg = String(err);
            }
          } catch (e) {
            errorMsg = String(err);
          }
        }
      }

      // If the error message is empty or is stringified as JSON empty object
      if (errorMsg === '{}' || errorMsg === '[object Object]' || !errorMsg) {
        errorMsg = 'Gagal menyimpan profil ke database Supabase. Ini biasanya terjadi karena RLS Policy (Row Level Security) atau Trigger Database yang bentrok/mengalami infinite recursion. Silakan periksa tab SQL Editor di Supabase Anda.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-ppu-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-bold text-xs mt-3">Memeriksa hak akses pendaftaran...</p>
      </div>
    );
  }

  if (!signupEnabled) {
    return (
      <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center bg-white p-8 rounded-2xl shadow-xl border border-ppu-border">
          <div className="w-16 h-16 bg-ppu-red/10 text-ppu-red border border-ppu-red/20 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2a1 1 0 0 1 .76.97Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#0B1220] tracking-tight">Pendaftaran Ditutup</h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
              Pendaftaran akun sudah ditutup. Silakan hubungi Panitia jika ini adalah kesalahan.
            </p>
          </div>
          <div className="pt-4 border-t border-ppu-border">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 bg-ppu-blue hover:bg-ppu-blue-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-ppu-blue/15"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl border border-ppu-border shadow-xl">
        <div>
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp"
            alt="PPU Logo"
            className="mx-auto w-24 h-auto mb-6 animate-pulse-subtle"
          />
          <h2 className="text-center text-3xl font-extrabold text-ppu-blue">
            Daftar Akun PPU
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
              <label htmlFor="captcha" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">
                Verifikasi Keamanan: Berapakah hasil dari [{num1} + {num2} =]
              </label>
              <input
                id="captcha"
                name="captcha"
                type="number"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Masukkan hasil penjumlahan"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
              />
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
    </div>
  );
}
