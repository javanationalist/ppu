import { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, Users, Database, 
  BookOpen, Clock, AlertCircle 
} from 'lucide-react';
import { getAllProfiles, getAuditLogs } from '../../lib/adminService';
import { getCategories, getAllVotes } from '../../lib/votingService';
import { Profile, AuditLog, Vote } from '../../types';

const getAcademicYear = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 0 is Jan, 6 is July
  if (month >= 6) {
    return `${year}/${year + 1}`;
  } else {
    return `${year - 1}/${year}`;
  }
};

const getIndonesianDay = (): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
};

const getFormattedDate = (): string => {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getIndonesianFormattedDate = (): string => {
  const date = new Date();
  const day = date.getDate();
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

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
          @page {
            size: A4 portrait;
            margin: 3cm 3cm 3cm 3cm;
          }
          body {
            background: white;
          }
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
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
      <div id="print-area" className="bg-white p-8 sm:p-12 md:p-16 rounded-2xl border border-slate-200 shadow-sm text-black" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
        <style>{`
          #print-area, #print-area * {
            font-family: 'Times New Roman', Times, serif !important;
          }
        `}</style>

        {/* Official Header bar */}
        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
          <div style={{ fontSize: '16pt', marginBottom: '1cm', lineHeight: 'normal' }}>HASIL REKAPITULASI SUARA</div>
          <div style={{ fontSize: '16pt', marginBottom: '1cm', lineHeight: 'normal' }}>PEMILIHAN ANGGOTA MPK DAN KETUA OSIS</div>
          <div style={{ fontSize: '14pt', marginBottom: '1cm', lineHeight: 'normal' }}>SMA NEGERI 1 BANGSAL</div>
          <div style={{ fontSize: '14pt', marginBottom: '1cm', lineHeight: 'normal' }}>TAHUN AJARAN {getAcademicYear()}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid black', marginTop: '0', marginBottom: '1cm' }} />

        {/* Judul Isi */}
        <div style={{ textAlign: 'center', fontSize: '14pt', fontWeight: 'bold', marginBottom: '1cm', lineHeight: 'normal' }}>
          Hasil Rekapitulasi Suara
        </div>

        {/* Info detail / Isi Dokumen */}
        <div style={{ textAlign: 'left', fontSize: '12pt', fontWeight: 'normal', lineHeight: 'normal', marginBottom: '1cm' }}>
          <p style={{ marginBottom: '0.5cm' }}>
            Pada hari {getIndonesianDay()}, tanggal {getIndonesianFormattedDate()}, telah dilaksanakan Pemilihan Anggota MPK dan Ketua OSIS SMA Negeri 1 Bangsal Tahun Ajaran {getAcademicYear()}.
          </p>
          <p>
            Berdasarkan hasil pemungutan suara yang dilakukan melalui Platform SUARAKU, berikut merupakan hasil rekapitulasi suara yang telah diverifikasi dan dinyatakan sesuai dengan data yang tersimpan pada sistem.
          </p>
        </div>

        {/* Statistical columns inside printed report */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/20" style={{ fontSize: '12pt', fontWeight: 'normal' }}>
          <div className="p-4 border rounded-xl" style={{ fontWeight: 'normal' }}>
            <span style={{ fontSize: '10pt', display: 'block', color: '#64748b', marginBottom: '0.2cm', fontWeight: 'normal' }}>RINGKASAN PEMILIH TETAP (DPT)</span>
            <div style={{ fontSize: '18pt', fontWeight: 'normal', color: 'black' }}>{voters.length} SISWA</div>
            <p style={{ fontSize: '10pt', color: '#64748b', marginTop: '0.2cm', fontWeight: 'normal' }}>Total pemilih terdaftar resmi dalam platform database kesiswaan.</p>
          </div>
          <div className="p-4 border rounded-xl" style={{ fontWeight: 'normal' }}>
            <span style={{ fontSize: '10pt', display: 'block', color: '#64748b', marginBottom: '0.2cm', fontWeight: 'normal' }}>AKUMULASI KERTAS SUARA</span>
            <div style={{ fontSize: '18pt', fontWeight: 'normal', color: 'black' }}>{votes.length} SUARA</div>
            <p style={{ fontSize: '10pt', color: '#64748b', marginTop: '0.2cm', fontWeight: 'normal' }}>Jumlah total pilihan sah terhitung di sistem bilik e-voting.</p>
          </div>
        </div>

        {/* Penutup */}
        <div style={{ fontSize: '12pt', fontWeight: 'normal', lineHeight: 'normal', textAlign: 'left', marginTop: '1cm', marginBottom: '1.5cm' }}>
          <p>Demikian hasil rekapitulasi suara ini dibuat agar dapat dipergunakan sebagaimana mestinya.</p>
        </div>

        {/* Signatures section for verification */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2cm', marginTop: '1.5cm', fontSize: '12pt', fontWeight: 'normal', lineHeight: 'normal' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ display: 'block', marginBottom: '3.5cm' }}>Ketua Pelaksana</span>
            <span style={{ display: 'block' }}>(........................................)</span>
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ display: 'block', marginBottom: '3.5cm' }}>Penanggung Jawab</span>
            <span style={{ display: 'block' }}>(........................................)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
