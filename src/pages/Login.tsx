import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [targetPath, setTargetPath] = useState<string | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const handleRedirect = React.useCallback((path: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowSuccess(false);
    navigate(path, { replace: true });
  }, [navigate]);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const sessionExpiresAt = localStorage.getItem('session_expires_at');
    const isValidSession = sessionExpiresAt && Date.now() < parseInt(sessionExpiresAt);

    // If the success popup is currently shown, let the popup flow handle the transition
    if (showSuccess) {
      return;
    }

    if (user && profile && isValidSession) {
      if (profile.role === 'admin' || profile.role === 'creator') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, profile, navigate, showSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Database Cloud tidak terhubung. Pembungkus demo ditiadakan, Anda harus menghubungkan Supabase untuk menggunakan portal.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch role and is_deleted to determine redirect
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_deleted')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) throw profileError;

        if (profileData?.is_deleted) {
          await supabase.auth.signOut();
          throw new Error('Akun Anda dinonaktifkan atau dihapus oleh administrator.');
        }

        // Set session expiration upon successful login
        localStorage.setItem('session_expires_at', (Date.now() + 60 * 60 * 1000).toString());
        localStorage.setItem('lastActivity', Date.now().toString());

        const nextPath = (profileData?.role === 'admin' || profileData?.role === 'creator') ? '/admin' : '/dashboard';
        setTargetPath(nextPath);
        setShowSuccess(true);

        const timer = setTimeout(() => {
          handleRedirect(nextPath);
        }, 5000);
        timerRef.current = timer;
      }
    } catch (err: any) {
      let errMsg = err.message || 'An error occurred during login.';
      if (errMsg.toLowerCase().includes('invalid login credentials')) {
        errMsg = 'Email atau sandi salah';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ppu-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ppu-blue"></div>
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
            className="mx-auto w-24 h-auto mb-6"
          />
          <h2 className="text-center text-3xl font-extrabold text-ppu-blue">
            Login ke PPU
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-ppu-red/5 text-ppu-red border border-ppu-red/20 p-3 rounded text-sm font-semibold text-center">
              {error}
            </div>
          )}
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Email Admin / Pemilih</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Masukkan alamat email Anda"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase text-slate-500 mb-1 tracking-wider">Password / Kata Sandi</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-xl relative block w-full px-3.5 py-2.5 border border-ppu-border placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ppu-blue/20 focus:border-ppu-blue sm:text-sm font-medium"
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-ppu-blue hover:bg-ppu-blue-dark active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ppu-blue disabled:opacity-50 cursor-pointer shadow-md shadow-ppu-blue/10"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>
        <div className="text-center mt-4 border-t border-ppu-border pt-4">
          <span className="text-xs font-semibold text-slate-500">
            Belum punya akun?{' '}
            <Link to="/signup" className="text-ppu-blue hover:text-ppu-blue-dark font-bold">
              Sign Up
            </Link>
          </span>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center border border-slate-100 transform transition-all scale-100">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4 ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Login Berhasil</h3>
              <p className="text-sm text-slate-600 mb-6 font-medium">
                Login berhasil. Selamat datang kembali!
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRedirect(targetPath!)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              OK
            </button>
            <div className="mt-4 text-[10px] text-slate-400 font-medium">
              Mengalihkan otomatis dalam beberapa detik...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
