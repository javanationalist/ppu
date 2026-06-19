import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LogoutOverlay() {
  const { isLoggingOut } = useAuth();
  
  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 bg-white/90 z-[9999] flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Keluar dari aplikasi...</h2>
        <p className="text-slate-400 text-sm">Mohon tunggu sebentar.</p>
      </div>
    </div>
  );
}
