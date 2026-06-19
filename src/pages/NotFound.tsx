import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NotFound() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 max-w-lg w-full space-y-6">
        <img
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Untitled%20design_20260618_035641_0000.png"
          alt="Halaman Tidak Ditemukan"
          className="w-full max-w-sm mx-auto object-contain"
        />
        <div className="space-y-3">
          <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
            Halaman yang Anda cari tidak ditemukan.
          </p>
        </div>
        
        <div className="flex flex-col gap-3 pt-4">
          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/10"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
          
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-bold transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Kembali ke Dashboard Admin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
