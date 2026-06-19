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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-3">Memeriksa hak akses pendaftaran...</p>
      </div>
    );
  }

  if (!signupEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 border border-rose-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-alert"><path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2a1 1 0 0 1 .76.97Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Ditutup</h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Pendaftaran akun sudah ditutup. Silakan hubungi Panitia PEMILOS jika ini adalah kesalahan.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/login"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-indigo-600/10"
            >
              Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Daftar Akun PPU
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded text-sm">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="fullName" className="sr-only">Nama</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nama"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 text-left">Kelas</label>
              <button
                type="button"
                id="signup-class-dropdown"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="appearance-none rounded relative block w-full px-3 py-2.5 border border-gray-300 bg-white placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-left text-sm font-semibold cursor-pointer select-none transition-all flex items-center justify-between"
              >
                <span>{classField || 'Pilih Kelas (e.g. XI-2)'}</span>
                <span className="text-gray-400 text-xs">▼</span>
              </button>
              
              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 max-h-72 overflow-y-auto">
                  {/* Special Classes (GTK) */}
                  {specialClasses.length > 0 && (
                    <div className="mb-3 pb-2 border-b border-gray-100 grid grid-cols-2 gap-2">
                      {specialClasses.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-2 text-xs text-center rounded hover:bg-slate-50 font-black transition-all border ${
                            classField === cls ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'text-slate-800 border-slate-200'
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
                      <div className="text-[9px] uppercase font-bold text-gray-400 border-b border-gray-100 pb-1 mb-1 text-center font-mono">Kelas X</div>
                      {col1.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 hover:text-indigo-650 font-bold transition-all ${
                            classField === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-gray-600'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>

                    {/* Kelas XI */}
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-gray-400 border-b border-gray-100 pb-1 mb-1 text-center font-mono">Kelas XI</div>
                      {col2.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 hover:text-indigo-650 font-bold transition-all ${
                            classField === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-gray-600'
                          }`}
                        >
                          {cls}
                        </button>
                      ))}
                    </div>

                    {/* Kelas XII */}
                    <div className="space-y-1">
                      <div className="text-[9px] uppercase font-bold text-gray-400 border-b border-gray-100 pb-1 mb-1 text-center font-mono">Kelas XII</div>
                      {col3.map(cls => (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => {
                            setClassField(cls);
                            setDropdownOpen(false);
                          }}
                          className={`w-full py-1 text-[11px] text-center rounded hover:bg-indigo-50 hover:text-indigo-650 font-bold transition-all ${
                            classField === cls ? 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white' : 'text-gray-600'
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
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Masukkan password minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="captcha" className="block text-sm font-medium text-gray-700 mb-1 select-none">
                [{num1} + {num2} =]
              </label>
              <input
                id="captcha"
                name="captcha"
                type="number"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Jawaban"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Mendaftar...' : 'Daftarkan Akun'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4">
          <span className="text-xs text-gray-500">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-500">
              Login
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
