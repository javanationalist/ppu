import React from 'react';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Edit3, 
  Check, 
  CreditCard 
} from 'lucide-react';
import { UserAccessSettings } from '../../lib/userAccessService';

interface ProfileTabProps {
  profile: any;
  accessSettings: UserAccessSettings;
  setIsEditModalOpen: (open: boolean) => void;
  isAllCompleted: boolean;
}

export default function ProfileTab({
  profile,
  accessSettings,
  setIsEditModalOpen,
  isAllCompleted,
}: ProfileTabProps) {
  
  // Format Indonesian Date Helper
  const formatIndonesianDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'N/A';
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const day = d.getDate();
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-4">
      {/* 1. Header Panel */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-left">
        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-405 rounded-xl flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30">
          <User className="w-4.5 h-4.5 sm:w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-855 dark:text-[#f5f5f5] tracking-tight">Profil Saya</h3>
          <p className="text-slate-450 dark:text-[#a3a3a3] text-[11px] sm:text-xs font-medium mt-0.5">Informasi akun dan data pribadi Anda</p>
        </div>
      </div>

      {/* Main Profile Container */}
      <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* 2. Profile Hero Card with Banner */}
        <div className="relative rounded-[16px] sm:rounded-[20px] border border-slate-100 dark:border-[#333333]/50 overflow-hidden bg-slate-50/50 dark:bg-[#1a1a1a]/30 pb-4 sm:pb-6">
          
          {/* Banner Area */}
          <div className="h-[110px] sm:h-[160px] w-full relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-950/25 dark:to-indigo-950/15">
            {/* Subtle dot pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-35 mix-blend-overlay dark:opacity-25" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dotPatternProfile" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill="currentColor" className="text-blue-600/40 dark:text-sky-400/40" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dotPatternProfile)" />
            </svg>
            
            {/* Decorative blobs */}
            <div className="absolute right-12 top-2 w-36 h-36 bg-blue-400/20 rounded-full blur-2xl dark:bg-blue-600/10" />
            <div className="absolute left-12 bottom-2 w-28 h-28 bg-indigo-400/15 rounded-full blur-xl dark:bg-indigo-650/5" />
          </div>

          {/* Avatar & Identitas */}
          <div className="flex flex-col items-center -mt-10 sm:-mt-16 px-4 text-center relative z-10">
            <div className="relative mb-3 sm:mb-4">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border-4 sm:border-[5px] border-white dark:border-[#2a2a2a] shadow-md flex items-center justify-center overflow-hidden shrink-0">
                <User className="w-10 h-10 sm:w-14 sm:h-14 text-indigo-600 dark:text-sky-400" />
              </div>
              {/* Checked Verified Badge */}
              <div className="absolute bottom-0 right-0 sm:bottom-1 sm:right-1 bg-blue-650 dark:bg-blue-500 text-white p-0.5 sm:p-1 rounded-full border-2 border-white dark:border-[#2a2a2a] shadow-sm flex items-center justify-center">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Nama & Email */}
            <h3 className="text-base sm:text-2xl font-black text-slate-855 dark:text-[#f5f5f5] tracking-tight mb-0.5 sm:mb-1 truncate max-w-full">
              {profile.full_name}
            </h3>
            <p className="text-[11px] sm:text-sm text-slate-450 dark:text-[#a3a3a3] font-medium truncate max-w-full">
              {profile.email}
            </p>
          </div>

        </div>

        {/* 3. Account Information Card */}
        <div className="bg-white dark:bg-[#252525]/20 border border-slate-200 dark:border-[#333333] rounded-[16px] sm:rounded-[20px] p-4 sm:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] mb-3 sm:mb-4 text-left font-sans">
            Informasi Akun
          </h4>
          
          <div className="divide-y divide-slate-100 dark:divide-[#333333]/70">
            {/* Nama Lengkap */}
            <div className="flex items-center justify-between py-3 sm:py-4 first:pt-0 last:pb-0 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-left min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-100/50 dark:border-blue-900/30">
                  <User className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] truncate">Nama Lengkap</h5>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] font-medium mt-0.5 leading-none">Nama sesuai identitas</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs sm:text-sm font-black text-slate-700 dark:text-[#e0e0e0]">{profile.full_name}</span>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-3 sm:py-4 last:pb-0 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-left min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-indigo-100/50 dark:border-indigo-900/30">
                  <Mail className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] truncate">Email</h5>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] font-medium mt-0.5 leading-none">Alamat email akun</p>
                </div>
              </div>
              <div className="text-right shrink-0 min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-[#e0e0e0] truncate block max-w-[140px] sm:max-w-xs">{profile.email}</span>
              </div>
            </div>

            {/* Kelas DPT */}
            <div className="flex items-center justify-between py-3 sm:py-4 last:pb-0 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-left min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/30">
                  <GraduationCap className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] truncate">Kelas DPT</h5>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] font-medium mt-0.5 leading-none">Kelas dalam Daftar Pemilih Tetap</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-sky-400 border border-blue-100 dark:border-blue-900/30 text-[10px] sm:text-xs font-black rounded-md sm:rounded-lg shadow-sm">
                  {profile.class || 'N/A'}
                </span>
              </div>
            </div>

            {/* Bergabung Sejak */}
            <div className="flex items-center justify-between py-3 sm:py-4 last:pb-0 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-left min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-655 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100/50 dark:border-rose-900/30">
                  <Calendar className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] truncate">Bergabung Sejak</h5>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] font-medium mt-0.5 leading-none">Tanggal pembuatan akun</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-[#e0e0e0]">
                  {formatIndonesianDate(profile.created_at)}
                </span>
              </div>
            </div>

            {/* Status Akun */}
            <div className="flex items-center justify-between py-3 sm:py-4 last:pb-0 gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-left min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 border border-violet-100/50 dark:border-violet-900/30">
                  <ShieldCheck className="w-4 h-4 sm:w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-[11px] sm:text-sm font-extrabold text-slate-800 dark:text-[#f5f5f5] truncate">Status Akun</h5>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-[#a3a3a3] font-medium mt-0.5 leading-none">Keamanan dan verifikasi akun</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {profile.account_status === 'dikonfirmasi' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 sm:mr-1.5 shrink-0" />
                    Akun Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 sm:mr-1.5 shrink-0" />
                    Belum Dikonfirmasi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 4. Edit Profile Button */}
        {accessSettings.edit_profil_enabled && (
          <div className="pt-1">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="w-full h-11 sm:h-[52px] flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full text-xs sm:text-sm font-black transition-all duration-200 shadow-[0_4px_12px_rgba(79,70,229,0.15)] hover:shadow-[0_4px_16px_rgba(79,70,229,0.25)] hover:scale-[1.01] active:scale-[0.99] focus:outline-none"
              type="button"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 h-4" />
              <span>Edit Profil</span>
            </button>
          </div>
        )}

        {/* 5. Footer Info */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 dark:text-[#a3a3a3] font-medium pt-1">
          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 dark:text-[#a3a3a3]" />
          <span>Data Anda aman dan tidak akan dibagikan ke pihak lain.</span>
        </div>

      </div>
    </div>
  );
}

