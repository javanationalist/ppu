import React, { useState } from 'react';
import { Skeleton } from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import BackToHomeButton from '../components/BackToHomeButton';

export default function CaraMenggunakan() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { user, profile } = useAuth();
  const dashboardPath = profile?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <BackToHomeButton />
        {user && (
          <Link
            to={dashboardPath}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Dashboard</span>
          </Link>
        )}
      </div>
      <div className="w-full max-w-5xl bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] rounded-3xl shadow-2xl overflow-hidden p-2 sm:p-4 transition-colors relative">
        {!imageLoaded && (
          <Skeleton className="w-full h-[500px] rounded-2xl" />
        )}
        <img
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Tata%20Cara%20PPU.png"
          alt="Tata Cara Penggunaan PPU"
          className={`w-full h-auto object-contain rounded-2xl mx-auto shadow-sm dark:opacity-90 transition-opacity duration-300 ${
            imageLoaded ? 'block opacity-100' : 'hidden opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
