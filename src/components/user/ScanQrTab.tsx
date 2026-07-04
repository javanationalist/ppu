import React from 'react';
import { QrCode } from 'lucide-react';

export default function ScanQrTab() {
  return (
    <div className="max-w-md mx-auto bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-8 text-center shadow-lg transition-colors duration-300 animate-fade-in my-8">
      <div className="relative w-32 h-32 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-inner mb-6 mx-auto overflow-hidden">
        {/* Scanning green line animation */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-bounce" style={{ animationDuration: '3s' }} />
        <QrCode className="w-16 h-16 text-indigo-650 dark:text-sky-400" />
      </div>
      <h2 className="text-2xl font-black text-slate-800 dark:text-[#f5f5f5] mb-2 tracking-tight">Scan QR</h2>
      <p className="text-slate-500 dark:text-[#a3a3a3] text-sm leading-relaxed font-semibold">
        Fitur ini masih dalam tahap pengembangan dan akan segera tersedia.
      </p>
    </div>
  );
}
