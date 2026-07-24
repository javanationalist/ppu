import React from 'react';
import { Download } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { UserAccessSettings } from '../../lib/userAccessService';

interface VoterCardTabProps {
  profile: any;
  isAllCompleted: boolean;
  accessSettings: UserAccessSettings;
  isDownloading: boolean;
  handleDownload: () => void;
  cardRef: React.RefObject<HTMLDivElement>;
  qrRef: React.RefObject<HTMLCanvasElement>;
  renderBlurredEmail: (email: string) => React.ReactNode;
}

export default function VoterCardTab({
  profile,
  isAllCompleted,
  accessSettings,
  isDownloading,
  handleDownload,
  cardRef,
  qrRef,
  renderBlurredEmail,
}: VoterCardTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6 text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-[#f5f5f5] transition-colors">Kartu Pemilih Digital</h2>
          <p className="text-slate-500 dark:text-[#a3a3a3] text-xs sm:text-sm transition-colors">Identitas resmi untuk verifikasi pemilihan umum</p>
        </div>
        {accessSettings.download_kartu_enabled && accessSettings.visibilitas_kartu_enabled && !(profile?.card_visibility === false && (profile?.voting_status === 'sudah' || isAllCompleted)) && (
          <button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-100 dark:shadow-none shrink-0 disabled:opacity-50 h-11 sm:h-auto focus:outline-none"
            type="button"
          >
            <Download className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Sedang mengunduh...' : 'Download PNG'}</span>
          </button>
        )}
      </div>

      {/* THE KARTU PU (VOTERS CARD) */}
      {profile?.card_visibility === false && (profile?.voting_status === 'sudah' || isAllCompleted) ? (
        <div className="w-full bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[20px] sm:rounded-2xl p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6 transition-colors">
          <div className="border-b border-slate-100 dark:border-[#333333] pb-3 sm:pb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight transition-colors">Informasi Pemilih</h3>
            <p className="text-slate-400 dark:text-[#a3a3a3] text-[11px] sm:text-xs mt-0.5 sm:mt-1 transition-colors">Status penggunaan kartu pemilih digital Anda</p>
            <div className="mt-3 sm:mt-4 p-3 sm:p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 rounded-xl text-xs flex flex-col gap-1 sm:gap-1.5 shadow-sm transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                <span className="text-red-700 dark:text-red-400 font-extrabold uppercase tracking-widest text-[9px] sm:text-[10px] transition-colors">Kartu Expired</span>
              </div>
              <p className="text-slate-700 dark:text-[#f5f5f5] font-semibold leading-relaxed text-[11px] sm:text-xs transition-colors">
                Hak pilih Anda telah digunakan. <br className="hidden sm:inline"/>
                Terima kasih telah berpartisipasi dalam pemilu.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-450 dark:text-[#a3a3a3] uppercase tracking-widest">Nama Lengkap</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-sm sm:text-base font-extrabold truncate transition-colors">{profile.full_name}</span>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-455 dark:text-[#a3a3a3] uppercase tracking-widest">Email Terdaftar</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-xs sm:text-sm font-semibold truncate transition-colors">{renderBlurredEmail(profile.email)}</span>
            </div>
            <div className="space-y-0.5 sm:space-y-1 sm:col-span-2">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-455 dark:text-[#a3a3a3] uppercase tracking-widest">Kelas DPT</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-xs sm:text-sm font-black transition-colors">{profile.class || 'N/A'}</span>
            </div>
          </div>
        </div>
      ) : !accessSettings.visibilitas_kartu_enabled ? (
        <div className="w-full bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[20px] sm:rounded-2xl p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6 transition-colors">
          <div className="border-b border-slate-100 dark:border-[#333333] pb-3 sm:pb-4">
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-[#f5f5f5] tracking-tight transition-colors">Informasi Pemilih</h3>
            <p className="text-slate-400 dark:text-[#a3a3a3] text-[11px] sm:text-xs mt-0.5 sm:mt-1 transition-colors">Data identitas Anda untuk verifikasi manual oleh panitia kesiswaan</p>
            <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-400 text-[11px] sm:text-xs font-bold flex items-center gap-2 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Kartu pemilih digital belum diterbitkan.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-450 dark:text-[#a3a3a3] uppercase tracking-widest">Nama Lengkap</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-sm sm:text-base font-extrabold truncate transition-colors">{profile.full_name}</span>
            </div>
            <div className="space-y-0.5 sm:space-y-1">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-450 dark:text-[#a3a3a3] uppercase tracking-widest">Email Terdaftar</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-xs sm:text-sm font-semibold truncate transition-colors">{renderBlurredEmail(profile.email)}</span>
            </div>
            <div className="space-y-0.5 sm:space-y-1 sm:col-span-2">
              <span className="block text-[9px] sm:text-[10px] font-bold text-slate-455 dark:text-[#a3a3a3] uppercase tracking-widest">Kelas DPT</span>
              <span className="block text-slate-800 dark:text-[#f5f5f5] text-xs sm:text-sm font-black transition-colors">{profile.class || 'N/A'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full overflow-hidden flex justify-center bg-gray-100 dark:bg-[#111111] sm:bg-transparent rounded-[20px] sm:rounded-2xl p-1 sm:p-2">
          <div 
            ref={cardRef} 
            className="relative w-full max-w-[800px] aspect-[0.6/1] sm:aspect-[1.586/1] bg-gradient-to-br from-indigo-900 to-indigo-800 sm:rounded-2xl overflow-hidden sm:shadow-2xl sm:border-4 border-indigo-700 shrink-0 flex flex-col sm:block" 
            style={{ backgroundColor: '#312e81' }}
          >
            {/* Card Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid-card-inner-comp" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-card-inner-comp)" />
              </svg>
            </div>

            {/* Card Header */}
            <div className="relative p-4 sm:p-8 flex justify-between items-start gap-3 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-white rounded-lg flex items-center justify-center shadow-md shrink-0 p-1">
                  <img 
                    src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp" 
                    alt="PPU Logo" 
                    className="w-full h-full object-contain" 
                    crossOrigin="anonymous" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-white font-black tracking-[0.1em] sm:tracking-[0.2em] text-sm sm:text-2xl truncate">VOTERS CARD</h3>
                  <p className="text-indigo-300 text-[8px] sm:text-xs font-bold uppercase tracking-widest leading-tight truncate">Portal Pemilihan Umum</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-1 sm:ml-2">
                <p className="text-indigo-200 text-[7px] sm:text-[10px] font-bold uppercase tracking-wider">Document Serial</p>
                <p className="text-white font-mono text-[8px] sm:text-xs md:text-sm whitespace-nowrap overflow-visible">
                  PPU-26-{(profile.class || '').toUpperCase().replace(/[^A-Z0-9]/g, '')}{profile.card_id || '0000'}
                </p>
              </div>
            </div>

            {/* Card Body */}
            <div className="relative px-4 sm:px-8 py-2.5 sm:pt-2 sm:pb-16 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-10">
              <div className="flex-1 flex flex-col gap-2.5 sm:gap-3.5 min-w-0">
                <div>
                  <label className="block text-indigo-300 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 sm:mb-1">Nama Lengkap</label>
                  <p className="text-white text-base sm:text-2xl font-black truncate">{profile.full_name}</p>
                </div>
                <div>
                  <label className="block text-indigo-300 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 sm:mb-1">Email Terdaftar</label>
                  <p className="text-white text-xs sm:text-lg font-medium truncate">{renderBlurredEmail(profile.email)}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:gap-12">
                  <div className="flex-1">
                    <label className="block text-indigo-300 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 sm:mb-1">Kelas</label>
                    <p className="text-white text-xs sm:text-lg font-black truncate">{profile.class || 'N/A'}</p>
                  </div>
                  <div className="hidden sm:block flex-1">
                    <label className="block text-indigo-300 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5 sm:mb-1">Tanggal Cetak</label>
                    <p className="text-white text-xs sm:text-sm font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex gap-4 sm:gap-8 mt-1 sm:hidden">
                  <div>
                    <label className="block text-indigo-300 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider mb-0.5">Tanggal Cetak</label>
                    <p className="text-white text-xs font-semibold">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
              </div>

              {/* QR Code Column */}
              <div className="flex flex-col items-center justify-center shrink-0 gap-2.5 sm:gap-3">
                <div className="w-52 h-52 sm:w-[150px] sm:h-[150px] md:w-[175px] md:h-[175px] lg:w-[200px] lg:h-[200px] bg-white p-3.5 sm:p-4 rounded-[18px] sm:rounded-[20px] shadow-2xl border-2 border-white/10 flex items-center justify-center shrink-0 transition-all duration-300">
                  <div className="w-full h-full flex items-center justify-center relative">
                    <QRCodeCanvas 
                      ref={qrRef} 
                      value={profile.card_id || ''} 
                      size={512} 
                      level="H"
                      includeMargin={false}
                      imageSettings={{
                        src: "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp",
                        height: 80,
                        width: 80,
                        excavate: true,
                        crossOrigin: "anonymous"
                      }}
                      style={{ width: '100%', height: '100%' }} 
                    />
                    {/* Floating watermark circle to give the logo a perfect rounded/white background with quiet area */}
                    <div className="absolute w-[18%] h-[18%] bg-white rounded-full flex items-center justify-center p-[2%] shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-slate-100/60 select-none pointer-events-none">
                      <img 
                        src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU.webp" 
                        alt="PPU Logo Watermark" 
                        className="w-full h-full object-contain"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Card ID Badge right under the QR code */}
                <div className="bg-indigo-950/40 border border-indigo-500/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="text-indigo-200 text-[9px] uppercase font-bold tracking-wider">ID KARTU:</span>
                  <span className="text-white font-mono text-[11.5px] sm:text-xs font-black tracking-wider uppercase">
                    {profile.card_id || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="sm:absolute bottom-0 left-0 right-0 h-auto sm:h-16 mt-auto sm:mt-0 bg-black/20 backdrop-blur-sm p-3 sm:px-8 flex items-center border-t border-white/10">
              <p className="text-white/60 text-[9px] sm:text-[11px] leading-relaxed italic text-center sm:text-left">
                Tunjukkan kartu ini kepada panitia di tempat pemilihan untuk melakukan pemilihan. Kartu ini merupakan bukti identitas sah dalam sistem PPU Digital.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
