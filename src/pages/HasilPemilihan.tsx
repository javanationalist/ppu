import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, RefreshCw, Trophy, Users, ShieldCheck, 
  ArrowLeft, Calendar, ShieldAlert
} from 'lucide-react';
import { getCategories, getCandidates, getAllVotes } from '../lib/votingService';
import { getAllProfiles } from '../lib/adminService';
import { Category, Vote, Candidate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getUserAccessSettings } from '../lib/userAccessService';

export default function HasilPemilihan() {
  const { profile: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [lihatHasilEnabled, setLihatHasilEnabled] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const loadData = async () => {
    try {
      const [pList, cList, vList] = await Promise.all([
        getAllProfiles(),
        getCategories(),
        getAllVotes()
      ]);
      
      setProfiles(pList || []);
      setCategories(cList || []);
      setVotes(vList || []);

      if (cList.length > 0 && !selectedCatId) {
        setSelectedCatId(cList[0].id);
      }

      // Load candidates for all categories
      const cmap: Record<string, Candidate[]> = {};
      await Promise.all(
        cList.map(async (cat) => {
          const list = await getCandidates(cat.id);
          cmap[cat.id] = list || [];
        })
      );
      setCandidatesMap(cmap);
    } catch (err) {
      console.error('Failed to load hasil voting publicly', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const s = await getUserAccessSettings();
        setLihatHasilEnabled(s.lihat_hasil_enabled);
      } catch (err) {
        console.error('Failed to load visibility settings:', err);
      } finally {
        setCheckingAccess(false);
      }
      await loadData();
    }
    init();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm animate-pulse">Menghitung perolehan suara sah...</p>
        </div>
      </div>
    );
  }

  // Check custom visibility block
  if (!lihatHasilEnabled && currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 border border-amber-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Forbidden</h2>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              Perolehan suara dinonaktifkan.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-indigo-600/10"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const voters = profiles.filter(p => p.role === 'user' && !p.is_deleted);
  const totalVoters = voters.length;
  const votedVoters = voters.filter(p => p.voting_status === 'sudah').length;
  const participationRate = totalVoters > 0 ? ((votedVoters / totalVoters) * 100).toFixed(1) : '0';

  // Vote calculation for selected category
  const activeCandidates = candidatesMap[selectedCatId] || [];
  const activeVotes = votes.filter(v => v.category_id === selectedCatId);
  const totalActiveVotesForCategory = activeVotes.length;

  const candidateScores = activeCandidates.map(c => {
    const score = activeVotes.filter(v => v.candidate_id === c.id).length;
    const itemPct = totalActiveVotesForCategory > 0 ? ((score / totalActiveVotesForCategory) * 100).toFixed(1) : '0.0';
    return {
      ...c,
      votesCount: score,
      percentage: Number(itemPct)
    };
  }).sort((a, b) => b.votesCount - a.votesCount);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Back Link */}
        <div className="flex justify-between items-center">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan'}</span>
          </button>
        </div>

        {/* Title Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full">
            <BarChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Hasil Pemilihan Raya Real-Time</h1>
            <p className="text-slate-500 text-sm mt-1 max-w-lg mx-auto">
              Sistem visualiasasi reka suara terbuka hasil voting kesiswaan yang terpercaya, jujur, dan transparan.
            </p>
          </div>
          <div className="flex justify-center gap-4 text-xs font-mono text-slate-500 pt-2">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>PEMILU RAYA 2026/2027</span>
            </span>
          </div>
        </div>

        {/* Participation Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">SUARA MASUK</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-800 block mt-1">{votedVoters}</span>
            <span className="text-[10px] text-slate-400">Total partisipasi siswa</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">TINGKAT KONTRIBUSI</span>
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 block mt-1">{participationRate}%</span>
            <div className="w-20 bg-slate-100 h-1 rounded-full mx-auto mt-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${participationRate}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 sm:col-span-1 text-center">
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest block">TOTAL REGISTERED DPT</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-800 block mt-1">{totalVoters}</span>
            <span className="text-[10px] text-slate-400">Target kesiswaan aktif</span>
          </div>
        </div>

        {/* Kategori Tab Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2 text-center sm:text-left">PILIH KATEGORI PEMILIHAN</label>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    selectedCatId === cat.id 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results Graphic */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-slate-850 text-lg">Peringkat Hasil Suara Masuk</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total perolehan suara dikategori ini: <span className="font-bold text-slate-700">{totalActiveVotesForCategory} suara</span>
              </p>
            </div>

            {candidateScores.length === 0 ? (
              <p className="text-center py-12 text-xs text-slate-400">Belum ada paslon terdaftar dalam kategori ini.</p>
            ) : (
              <div className="space-y-6">
                {candidateScores.map((cand, index) => {
                  const placeBg = [
                    'bg-amber-500 text-white',
                    'bg-slate-400 text-white',
                    'bg-orange-500 text-white'
                  ];
                  const fallbackBg = 'bg-slate-100 text-slate-600';

                  return (
                    <div key={cand.id} className="space-y-2 p-4 rounded-xl border border-slate-50 bg-slate-50/30">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Rank Badge & Profile Info */}
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-sm shadow-xs shrink-0 ${index < 3 ? placeBg[index] : fallbackBg}`}>
                            {index + 1}
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-indigo-600 font-mono block">
                              NO URUT {cand.number}
                              {(cand.class_name || cand.candidate_class) && ` • KELAS ${cand.class_name || cand.candidate_class}`}
                            </span>
                            <span className="font-extrabold text-slate-800 text-base">{cand.chairman}</span>
                            {cand.vice && <span className="text-xs text-slate-500 font-medium"> & {cand.vice}</span>}
                          </div>
                        </div>

                        {/* Percent score */}
                        <div className="text-right">
                          <span className="text-lg font-black text-slate-900 block">{cand.votesCount} Suara</span>
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{cand.percentage}%</span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-out shadow-inner"
                          style={{ width: `${cand.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
