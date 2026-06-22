import React from 'react';
import { Crown, ShieldAlert, ArrowLeft, CheckCircle2, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function AksesPro() {
  const navigate = useNavigate();

  const proFeatures = [
    'Gelombang Voting (Manajemen Gelombang & Sesi Pemilihan Presisi)',
    'Kelola Kategori (Pengaturan Kategori Voting Dinamis & Kustom)',
    'Kelola Kandidat (Manajemen Profil Kandidat, Foto, & Visi Misi)',
    'Konfirmasi Pemilih (Verifikasi Cepat & Validasi Token Kehadiran)',
    'Kelola Pemilih (Manajemen Database Lengkap Daftar Pemilih Tetap)',
    'Hasil Quick Count (Statistik Real-time, Charts, & Kalkulasi Suara)',
    'Audit Log Keamanan (Pelacakan Log Jejak Aktivitas Admin & Sistem)',
    'Export Laporan (Unduh Data Format Excel, CSV, & PDF Sekali Klik)',
    'Scanner Pro (Pemindaian Cepat QR-Code & Pemilih Berbasis Kamera)',
    'Helpdesk S.O.S (Manajemen Tiket Keluhan & Kendala Pemilih Instan)',
    'Sistem Maintenance (Mode Pemeliharaan & Kunci Akses Cepat)',
    'Integrasi Sektor WAFO (Manajemen Guru, Staf GTK, & Unit Sekolah)',
    'Dukungan Premium CS Response 24/7 & SLA 99.9%'
  ];

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Top Navigation Back Banner */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Dashboard</span>
        </button>
      </div>

      {/* Main Premium Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-950 to-[#0d0f14] rounded-3xl border border-indigo-500/20 shadow-2xl p-6 sm:p-10 text-white">
        {/* Ambient Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header Section */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-5 max-w-2xl mx-auto">
          {/* Badge & Crown Icon */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-[10px] font-black tracking-widest uppercase">
            <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>PPU Pro</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
            PPU Pro
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
            Maaf, menu fitur ini memerlukan upgrade PPU Pro. Akun ada belum berlangganan fitur Pro.
          </p>

          <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent my-2" />
        </div>

        {/* Benefits Grid Section */}
        <div className="relative z-10 mt-8 max-w-xl mx-auto">
          <h3 className="text-center text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
            Alasan Mengapa Anda Memerlukan PPU PRO:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {proFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 hover:bg-white/10 transition-all duration-200"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-300 font-medium leading-normal">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button Section */}
        <div className="relative z-10 mt-10 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://wa.me/6285174181228?text=Halo!%20Saya%20ingin%20_upgrade_%20PPU%20Pro"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/40 hover:shadow-indigo-900/60 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300 font-bold" />
            <span>Aktifkan PPU PRO Sekarang</span>
          </a>
          
          <button
            onClick={() => navigate('/admin')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <span>Kembali</span>
          </button>
        </div>
      </div>
    </div>
  );
}
