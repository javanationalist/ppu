import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Vote, 
  Check 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpdeskButton, Dapil } from '../../types';
import { GelombangSesi } from '../../lib/gelombangService';
import { UserAccessSettings } from '../../lib/userAccessService';
import { Skeleton } from '../Skeleton';

interface StatusTabProps {
  profile: any;
  isAllCompleted: boolean;
  isSessionConfigActive: boolean;
  userSession: GelombangSesi | null;
  userDapil: Dapil | null;
  accessSettings: UserAccessSettings;
  helpdeskButtons: HelpdeskButton[];
  loading?: boolean;
  voteMode?: 'regular' | 'booth';
  isVoting?: boolean;
  setIsEditModalOpen?: (open: boolean) => void;
}

export default function StatusTab({
  profile,
  isAllCompleted,
  isSessionConfigActive,
  userSession,
  userDapil,
  accessSettings,
  helpdeskButtons,
  loading,
  voteMode = 'regular',
  isVoting = false,
  setIsEditModalOpen,
}: StatusTabProps) {
  // Calculate completion and active statuses for the stepper
  const isProfileComplete = !!(profile?.full_name && profile?.class);
  const isAccountConfirmed = profile?.account_status === 'dikonfirmasi';
  const isVoted = isAllCompleted || profile?.voting_status === 'sudah';

  // Current reached target level (from 2 to 5)
  const targetLevel = isVoted 
    ? 5 
    : isAccountConfirmed 
      ? 4 
      : isProfileComplete 
        ? 3 
        : 2;

  // Timing logic for progress step-by-step animation (1 second interval per step)
  const [visibleStep, setVisibleStep] = useState(() => {
    if (loading) return 0;
    const sessionKey = `ppu_anim_target_${profile?.id || 'guest'}`;
    const animatedTarget = sessionStorage.getItem(sessionKey);
    if (animatedTarget === String(targetLevel)) {
      return targetLevel;
    }
    return 1;
  });

  useEffect(() => {
    if (loading) return;
    const sessionKey = `ppu_anim_target_${profile?.id || 'guest'}`;
    const animatedTarget = sessionStorage.getItem(sessionKey);

    if (animatedTarget === String(targetLevel)) {
      setVisibleStep(targetLevel);
      return;
    }

    // Play animation starting from 1 up to targetLevel only
    let current = 1;
    setVisibleStep(1);

    const interval = setInterval(() => {
      current += 1;
      if (current <= targetLevel) {
        setVisibleStep(current);
      } else {
        clearInterval(interval);
        sessionStorage.setItem(sessionKey, String(targetLevel));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, targetLevel, profile?.id]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 text-left animate-pulse max-w-2xl mx-auto">
        {/* Stepper Skeleton */}
        <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="space-y-2 border-b border-slate-100 dark:border-[#333333] pb-4">
            <Skeleton className="h-5 w-48 rounded" />
            <Skeleton className="h-3 w-72 rounded" />
          </div>
          <div className="space-y-8 relative pl-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex gap-5 items-start">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-2 flex-1 pt-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-5/6 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const step1Status = 'completed'; // Selesai setelah user berhasil login
  const step2Status = isVoted ? 'completed' : (isProfileComplete ? 'completed' : 'active'); // Selesai jika profil lengkap
  const step3Status = isVoted 
    ? 'completed' 
    : (isAccountConfirmed 
      ? 'completed' 
      : (isProfileComplete ? 'active' : 'pending')); // Selesai jika akun dikonfirmasi panitia
  const step4Status = isVoted 
    ? 'completed' 
    : (isAccountConfirmed ? 'active' : 'pending'); // Selesai jika hak pilih digunakan
  const step5Status = isVoted ? 'completed' : 'pending'; // Selesai jika hak pilih digunakan

  const steps = [
    {
      id: 1,
      tag: 'Tahap 1',
      title: 'Verifikasi Akun',
      description: 'Verifikasi oleh sistem melalui kecocokan kredensial login.',
      status: step1Status,
    },
    {
      id: 2,
      tag: 'Tahap 2',
      title: 'Cek Profil',
      description: 'Pastikan data Nama Lengkap dan Kelas Kamu benar agar kartu pemilih dapat digunakan.',
      status: step2Status,
    },
    {
      id: 3,
      tag: 'Tahap 3',
      title: 'Konfirmasi Akun',
      description: 'Akun harus diverifikasi dan disetujui aktif oleh Panitia Pemilihan.',
      status: step3Status,
    },
    {
      id: 4,
      tag: 'Tahap 4',
      title: 'Melakukan Pemilihan',
      description: voteMode === 'regular' 
        ? 'Hubungkan perangkat Kamu dengan memindai kode QR yang ada di Bilik Suara.' 
        : 'Hubungkan perangkat Kamu dengan memindai kode QR yang ada di Bilik Suara.',
      status: step4Status,
    },
    {
      id: 5,
      tag: 'Tahap 5',
      title: 'Selesai',
      description: 'Partisipasimu telah selesai dan hak suara berhasil direkam di sistem.',
      status: step5Status,
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 text-left max-w-2xl mx-auto">
      {/* Progress Stepper Card */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-[24px] p-6 sm:p-8 shadow-sm transition-colors duration-300">
        <div className="border-b border-slate-100 dark:border-[#2a2a2a] pb-4 mb-6 text-center">
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight">
            Alur Status Pemilu
          </h3>
          <p className="text-slate-400 dark:text-[#a3a3a3] text-[11px] sm:text-xs transition-colors font-medium mt-0.5">
            Kamu bisa lihat progres partisipasi Kamu di sini.
          </p>
        </div>

        {/* Stepper Timeline */}
        <div className="relative pl-1">
          {steps.map((step, index) => {
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';
            
            return (
              <div key={step.id} className="relative flex items-start gap-5 pb-10 last:pb-0">
                
                {/* Vertical connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-0 w-[3px] bg-slate-100 dark:bg-zinc-800/80 -translate-x-1/2">
                    {visibleStep >= step.id + 1 && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className={`w-full origin-top ${
                          isCompleted ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}
                      />
                    )}
                  </div>
                )}

                {/* Circle Indicator */}
                <div className="relative z-10 flex items-center justify-center shrink-0 w-12 h-12">
                  <motion.div
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{
                      scale: (visibleStep >= step.id && isActive) ? 1.08 : 1,
                      opacity: 1
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.25 }}
                    className={`w-12 h-12 rounded-full border-[3px] flex items-center justify-center shadow-sm shrink-0 transition-colors duration-250 ${
                      visibleStep >= step.id && isCompleted
                        ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-500 dark:border-emerald-500 shadow-emerald-100 dark:shadow-none'
                        : visibleStep >= step.id && isActive
                          ? 'bg-sky-50 border-sky-500 dark:bg-sky-950/30 dark:border-sky-400 ring-4 ring-sky-500/10'
                          : 'bg-slate-50 border-slate-200 dark:bg-[#1a1a1a] dark:border-zinc-800'
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {visibleStep >= step.id && isCompleted ? (
                        <motion.div
                          key="check"
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.4 }}
                          transition={{ duration: 0.25, delay: 0.1 }}
                        >
                          <Check className="w-5 h-5 text-white stroke-[3.5]" />
                        </motion.div>
                      ) : visibleStep >= step.id && isActive ? (
                        <motion.div
                          key="active"
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.4 }}
                          transition={{ duration: 0.25 }}
                          className="w-3 h-3 rounded-full bg-sky-500 dark:bg-sky-400 shadow-md shadow-sky-500/20"
                        />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-750" />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Step content */}
                <div className="flex-1 pt-1 text-left">
                  <span className={`text-[10px] font-black uppercase tracking-wider block leading-none mb-1 transition-colors ${
                    visibleStep >= step.id && isCompleted 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : visibleStep >= step.id && isActive 
                        ? 'text-sky-500 dark:text-sky-400' 
                        : 'text-slate-400 dark:text-zinc-600'
                  }`}>
                    {step.tag}
                  </span>
                  <h4 className={`text-sm sm:text-base font-extrabold tracking-tight transition-colors ${
                    visibleStep >= step.id && (isCompleted || isActive) 
                      ? 'text-slate-850 dark:text-slate-100' 
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}>
                    {step.title}
                  </h4>
                  <p className={`text-xs mt-1 transition-colors leading-relaxed font-medium ${
                    visibleStep >= step.id && isActive 
                      ? 'text-slate-600 dark:text-slate-300' 
                      : visibleStep >= step.id && isCompleted 
                        ? 'text-slate-500 dark:text-slate-400' 
                        : 'text-slate-400 dark:text-zinc-600'
                  }`}>
                    {step.description}
                  </p>

                  {/* Step specific interactive elements */}
                  {step.id === 2 && visibleStep >= step.id && isActive && !isProfileComplete && setIsEditModalOpen && (
                    <div className="mt-3 p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed mb-2">
                        Profil Anda belum lengkap. Silakan isi Nama Lengkap & Kelas Anda terlebih dahulu.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] sm:text-xs font-extrabold shadow-sm transition-all focus:outline-none cursor-pointer"
                      >
                        Lengkapi Profil &rarr;
                      </button>
                    </div>
                  )}

                  {step.id === 3 && visibleStep >= step.id && isActive && (
                    <div className="mt-3 p-3 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-100/30 dark:border-blue-900/30">
                      <p className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold leading-relaxed">
                        Silakan verifikasi akun dengan menunjukkan Kartu Pemilih kepada Panitia.
                      </p>
                    </div>
                  )}

                  {step.id === 4 && visibleStep >= step.id && isActive && (
                    <div className="mt-3">
                      {voteMode === 'regular' ? (
                        accessSettings.voting_global_enabled ? (
                          <Link
                            to="/vote"
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-ppu-blue hover:bg-ppu-blue-dark dark:bg-sky-500 dark:hover:bg-sky-450 dark:text-slate-950 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg focus:outline-none"
                          >
                            <Vote className="w-3.5 h-3.5 shrink-0" />
                            <span>Mulai Memilih</span>
                          </Link>
                        ) : (
                          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 text-[11px] text-rose-700 dark:text-rose-450 font-bold leading-relaxed">
                            Bilik pemilihan umum belum diaktifkan oleh panitia.
                          </div>
                        )
                      ) : (
                        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-100/30 dark:border-indigo-900/30 rounded-xl">
                          {isVoting ? (
                            <p className="text-[11px] text-indigo-800 dark:text-sky-300 font-bold leading-relaxed animate-pulse">
                              Terhubung! Silakan lakukan proses pencoblosan di perangkat terminal Bilik Suara. Jangan tutup halaman ini.
                            </p>
                          ) : (
                            <p className="text-[11px] text-indigo-750 dark:text-sky-300 font-semibold leading-relaxed">
                              Silakan beralih ke tab <strong className="font-extrabold text-indigo-800 dark:text-sky-400">Scan QR</strong> untuk memindai kode QR Bilik Suara & menghubungkan akun Kamu.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Footer Info Bar */}
      <footer className="mt-8 pt-4 border-t border-slate-200 dark:border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between text-[8px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] uppercase tracking-widest gap-2 transition-colors duration-300">
        <div className="flex gap-2 sm:gap-4">
          <span>v1.3.4 Genesis</span>
          <span>&bull;</span>
          <span>Secure Node: Jakarta-S-01</span>
        </div>
        <div>
          Copyright &copy; 2026 SUARAKU
        </div>
      </footer>
    </div>
  );
}
