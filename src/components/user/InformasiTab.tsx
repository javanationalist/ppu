import React from 'react';
import { Info, Megaphone, AlertCircle, CalendarDays, FileText, Clock, HelpCircle } from 'lucide-react';
import { Skeleton } from '../Skeleton';

interface InformasiTabProps {
  announcements: any[];
  infoLoading: boolean;
  onOpenTutorial?: () => void;
}

export default function InformasiTab({ announcements, infoLoading, onOpenTutorial }: InformasiTabProps) {
  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'pengumuman': return <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />;
      case 'jadwal': return <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-sky-400" />;
      case 'panduan': return <FileText className="w-4 h-4 text-indigo-600 dark:text-sky-400" />;
      default: return <Megaphone className="w-4 h-4 text-indigo-600 dark:text-sky-400" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto text-left">
      <div className="relative mb-6 sm:mb-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-sky-500/10 border border-indigo-100 dark:border-sky-500/20 mb-3 sm:mb-4 shadow-sm">
            <Info className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-650 dark:text-sky-400" />
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-sky-400 tracking-tight uppercase mb-1 sm:mb-2">Informasi & Pengumuman</h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a3a3a3] font-medium max-w-md mx-auto leading-relaxed px-2">
            Pusat pengumuman resmi dan jadwal pelaksanaan pemilihan umum digital dari panitia kesiswaan.
          </p>
        </div>

        {onOpenTutorial && (
          <div className="absolute top-0 right-0">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-sky-500/10 hover:bg-indigo-100 dark:hover:bg-sky-500/20 text-indigo-650 dark:text-sky-400 border border-indigo-100 dark:border-sky-500/20 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
              title="Buka tutorial panduan"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {infoLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-4 sm:p-6 rounded-[20px] sm:rounded-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300 dark:bg-slate-700"></div>
                
                <div className="flex items-start gap-3 sm:gap-4">
                  <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg sm:rounded-xl" />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <Skeleton className="h-5 w-1/2 rounded" />
                      <Skeleton className="h-5 w-24 rounded-md shrink-0 animate-pulse" />
                    </div>
                    <div className="p-3 sm:p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-[#333333] space-y-2">
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-4/5 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-6 sm:p-8 rounded-[20px] sm:rounded-2xl text-center shadow-sm">
            <Megaphone className="w-7 h-7 sm:w-8 sm:h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-[#f5f5f5] mb-1">Belum Ada Informasi</h3>
            <p className="text-[11px] sm:text-xs text-slate-400 dark:text-[#a3a3a3] max-w-xs mx-auto">
              Belum ada pengumuman baru yang diterbitkan oleh panitia kesiswaan.
            </p>
          </div>
        ) : (
          announcements.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-4 sm:p-6 rounded-[20px] sm:rounded-2xl shadow-sm hover:border-indigo-150 dark:hover:border-sky-500/30 transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 dark:bg-sky-500 opacity-60"></div>
              
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-150 dark:border-[#333333] rounded-lg sm:rounded-xl flex items-center justify-center">
                  {getAnnouncementIcon(item.type || 'pengumuman')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-[#0B1220] dark:text-[#f5f5f5] leading-tight truncate group-hover:text-indigo-650 dark:group-hover:text-sky-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-150 dark:border-[#333333] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-full text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-[#a3a3a3] self-start sm:self-auto">
                      <Clock className="w-2.5 h-2.5" />
                      <span>
                        {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] sm:text-sm text-slate-600 dark:text-[#f5f5f5] leading-relaxed text-left whitespace-pre-line font-medium bg-slate-50/50 dark:bg-[#1a1a1a]/40 p-3 sm:p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-[#333333]">
                    {item.content}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
