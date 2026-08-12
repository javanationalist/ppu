import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { M3ExpressiveLoadingIndicator } from './ui/M3ExpressiveLoadingIndicator';

export default function LogoutOverlay() {
  const { isLoggingOut } = useAuth();
  
  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <M3ExpressiveLoadingIndicator size="large" className="text-ppu-blue dark:text-sky-400 mx-auto" />
        <h2 className="text-lg font-black text-slate-900 dark:text-[#f5f5f5] tracking-tight">Keluar dari aplikasi...</h2>
        <p className="text-slate-400 dark:text-[#a3a3a3] text-sm">Mohon tunggu sebentar.</p>
      </div>
    </div>
  );
}
