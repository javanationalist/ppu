import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-2xl border border-ppu-border max-w-lg w-full space-y-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-amber-500"></div>
        
        <img 
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/maintenance.png" 
          alt="Maintenance Mode" 
          className="w-full max-w-[320px] mx-auto transform hover:scale-[1.02] transition-transform duration-500"
        />

        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">PPU Maintenance</h1>
          <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full"></div>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed font-semibold">
            Sistem saat ini sedang dalam proses pemeliharaan rutin untuk meningkatkan performa dan stabilitas. 
            <br className="hidden sm:block"/>
            Mohon maaf atas ketidaknyamanan ini.
          </p>
        </div>

        <div className="pt-6 border-t border-ppu-border">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 font-mono">Status: Penyesuaian Sistem</span>
          </div>
        </div>
      </div>
    </div>
  );
}
