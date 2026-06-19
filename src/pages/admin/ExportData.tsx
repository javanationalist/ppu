import { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, Users, Database, 
  BookOpen, Clock, AlertCircle 
} from 'lucide-react';
import { getAllProfiles, getAuditLogs } from '../../lib/adminService';
import { getCategories, getAllVotes } from '../../lib/votingService';
import { Profile, AuditLog, Vote } from '../../types';

export default function ExportData() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [pList, lList, vList] = await Promise.all([
          getAllProfiles(),
          getAuditLogs(),
          getAllVotes()
        ]);
        setProfiles(pList || []);
        setAuditLogs(lList || []);
        setVotes(vList || []);
      } catch (err) {
        console.error('Error loading data for export:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const voters = profiles.filter(p => p.role === 'user' && !p.is_deleted);

  // Helper: Trigger CSV download
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVoters = () => {
    if (voters.length === 0) return;
    const headers = ['Nama Lengkap', 'Email', 'Kelas', 'Card ID', 'Status Verifikasi', 'Status Memilih', 'Tanggal Dibuat'];
    const rows = voters.map(v => [
      v.full_name,
      v.email,
      v.class || '',
      v.card_id || '',
      v.account_status === 'dikonfirmasi' ? 'Terverifikasi' : 'Belum Verifikasi',
      v.voting_status === 'sudah' ? 'Sudah Memilih' : 'Belum Memilih',
      v.created_at ? new Date(v.created_at).toLocaleString('id-ID') : ''
    ]);
    downloadCSV('daftar_pemilih_tetap.csv', headers, rows);
  };

  const handleExportAuditLogs = () => {
    if (auditLogs.length === 0) return;
    const headers = ['Email Admin', 'Nama Tindakan', 'Target Pengaruh', 'Tanggal Waktu'];
    const rows = auditLogs.map(log => [
      log.admin_email,
      log.action,
      log.target_user || '',
      log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : ''
    ]);
    downloadCSV('audit_logs_pemilu.csv', headers, rows);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Menyiapkan konsol berkas ekspor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 print:p-0">
      {/* Print-only CSS style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="no-print">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          <span>Export & Dokumentasi Data</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Unduh database pemilih tetap, salin rekapan audit keamanan, atau cetak laporan pemilihan langsung.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
        {/* Box 1: DPT */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-56 hover:shadow-md transition-shadow group">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Users className="w-4 h-4" />
              <span>DPT (Voter Registry)</span>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Salinan Daftar Pemilih</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Unduh rincian seluruh pemilih terdaftar, lengkap dengan nomor Card ID unik, rombel kelas, dan status kehadiran.
            </p>
          </div>

          <button 
            onClick={handleExportVoters}
            className="w-full bg-slate-50 border border-slate-150 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor (.csv)</span>
          </button>
        </div>

        {/* Box 2: Audit Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-56 hover:shadow-md transition-shadow group">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Clock className="w-4 h-4" />
              <span>Security Audits</span>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Log Histori Keamanan</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Catatan autentik setiap konfigurasi administrasi, verifikasi voters, maupun penghapusan akun oleh admin demi keterbukaan informasi.
            </p>
          </div>

          <button 
            onClick={handleExportAuditLogs}
            className="w-full bg-slate-50 border border-slate-150 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 text-slate-600 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor (.csv)</span>
          </button>
        </div>

        {/* Box 3: Printer */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-56 hover:shadow-md transition-shadow group">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <Printer className="w-4 h-4" />
              <span>Print Ready</span>
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Cetak Dokumen Fisik</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Cetak hasil pemungutan suara berformat rapih, siap ditandatangani panitia penyelenggara dan kepala sekolah.
            </p>
          </div>

          <button 
            onClick={handlePrintSummary}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Fisik</span>
          </button>
        </div>
      </div>

      {/* Printable Area - Designed cleanly as a formal document */}
      <div id="print-area" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 text-black font-sans">
        {/* Official Header bar */}
        <div className="border-b-4 border-double border-black pb-4 text-center">
          <h2 className="text-xl font-extrabold uppercase tracking-wide">ORGANISASI SISWA INTRA SEKOLAH (OSIS)</h2>
          <h3 className="text-lg font-bold uppercase mt-1">PANITIA PEMILIHAN INTRA SEKOLAH (PPU)</h3>
          <p className="text-xs text-slate-500 font-mono mt-0.5">SISTEM E-VOTING PEMILU DIGITAL REAL-TIME</p>
        </div>

        {/* Info detail */}
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-bold">JENIS SISTEM:</span>
            <span>PEMILU RAYA DIGITAL PERSISTISI</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-bold">WAKTU REKAPITULASI DIBUAT:</span>
            <span>{new Date().toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between border-b pb-2 text-sm">
            <span className="font-bold">STATUS AUDIT:</span>
            <span className="font-mono text-emerald-600 font-bold">TERPROSES (VALID)</span>
          </div>
        </div>

        {/* Statistical columns inside printed report */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/20">
          <div className="p-4 border rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Ringkasan Pemilih Tetap (DPT)</span>
            <div className="text-2xl font-black">{voters.length} SISWA</div>
            <p className="text-[10px] text-slate-500">Total pemilih terdaftar resmi dalam platform database kesiswaan.</p>
          </div>
          <div className="p-4 border rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Akumulasi Kertas Suara</span>
            <div className="text-2xl font-black">{votes.length} SUARA</div>
            <p className="text-[10px] text-slate-500">Jumlah total pilihan sah terhitung di sistem bilik e-voting.</p>
          </div>
        </div>

        {/* Signatures section for verification */}
        <div className="grid grid-cols-2 gap-8 pt-16 text-center text-sm">
          <div className="space-y-12">
            <span>Ketua Panitia Pelaksana,</span>
            <div className="font-bold border-b border-black w-2/3 mx-auto pb-1 mt-10">________________________</div>
          </div>
          <div className="space-y-12">
            <span>Pembina OSIS / Perwakilan Sekolah,</span>
            <div className="font-bold border-b border-black w-2/3 mx-auto pb-1 mt-10">________________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
