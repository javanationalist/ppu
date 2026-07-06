import React from 'react';
import { LifeBuoy, Users, Clock, Calendar, MapPin, GraduationCap, Vote } from 'lucide-react';
import WafoSlider from '../WafoSlider';
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
}: StatusTabProps) {
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 text-left">
        {/* Information Slider Skeleton */}
        <Skeleton className="h-[120px] sm:h-[150px] w-full rounded-2xl sm:rounded-3xl" />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Left: Status cards & Voting Panel */}
          <div className="md:col-span-6 flex flex-col gap-4 sm:gap-6 animate-pulse">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm space-y-2">
                <Skeleton className="h-3 w-16 rounded" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm space-y-2">
                <Skeleton className="h-3 w-16 rounded" />
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[20px] sm:rounded-[24px] shadow-sm overflow-hidden">
              {/* Header Panel Skeleton */}
              <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-[#333333] flex items-center gap-3 sm:gap-4 bg-slate-50/30 dark:bg-[#1a1a1a]/10">
                <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Card Alokasi Sesi Skeleton */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <div className="bg-white dark:bg-[#252525]/40 border border-slate-150 dark:border-[#3a3a3a] rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-2.5 w-16 rounded" />
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:pl-6 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-[#333333] pt-3 sm:pt-0">
                      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-4 w-12 rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Wilayah Dapil Skeleton */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100/70 dark:border-indigo-900/40 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex gap-3 items-center flex-1">
                      <Skeleton className="w-10 h-10 sm:w-14 sm:h-14 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-3 w-20 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                      </div>
                    </div>
                    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Skeleton */}
          <div className="md:col-span-6 flex flex-col gap-4 sm:gap-6 h-full animate-pulse">
            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-2xl overflow-hidden shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#333333] pb-3">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-5/6 rounded" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-left">
      {/* Information Slider */}
      <WafoSlider />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Left: Status cards & Voting Panel */}
        <div className="md:col-span-6 flex flex-col gap-4 sm:gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm transition-colors">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a3a3a3] mb-1">Status Akun</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${profile.account_status === 'dikonfirmasi' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <span className={`text-xs sm:text-sm font-bold ${profile.account_status === 'dikonfirmasi' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-rose-400'} transition-colors`}>
                  {profile.account_status === 'dikonfirmasi' ? 'Dikonfirmasi' : 'Belum Dikonfirmasi'}
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm transition-colors">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#a3a3a3] mb-1">Status PU</p>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${(profile.voting_status === 'sudah' || isAllCompleted) ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                <span className={`text-xs sm:text-sm font-bold truncate transition-colors ${(!accessSettings.voting_global_enabled) ? 'text-rose-700 dark:text-rose-400' : (profile.voting_status === 'sudah' || isAllCompleted) ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {!accessSettings.voting_global_enabled ? 'Bilik Nonaktif' : (profile.voting_status === 'sudah' || isAllCompleted) ? 'Sudah Memilih' : 'Belum Memilih'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[20px] sm:rounded-[24px] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md animate-fade-in">
            {/* 1. Header Panel */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-[#333333] flex items-center gap-3 sm:gap-4 bg-slate-50/30 dark:bg-[#1a1a1a]/10 transition-colors">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-sky-400 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50 dark:border-blue-900/30">
                <Vote className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="text-left">
                <h3 className="text-sm sm:text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight transition-colors">Panel Pemungutan Suara</h3>
                <p className="text-slate-400 dark:text-[#a3a3a3] text-[11px] sm:text-xs transition-colors font-medium mt-0.5">Informasi wilayah dan alokasi pemilih Anda</p>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 2. Card Alokasi Sesi */}
              {isSessionConfigActive && (
                <div className="space-y-1.5 sm:space-y-2">
                  <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-[#a3a3a3]">ALOKASI SESI</p>
                  {userSession ? (
                    <div className="bg-white dark:bg-[#252525]/40 border border-slate-150 dark:border-[#3a3a3a] rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-indigo-150 dark:hover:border-sky-500 transition-all duration-300 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-center relative overflow-hidden group">
                      {/* Left Side */}
                      <div className="flex items-center gap-3 sm:gap-4 text-left">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30 shadow-sm">
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider block mb-0.5">Sesi Pemilihan</span>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-[#f5f5f5] transition-colors">{userSession.nama_sesi}</h4>
                          <p className="text-sm sm:text-lg font-black text-blue-600 dark:text-sky-400 leading-none mt-1 transition-colors">{userSession.jam_mulai} - {userSession.jam_selesai} WIB</p>
                        </div>
                      </div>

                      {/* Divider for desktop */}
                      <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-y-1/2 h-12 w-px bg-slate-200/60 dark:bg-[#333333]/80" />

                      {/* Right Side */}
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4 sm:pl-6 text-left">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-[#1c1c1c] text-slate-400 dark:text-[#a3a3a3] flex items-center justify-center shrink-0 border border-slate-100 dark:border-[#333333]/50">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-450 dark:text-[#a3a3a3] uppercase tracking-wider block mb-0.5 sm:mb-1">Status Sesi</span>
                          <div className="flex flex-col gap-1 items-start">
                            {accessSettings.voting_global_enabled ? (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                                  AKTIF
                                </span>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-[#a3a3a3] font-medium leading-tight">Sesi pemungutan suara sedang berlangsung</p>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 shadow-sm">
                                  NONAKTIF
                                </span>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-[#a3a3a3] font-medium leading-tight">Bilik pemilihan sedang ditutup</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#252525]/40 border border-slate-150 dark:border-[#3a3a3a] rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-center gap-3 sm:gap-4 text-left">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-[#a3a3a3] uppercase tracking-wider block mb-0.5">Sesi Pemilihan</span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-amber-700 dark:text-amber-400 transition-colors">Belum Dijadwalkan</h4>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a3a3a3] font-medium transition-colors mt-0.5">Jadwal sesi pemungutan suara Anda belum ditentukan.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Card Wilayah Dapil */}
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-slate-450 dark:text-[#a3a3a3]">ALOKASI DAPIL</p>
                {userDapil ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100/70 dark:border-indigo-900/40 rounded-2xl sm:rounded-[20px] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 relative overflow-hidden group">
                      {/* Left Side */}
                      <div className="flex-1 min-w-0 z-10 flex gap-3 sm:gap-4 items-start sm:items-center text-left">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm border border-indigo-200/50 dark:border-indigo-800/40">
                          <Users className="w-5 h-5 sm:w-7 sm:h-7" />
                        </div>
                        <div className="min-w-0 font-sans">
                          <span className="text-[9px] sm:text-[10px] font-bold text-indigo-500 dark:text-sky-400 uppercase tracking-wider block mb-0.5">Daerah Pemilihan</span>
                          <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight uppercase transition-colors">
                            {userDapil.name}
                          </h4>
                          <p className="text-[11px] sm:text-sm text-slate-500 dark:text-[#a3a3a3] leading-relaxed mt-1 font-medium max-w-md">
                            Anda termasuk dalam <span className="font-extrabold text-indigo-600 dark:text-sky-300">{userDapil.name}</span>. Berikut adalah daftar kelas yang termasuk dalam dapil ini.
                          </p>
                        </div>
                      </div>

                      {/* Right Side (Lightweight SVG map / location pin) */}
                      <div className="relative self-stretch sm:w-24 flex items-center justify-end sm:justify-center shrink-0 sm:border-l border-indigo-100/50 dark:border-indigo-900/30 sm:pl-5">
                        {/* SVG background grid/map lines */}
                        <div className="absolute right-0 top-0 bottom-0 opacity-15 dark:opacity-5 pointer-events-none">
                          <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 15 C30 5, 50 40, 95 20" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" className="text-indigo-600" />
                            <circle cx="95" cy="20" r="3" fill="currentColor" className="text-indigo-600 animate-ping" />
                            <circle cx="95" cy="20" r="2" fill="currentColor" className="text-indigo-600" />
                          </svg>
                        </div>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/90 dark:bg-[#252525]/80 text-indigo-600 dark:text-sky-400 flex items-center justify-center shadow-sm border border-indigo-100 dark:border-[#333333]/55 z-10 hover:scale-110 transition-all duration-300">
                          <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                      </div>
                    </div>

                    {/* 4. Card Daftar Kelas */}
                    <div className="bg-white dark:bg-[#252525]/30 border border-slate-200 dark:border-[#333333]/80 rounded-2xl sm:rounded-[20px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                      {/* Card Header */}
                      <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 dark:border-[#333333]/70 flex items-center justify-between gap-4 transition-colors bg-slate-50/50 dark:bg-[#1a1a1a]/20">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                            <GraduationCap className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] transition-colors">
                              Kelas dalam {userDapil.name}
                            </h4>
                            <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] transition-colors">
                              Total {userDapil.eligible_classes?.length || 0} kelas
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card Body (Chips) */}
                      <div className="p-4 sm:p-5 text-left">
                        {userDapil.eligible_classes && userDapil.eligible_classes.length > 0 ? (
                          <div className="flex flex-wrap gap-2 sm:gap-2.5">
                            {userDapil.eligible_classes.map((cls) => (
                              <div 
                                key={cls}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 h-8 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#3b3b3b] rounded-full text-[10px] sm:text-xs font-bold text-slate-700 dark:text-sky-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm hover:border-indigo-300 dark:hover:border-sky-500 hover:scale-105 select-none shrink-0 transition-all duration-200"
                              >
                                <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0"></span>
                                <span>{cls}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-[#a3a3a3] italic text-center py-2">
                            Tidak ada kelompok kelas di dapil ini.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#252525]/40 border border-slate-250 dark:border-[#333333]/80 rounded-2xl sm:rounded-[20px] p-5 sm:p-6 text-center shadow-sm space-y-3 sm:space-y-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-50 dark:bg-[#1a1a1a] text-slate-400 dark:text-[#a3a3a3] flex items-center justify-center mx-auto border border-slate-100 dark:border-[#333333]/50">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-[#f5f5f5] transition-colors">Belum Dialokasikan</h4>
                      <p className="text-[11px] sm:text-xs text-slate-450 dark:text-[#a3a3a3] transition-colors mt-1 max-w-sm mx-auto leading-relaxed">
                        Kelas Anda belum terdaftar di Dapil mana pun. Silakan hubungi admin kesiswaan untuk alokasi dapil Anda.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Layanan Bantuan */}
        <div className="md:col-span-6 flex flex-col gap-4 sm:gap-6 h-full">
          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-2xl overflow-hidden shadow-sm transition-colors flex flex-col justify-between h-full">
            <div className="bg-slate-50 dark:bg-[#1a1a1a]/50 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-[#333333] flex items-center justify-between transition-colors">
              <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-[#f5f5f5] flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                Layanan Bantuan
              </h3>
            </div>
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-center space-y-3 sm:space-y-4">
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed transition-colors">
                Jika ada kendala atau membutuhkan informasi, silakan hubungi panitia melalui kanal berikut.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {helpdeskButtons.map((btn) => (
                  <a
                    key={btn.id}
                    href={btn.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-2.5 border border-slate-200 dark:border-[#333333] hover:border-indigo-150 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] text-slate-700 dark:text-[#a3a3a3] hover:text-indigo-700 dark:hover:text-[#a3a3a3] rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm group h-11 sm:h-auto"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform" />
                    {btn.label}
                  </a>
                ))}
                {helpdeskButtons.length === 0 && (
                  <p className="col-span-2 text-center text-[11px] sm:text-xs text-slate-400 dark:text-[#a3a3a3] italic py-2">
                    Layanan bantuan belum tersedia.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <footer className="mt-6 sm:mt-8 pt-4 border-t border-slate-200 dark:border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between text-[8px] sm:text-[10px] text-slate-500 dark:text-[#a3a3a3] uppercase tracking-widest gap-2 transition-colors duration-300">
        <div className="flex gap-2 sm:gap-4">
          <span>v1.1.0 Genesis</span>
          <span>&bull;</span>
          <span>Secure Node: Jakarta-S-01</span>
        </div>
        <div>
          Copyright &copy; 2026 PPU Digital
        </div>
      </footer>
    </div>
  );
}
