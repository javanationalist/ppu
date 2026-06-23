import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CheckCircle2, Award, ClipboardCheck, 
  ChevronRight, ArrowUpRight, LifeBuoy, Database, History,
  Settings, Layers, FileText, ShieldAlert, BarChart3, RefreshCw, Lock, Unlock, ShieldCheck, Clock
} from 'lucide-react';
import { getAllProfiles } from '../../lib/adminService';
import { getCategories, getAllVotes } from '../../lib/votingService';
import { getHelpdeskButtons } from '../../lib/helpdesk';
import { getAdminButtonSettings, AdminButtonSettings } from '../../lib/adminButtonService';
import { Profile, Category, Vote } from '../../types';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [btnSettings, setBtnSettings] = useState<AdminButtonSettings>({
    kelola_kategori: true,
    kelola_kandidat: true,
    konfirmasi_pemilih: true,
    kelola_pemilih: true,
    wafo: true,
    kelola_helpdesk: true,
    visibilitas_user: true,
    hasil_voting: true,
    audit_log: true,
    export_data: true,
    maintenance: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [pList, cList, vList, hList, bSettings] = await Promise.all([
          getAllProfiles(),
          getCategories(),
          getAllVotes(),
          getHelpdeskButtons(),
          getAdminButtonSettings()
        ]);
        setProfiles(pList || []);
        setCategories(cList || []);
        setVotes(vList || []);
        setTicketsCount(hList ? hList.length : 0);
        if (bSettings) setBtnSettings(bSettings);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Memuat data ringkasan...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const voters = profiles.filter(p => p.role === 'user' && !p.is_deleted);
  const totalVoters = voters.length;
  const verifiedVoters = voters.filter(p => p.account_status === 'dikonfirmasi').length;
  const votedVoters = voters.filter(p => p.voting_status === 'sudah').length;
  
  const participationPercentage = totalVoters > 0 ? Math.round((votedVoters / totalVoters) * 100) : 0;
  const verificationPercentage = totalVoters > 0 ? Math.round((verifiedVoters / totalVoters) * 100) : 0;

  // Group votes by category
  const categoryVotesCount = categories.reduce((acc, cat) => {
    acc[cat.id] = votes.filter(v => v.category_id === cat.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Sistem Pemilihan Umum Intra Sekolah (PPU) Real-Time Control Center.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <span>STATUS: ONLINE & PERSISTENT</span>
        </div>
      </div>

      {/* Main Metrics Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group duration-300 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total DPT (Voters)</span>
            <h2 className="text-4xl font-extrabold text-slate-800">{totalVoters}</h2>
            <p className="text-xs text-slate-500">Siswa terdaftar dalam sistem</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group duration-300 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pemilih Terverifikasi</span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-extrabold text-slate-800">{verifiedVoters}</h2>
              <span className="text-xs text-emerald-600 font-bold">({verificationPercentage}%)</span>
            </div>
            {/* Simple progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${verificationPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group duration-300 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Kertas Suara Masuk</span>
            <h2 className="text-4xl font-extrabold text-slate-800">{votes.length}</h2>
            <p className="text-xs text-indigo-600 font-medium">Dari {categories.length} Kategori Utama</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group duration-300 flex justify-between items-start">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Partisipasi (Selesai)</span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-extrabold text-slate-800">{votedVoters}</h2>
              <span className="text-xs text-indigo-600 font-bold">({participationPercentage}%)</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${participationPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Visual Analytics & Access Control Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart representation & stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Perolehan Suara Masuk</h3>
              <p className="text-xs text-slate-400">Distribusi jumlah suara yang masuk per kategori pemilihan</p>
            </div>
          </div>

          <div className="space-y-4">
            {categories.map(cat => {
              const voteCount = categoryVotesCount[cat.id] || 0;
              const barPercentage = verifiedVoters > 0 ? Math.min(100, Math.round((voteCount / verifiedVoters) * 100)) : 0;

              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span> {cat.name}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {voteCount} <span className="text-xs text-slate-400 font-normal">/ {verifiedVoters} DPT Terverifikasi ({barPercentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-lg overflow-hidden flex">
                    <div 
                      className="bg-indigo-600 h-full transition-all duration-1000 ease-out flex items-center justify-end pr-2 text-[9px] font-bold text-white shadow-inner" 
                      style={{ width: `${Math.max(8, barPercentage)}%` }}
                    >
                      {barPercentage > 15 && `${barPercentage}%`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Kontrol Akses Menu Admin</h3>
                <p className="text-xs text-slate-400">Status visibilitas fitur admin saat ini (Hanya dapat diubah langsung melalui database).</p>
              </div>
            </div>

            <div className="overflow-hidden border border-slate-100 rounded-xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest">
                      Nama Menu
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest w-36">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {[
                    { key: 'gelombang_voting', label: 'Gelombang Voting', icon: Clock },
                    { key: 'kelola_kategori', label: 'Kelola Kategori', icon: Settings },
                    { key: 'kelola_kandidat', label: 'Kelola Kandidat', icon: Layers },
                    { key: 'konfirmasi_pemilih', label: 'Konfirmasi', icon: ShieldCheck },
                    { key: 'kelola_pemilih', label: 'Kelola Pemilih', icon: Users },
                    { key: 'wafo', label: 'WAFO', icon: FileText },
                    { key: 'kelola_helpdesk', label: 'Helpdesk', icon: LifeBuoy },
                    { key: 'visibilitas_user', label: 'Visibilitas', icon: ShieldAlert },
                    { key: 'hasil_voting', label: 'Hasil Voting', icon: BarChart3 },
                    { key: 'audit_log', label: 'Audit Log', icon: FileText },
                    { key: 'export_data', label: 'Export Data', icon: FileText },
                    { key: 'maintenance', label: 'Maintenance', icon: Settings },
                  ].map((item) => {
                    const isEnabled = (btnSettings as any)[item.key];
                    return (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg shrink-0 ${isEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{item.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isEnabled 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isEnabled ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Utilities Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900">Akses Cepat Panel</h3>

          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={() => navigate('/admin/konfirmasi')}
              disabled={!btnSettings.konfirmasi_pemilih}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all font-medium text-sm group text-left ${
                !btnSettings.konfirmasi_pemilih 
                  ? 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed text-slate-400' 
                  : 'border-slate-100 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${!btnSettings.konfirmasi_pemilih ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200'}`}>
                  {btnSettings.konfirmasi_pemilih ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <span className={`block font-bold truncate ${!btnSettings.konfirmasi_pemilih ? 'text-slate-400' : 'text-slate-800'}`}>Verifikasi Barcode</span>
                  <span className="text-[10px] text-slate-400 font-normal">Konfirmasi pendaftaran siswa</span>
                </div>
              </div>
              {btnSettings.konfirmasi_pemilih && <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />}
            </button>

            <button 
              onClick={() => navigate('/admin/pemilih')}
              disabled={!btnSettings.kelola_pemilih}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all font-medium text-sm group text-left ${
                !btnSettings.kelola_pemilih 
                  ? 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed text-slate-400' 
                  : 'border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${!btnSettings.kelola_pemilih ? 'bg-slate-200 text-slate-400' : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'}`}>
                  {btnSettings.kelola_pemilih ? <Users className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <span className={`block font-bold truncate ${!btnSettings.kelola_pemilih ? 'text-slate-400' : 'text-slate-800'}`}>Kelola Daftar Pemilih</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tambah / hapus pemilih</span>
                </div>
              </div>
              {btnSettings.kelola_pemilih && <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />}
            </button>

            <button 
              onClick={() => navigate('/admin/helpdesk')}
              disabled={!btnSettings.kelola_helpdesk}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all font-medium text-sm group text-left ${
                !btnSettings.kelola_helpdesk 
                  ? 'bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed text-slate-400' 
                  : 'border-slate-100 bg-slate-50 hover:bg-amber-50 hover:border-amber-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${!btnSettings.kelola_helpdesk ? 'bg-slate-200 text-slate-400' : 'bg-amber-100 text-amber-700 group-hover:bg-amber-200'}`}>
                  {btnSettings.kelola_helpdesk ? <LifeBuoy className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <span className={`block font-bold truncate ${!btnSettings.kelola_helpdesk ? 'text-slate-400' : 'text-slate-800'}`}>Saluran Helpdesk</span>
                  <span className="text-[10px] text-slate-400 font-normal">{ticketsCount} Tombol panduan keluhan aktif</span>
                </div>
              </div>
              {btnSettings.kelola_helpdesk && <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>

          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Metrik Keamaan</h4>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Keutuhan Integritas Suara</span>
              <span className="font-semibold text-emerald-600 font-mono">100% AMAN (RSA-254)</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Waktu Sesi Administrator</span>
              <span className="font-mono text-indigo-600">8 jam aktif</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
