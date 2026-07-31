import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Settings, Clock, Layers } from 'lucide-react';
import { getSystemUpdates } from '../lib/systemUpdateService';
import { SystemUpdate } from '../types';
import { Skeleton } from '../components/Skeleton';
import BackToHomeButton from '../components/BackToHomeButton';

export default function SystemUpdateUser() {
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getSystemUpdates();
        setUpdates(data);
      } catch (err) {
        console.error('Error loading system updates:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto transition-colors duration-300">
      {/* Top Bar */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <BackToHomeButton />
        <Link
          to="/informasi"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Informasi</span>
        </Link>
      </div>

      {/* Page Header */}
      <div className="text-center mb-12 w-full animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 dark:bg-sky-500/10 border border-indigo-100 dark:border-sky-500/20 mb-6 shadow-md shadow-indigo-500/5">
          <Settings className="w-10 h-10 sm:w-12 sm:h-12 text-ppu-blue dark:text-sky-400 stroke-[1.75]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-ppu-blue dark:text-sky-400 tracking-tight uppercase mb-3 text-center w-full transition-colors">
          Catatan Pembaruan Sistem
        </h1>
        <p className="text-slate-600 dark:text-[#a3a3a3] font-semibold sm:text-lg max-w-2xl mx-auto text-center w-full transition-colors">
          Riwayat lengkap pembaruan, peningkatan performa, dan fitur terbaru pada aplikasi PPU Digital.
        </p>
      </div>

      {/* Timeline Container */}
      <div className="w-full">
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-6 sm:p-8 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-7 w-36 rounded-lg" />
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-12 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-[#333333]">
              <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-[#f5f5f5] mb-2">Belum Ada Pembaruan</h3>
            <p className="text-slate-500 dark:text-[#a3a3a3] max-w-md mx-auto">
              Catatan pembaruan sistem akan ditampilkan di sini apabila ada rilis baru.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {updates.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-[40px_1fr] sm:grid-cols-[56px_1fr] items-start group animate-in fade-in slide-in-from-bottom-3 duration-300 ${
                  index < updates.length - 1 ? 'pb-6 sm:pb-8' : ''
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Column 1: Timeline Column (Outside Card) */}
                <div className="flex flex-col items-center self-stretch shrink-0">
                  {/* Circle Node (18px x 18px, white bg, 4px blue border, shadow) */}
                  <div className="w-[18px] h-[18px] rounded-full bg-white dark:bg-[#1a1a1a] border-[4px] border-ppu-blue dark:border-sky-400 shadow-xs shadow-ppu-blue/20 z-10 mt-6 shrink-0 transition-transform group-hover:scale-110" />

                  {/* Vertical Line extending seamlessly to next circle */}
                  {index < updates.length - 1 && (
                    <div className="w-[2px] bg-indigo-100 dark:bg-slate-800 flex-1 my-1" />
                  )}
                </div>

                {/* Column 2: Card Column */}
                <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-6 sm:p-7 rounded-2xl shadow-xs hover:shadow-md hover:border-ppu-blue/30 dark:hover:border-sky-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-[#333333]">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-lg text-xs sm:text-sm font-extrabold bg-indigo-50 dark:bg-sky-500/10 text-ppu-blue dark:text-sky-400 border border-indigo-100 dark:border-sky-500/20">
                        {item.version}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#a3a3a3]">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                  </div>

                  <div className="text-sm sm:text-base text-slate-700 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed pl-1">
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
