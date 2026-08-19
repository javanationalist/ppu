import { useEffect, useState } from 'react';
import { 
  BarChart, RefreshCw, Users, 
  Clock, AlertTriangle, MapPin, ArrowLeft, ShieldAlert, Vote, Crown
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { getUserAccessSettings } from '../lib/userAccessService';
import { getAllProfiles } from '../lib/adminService';
import { getCategories, getCandidates, getAllVotes, getDapils, getElectionStatistics, ElectionStatistics } from '../lib/votingService';
import { Profile, Category, Vote as VoteType, Candidate, Dapil } from '../types';
import { M3ExpressiveLoadingIndicator } from '../components/ui/M3ExpressiveLoadingIndicator';

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
];

export default function HasilPemilihan() {
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [stats, setStats] = useState<ElectionStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lihatHasilEnabled, setLihatHasilEnabled] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedDapilId, setSelectedDapilId] = useState('');
  const [step, setStep] = useState<'category' | 'dapil' | 'results'>('category');

  const loadData = async () => {
    try {
      const [pList, cList, vList, dList, computedStats] = await Promise.all([
        getAllProfiles(),
        getCategories(),
        getAllVotes(),
        getDapils(),
        getElectionStatistics()
      ]);
      
      setProfiles(pList || []);
      setCategories(cList || []);
      setVotes(vList || []);
      setDapils(dList || []);
      setStats(computedStats);

      let defaultCatId = selectedCatId;
      if (cList.length > 0 && !defaultCatId) {
        defaultCatId = cList[0].id;
        setSelectedCatId(defaultCatId);
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

      // Auto-select first dapil if category is mpk_smaba
      if (defaultCatId) {
        const activeCat = cList.find(c => c.id === defaultCatId);
        if (activeCat?.type === 'mpk_smaba') {
          const activeDapils = (dList || []).filter(d => d.category_id === defaultCatId);
          if (activeDapils.length > 0 && !selectedDapilId) {
            setSelectedDapilId(activeDapils[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load hasil voting', err);
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

  // Update selected Dapil when category changes
  useEffect(() => {
    if (selectedCatId) {
      const activeCat = categories.find(c => c.id === selectedCatId);
      if (activeCat?.type === 'mpk_smaba') {
        const catDapils = dapils.filter(d => d.category_id === selectedCatId);
        if (catDapils.length > 0) {
          if (!selectedDapilId || !catDapils.some(d => d.id === selectedDapilId)) {
            setSelectedDapilId(catDapils[0].id);
          }
        } else {
          setSelectedDapilId('');
        }
      } else {
        setSelectedDapilId('');
      }
    }
  }, [selectedCatId, categories, dapils, selectedDapilId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleTampilkanHasil = () => {
    if (!selectedCatId) return;
    const activeCat = categories.find(c => c.id === selectedCatId);
    if (activeCat?.type === 'mpk_smaba') {
      const activeDapils = dapils.filter(d => d.category_id === selectedCatId);
      if (activeDapils.length > 0) {
        setSelectedDapilId(activeDapils[0].id);
      } else {
        setSelectedDapilId('');
      }
      setStep('dapil');
    } else {
      setStep('results');
    }
  };

  const handleTampilkanDapilHasil = () => {
    if (!selectedDapilId) return;
    setStep('results');
  };

  const handleBack = () => {
    if (step === 'results') {
      const activeCat = categories.find(c => c.id === selectedCatId);
      if (activeCat?.type === 'mpk_smaba') {
        setStep('dapil');
      } else {
        setStep('category');
      }
    } else if (step === 'dapil') {
      setStep('category');
    }
  };

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-ppu-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <M3ExpressiveLoadingIndicator size="large" className="text-ppu-blue" />
          <p className="text-slate-600 font-bold text-sm animate-pulse">Menghitung perolehan suara...</p>
        </div>
      </div>
    );
  }

  // Check custom visibility block
  if (!lihatHasilEnabled && currentUser?.role !== 'admin' && currentUser?.role !== 'creator') {
    return (
      <div className="min-h-screen bg-ppu-surface flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center bg-white p-8 sm:p-12 rounded-3xl shadow-2xl border border-ppu-border relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-ppu-blue"></div>
          
          <img 
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/result.png" 
            alt="Hasil Pemilihan Ditutup" 
            className="w-full max-w-[280px] mx-auto transform hover:scale-[1.02] transition-transform duration-500"
          />

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akses Terbatas</h2>
            <p className="text-slate-500 text-sm leading-relaxed font-semibold">
              Hasil perolehan suara saat ini sedang tidak dipublikasikan. Silakan hubungi Panitia untuk informasi lebih lanjut.
            </p>
          </div>

          <div className="pt-6 border-t border-ppu-border">
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center py-3.5 px-6 bg-ppu-blue hover:bg-ppu-blue-dark active:scale-[0.98] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-ppu-blue/20"
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
  const totalVoters = stats ? stats.totalDpt : voters.length;
  const votedVoters = stats ? stats.completedVoters : voters.filter(p => p.voting_status === 'sudah').length;
  const participationRate = stats ? stats.participationRate.toFixed(1) : (totalVoters > 0 ? ((votedVoters / totalVoters) * 100).toFixed(1) : '0');
  const abstentions = totalVoters - votedVoters;

  const activeCategory = categories.find(c => c.id === selectedCatId);
  const isMpkType = activeCategory?.type === 'mpk_smaba';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-8 select-none">
        
        {/* Navigation / Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart className="w-5 h-5 text-blue-600" />
                <span>Hasil Voting Terkini</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">SUARAKU</p>
            </div>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {refreshing ? (
              <M3ExpressiveLoadingIndicator size="small" className="text-white" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>

        {/* STEP 1: CATEGORY SELECTION IN CARD FORM AND DROPDOWN */}
        {step === 'category' && (
          <div className="space-y-8 animate-fade-in">
            {/* Main Selection Card */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm max-w-2xl mx-auto text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Hasil Voting</h2>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                  Pilih kategori pemilihan yang ingin dilihat hasil rekapitulasi suaranya secara real-time.
                </p>
              </div>

              {/* Selector and Action Button */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
                <div className="relative w-full">
                  <select
                    value={selectedCatId}
                    onChange={(e) => setSelectedCatId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-blue-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 rounded-xl px-4 py-3 font-bold text-sm outline-none transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>
                <button
                  onClick={handleTampilkanHasil}
                  disabled={!selectedCatId}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 transition-all shrink-0 active:scale-[0.98] cursor-pointer"
                >
                  Tampilkan Hasil
                </button>
              </div>
            </div>

            {/* Category Cards Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 rounded"></span>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider font-mono">Daftar Kategori Pemilihan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => {
                  const isSelected = selectedCatId === cat.id;
                  return (
                    <div 
                      key={cat.id}
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        // Trigger show results
                        const isMpk = cat.type === 'mpk_smaba';
                        if (isMpk) {
                          const activeDapils = dapils.filter(d => d.category_id === cat.id);
                          if (activeDapils.length > 0) {
                            setSelectedDapilId(activeDapils[0].id);
                          } else {
                            setSelectedDapilId('');
                          }
                          setStep('dapil');
                        } else {
                          setStep('results');
                        }
                      }}
                      className={`group p-6 rounded-2xl border bg-white hover:bg-slate-50/50 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden ${
                        isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-350">
                            {cat.icon || '🗳️'}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">
                              {cat.name}
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {cat.type === 'mpk_smaba' ? 'Perwakilan Kelas (MPK)' : 'Ketua & Wakil Ketua OSIS'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 flex items-center justify-between text-xs font-bold pt-4 border-t border-slate-100">
                        <span className="text-slate-400 group-hover:text-slate-600 transition-colors">Tipe Pemilihan</span>
                        <span className="text-blue-600 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Lihat Hasil</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DAPIL SELECTION FOR MPK */}
        {step === 'dapil' && (
          <div className="max-w-xl mx-auto animate-fade-in">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <button 
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← Kembali ke Kategori
              </button>

              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block font-mono">REKAPITULASI DAERAH PEMILIHAN</span>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Daerah Pemilihan (Dapil)</h2>
                <p className="text-sm text-slate-500 font-medium">
                  Kategori {activeCategory?.name} terbagi menjadi beberapa Daerah Pemilihan. Pilih Dapil yang ingin ditampilkan.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div className="relative">
                  <select
                    value={selectedDapilId}
                    onChange={(e) => setSelectedDapilId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-blue-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-900 rounded-xl px-4 py-3 font-bold text-sm outline-none transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="" disabled>-- Pilih Dapil --</option>
                    {dapils.filter(d => d.category_id === selectedCatId).map(d => (
                      <option key={d.id} value={d.id}>
                        📍 {d.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <MapPin className="w-4 h-4 text-blue-500" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleBack}
                    className="w-1/2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleTampilkanDapilHasil}
                    disabled={!selectedDapilId}
                    className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/10 transition-all active:scale-[0.98]"
                  >
                    Tampilkan Hasil
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS BOARD (DONUT CHART + CANDIDATE RANKINGS + STATS) */}
        {step === 'results' && (
          <div className="space-y-8 animate-fade-in">
            {/* Category / Sub-navigation Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  ← Ganti Kategori
                </button>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Kategori Aktif:</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-extrabold border border-blue-100">
                    {activeCategory?.name} {selectedDapilId && ` - ${dapils.find(d => d.id === selectedDapilId)?.name}`}
                  </span>
                </span>
              </div>
            </div>

            {/* Split Grid for Main Board & Stats Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column (Main Chart and Candidates) - Spans 2 */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Visual Focus: Donut Chart (Show only for non-MPK or when appropriate) */}
                {!isMpkType && (() => {
                  const activeCandidates = candidatesMap[selectedCatId] || [];
                  const activeVotes = votes.filter(v => v.category_id === selectedCatId);
                  const totalActiveVotes = activeVotes.length;

                  const cScores = activeCandidates.map((c, index) => {
                    const score = activeVotes.filter(v => v.candidate_id === c.id).length;
                    const percentageStr = totalActiveVotes > 0 ? ((score / totalActiveVotes) * 100).toFixed(1) : '0.0';
                    return {
                      ...c,
                      votesCount: score,
                      percentage: Number(percentageStr),
                      color: CHART_COLORS[index % CHART_COLORS.length]
                    };
                  }).sort((a, b) => b.votesCount - a.votesCount);

                  if (cScores.length === 0) return null;

                  const winningPercentage = cScores.length > 0 ? cScores[0].percentage : 0;
                  const winnerName = cScores.length > 0 ? cScores[0].chairman : '-';

                  return (
                    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Donut Chart Visualisasi</h3>
                        <p className="text-xs text-slate-500 font-semibold">Progres persentasi suara sah masing-masing kandidat</p>
                      </div>

                      {/* Donut Chart container */}
                      <div className="relative flex items-center justify-center h-64 sm:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={cScores}
                              nameKey="chairman"
                              dataKey="votesCount"
                              cx="50%"
                              cy="50%"
                              innerRadius="65%"
                              outerRadius="85%"
                              paddingAngle={3}
                              animationDuration={800}
                            >
                              {cScores.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value, name) => [`${value} Suara`, name]}
                              contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        {/* Absolute center text overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Suara Tertinggi</span>
                          <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">{winningPercentage}%</span>
                          <span className="text-[10px] font-bold text-blue-600 mt-1 max-w-[130px] truncate text-center" title={winnerName}>
                            {winnerName}
                          </span>
                        </div>
                      </div>

                      {/* Compact Legend Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100 text-xs font-semibold">
                        {cScores.map((cand) => (
                          <div key={cand.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cand.color }}></span>
                              <span className="text-slate-700 truncate">{cand.chairman}</span>
                            </div>
                            <div className="flex items-baseline gap-1 shrink-0">
                              <span className="text-slate-900 font-black font-mono text-xs">{cand.percentage.toFixed(1).replace('.', ',')}%</span>
                              <span className="text-slate-400 text-[10px]">({cand.votesCount})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Candidate Scoring Panel & Progress Bars */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Kandidat & Perolehan Suara</h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">Persentase dan total rekapitulasi perolehan suara sah</p>
                  </div>

                  {!isMpkType ? (
                    // Regular Category: OSIS Chairman
                    (() => {
                      const activeCandidates = candidatesMap[selectedCatId] || [];
                      const activeVotes = votes.filter(v => v.category_id === selectedCatId);
                      const totalActiveVotes = activeVotes.length;

                      const cScores = activeCandidates.map((c, index) => {
                        const score = activeVotes.filter(v => v.candidate_id === c.id).length;
                        const percentageStr = totalActiveVotes > 0 ? ((score / totalActiveVotes) * 100).toFixed(1) : '0.0';
                        return {
                          ...c,
                          votesCount: score,
                          percentage: Number(percentageStr),
                          color: CHART_COLORS[index % CHART_COLORS.length]
                        };
                      }).sort((a, b) => b.votesCount - a.votesCount);

                      if (cScores.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2 animate-bounce" />
                            <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Kandidat</p>
                            <p className="text-[11px] text-slate-400 mt-1">Belum ada kandidat dikonfigurasi untuk kategori ini.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {cScores.map((cand, index) => {
                            const isWinner = index === 0 && cand.votesCount > 0;
                            const rankBadgeColor = index === 0 
                              ? 'bg-amber-500 text-white shadow-xs' 
                              : index === 1 
                                ? 'bg-slate-700 text-white' 
                                : index === 2
                                  ? 'bg-amber-700 text-white'
                                  : 'bg-slate-200 text-slate-700';

                            return (
                              <div 
                                key={cand.id} 
                                className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 relative ${
                                  isWinner 
                                    ? 'border-blue-200 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 shadow-xs ring-1 ring-blue-100' 
                                    : 'border-slate-200/80 bg-white hover:border-slate-300'
                                }`}
                              >
                                {/* Top Badge for Winner / Leader */}
                                {isWinner && (
                                  <div className="flex items-center gap-1.5 mb-3.5 text-xs font-black text-blue-700">
                                    <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                                    <span>PEROLEHAN SUARA TERTINGGI</span>
                                  </div>
                                )}

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  {/* Left: Identity (Number + Photo + Names) */}
                                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                    {/* Candidate Photo & Rank Badge */}
                                    <div className="relative shrink-0">
                                      {cand.photo_url ? (
                                        <img 
                                          src={cand.photo_url} 
                                          alt={cand.chairman} 
                                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 shadow-xs"
                                          onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                                        />
                                      ) : (
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-xs">
                                          <Vote className="w-6 h-6 text-slate-400" />
                                        </div>
                                      )}
                                      <span className={`absolute -top-1.5 -left-1.5 w-6 h-6 rounded-lg flex items-center justify-center font-mono font-black text-[11px] shadow-sm ${rankBadgeColor}`}>
                                        {index + 1}
                                      </span>
                                    </div>

                                    {/* Name & Details */}
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                                          PASLON {String(cand.number).padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                          No. {cand.number}
                                        </span>
                                      </div>
                                      <h4 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight leading-snug truncate">
                                        {cand.chairman}
                                      </h4>
                                      {cand.vice ? (
                                        <p className="text-xs text-slate-500 font-medium truncate">
                                          Wakil: <span className="text-slate-700 font-semibold">{cand.vice}</span>
                                        </p>
                                      ) : (cand.candidate_class || cand.class_name) ? (
                                        <p className="text-xs text-slate-500 font-medium">
                                          Kelas: <span className="text-slate-700 font-semibold">{cand.candidate_class || cand.class_name}</span>
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Right: PRIMARY PERCENTAGE HIGHLIGHT & Secondary Votes Count */}
                                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                    <div className="text-left sm:text-right">
                                      <div className="flex items-baseline gap-0.5 sm:justify-end">
                                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none font-sans">
                                          {cand.percentage.toFixed(1).replace('.', ',')}
                                        </span>
                                        <span className="text-xl sm:text-2xl font-extrabold text-blue-600 tracking-tight leading-none">%</span>
                                      </div>
                                    </div>
                                    <div className="text-right mt-1 sm:mt-1.5">
                                      <span className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-1 sm:justify-end">
                                        <span className="font-bold text-slate-700">{cand.votesCount.toLocaleString('id-ID')}</span> suara
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Modern Progress Bar */}
                                <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden mt-4">
                                  <div 
                                    className="h-full rounded-full transition-all duration-1000 ease-out shadow-xs"
                                    style={{ width: `${cand.percentage}%`, backgroundColor: cand.color || '#2563EB' }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    // MPK Category: Grouped by class
                    (() => {
                      if (!selectedDapilId) {
                        return (
                          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                            <MapPin className="w-8 h-8 mx-auto text-blue-500 mb-2 animate-pulse" />
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Dapil Belum Ditentukan</p>
                          </div>
                        );
                      }

                      const allCandidatesInCategory = candidatesMap[selectedCatId] || [];
                      const dapilCandidates = allCandidatesInCategory.filter(cand => cand.dapil_id === selectedDapilId);
                      
                      if (dapilCandidates.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                            <p className="text-xs font-bold uppercase tracking-wider">Tidak Ada Kandidat di Dapil Ini</p>
                          </div>
                        );
                      }

                      const grouped: Record<string, Candidate[]> = {};
                      dapilCandidates.forEach(cand => {
                        const cls = cand.class_name || cand.candidate_class || 'Lainnya';
                        if (!grouped[cls]) grouped[cls] = [];
                        grouped[cls].push(cand);
                      });

                      const classesWithCands = Object.keys(grouped).sort();
                      const activeCategoryVotes = votes.filter(v => v.category_id === selectedCatId);

                      return (
                        <div className="space-y-10">
                          {classesWithCands.map(clsName => {
                            const clsCandidates = grouped[clsName];
                            const clsCandIds = clsCandidates.map(c => c.id);
                            const classVotesCount = activeCategoryVotes.filter(v => clsCandIds.includes(v.candidate_id)).length;

                            const scoredClsCandidates = clsCandidates.map(cand => {
                              const cVoteCount = activeCategoryVotes.filter(v => v.candidate_id === cand.id).length;
                              const pct = classVotesCount > 0 ? ((cVoteCount / classVotesCount) * 100).toFixed(1) : '0.0';
                              return {
                                ...cand,
                                votesCount: cVoteCount,
                                percentage: Number(pct)
                              };
                            }).sort((a, b) => b.votesCount - a.votesCount);

                            return (
                              <div key={clsName} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                  <span className="w-2 h-4 bg-blue-600 rounded"></span>
                                  <span className="text-sm font-bold text-slate-700">Perwakilan Kelas {clsName}</span>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full ml-auto">
                                    {classVotesCount} Suara Kelas
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {scoredClsCandidates.map((cand, index) => {
                                    const isWinner = index === 0 && cand.votesCount > 0;
                                    return (
                                      <div 
                                        key={cand.id} 
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                                          isWinner 
                                            ? 'border-emerald-200 bg-emerald-50/20 shadow-xs' 
                                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                                        }`}
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                          <div className="flex items-center gap-3 min-w-0">
                                            {/* Candidate Photo & Number */}
                                            <div className="relative shrink-0">
                                              {cand.photo_url ? (
                                                <img 
                                                  src={cand.photo_url} 
                                                  alt={cand.chairman} 
                                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs"
                                                  onError={(e) => { (e.currentTarget.style.display = 'none'); }}
                                                />
                                              ) : (
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                                  <Vote className="w-5 h-5 text-slate-400" />
                                                </div>
                                              )}
                                              <span className={`absolute -top-1 -left-1 w-5 h-5 rounded-md flex items-center justify-center font-mono font-black text-[9px] ${
                                                isWinner ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                                              }`}>
                                                {index + 1}
                                              </span>
                                            </div>

                                            <div className="min-w-0 space-y-0.5">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase font-mono">
                                                  KANDIDAT {String(cand.number).padStart(2, '0')}
                                                </span>
                                                {isWinner && (
                                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                                    Teratas
                                                  </span>
                                                )}
                                              </div>
                                              <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug truncate">
                                                {cand.chairman}
                                              </h4>
                                              {cand.vice && (
                                                <p className="text-xs text-slate-500">Wakil: {cand.vice}</p>
                                              )}
                                            </div>
                                          </div>

                                          {/* PRIMARY PERCENTAGE HIGHLIGHT & Secondary Votes Count */}
                                          <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <div className="text-left sm:text-right">
                                              <div className="flex items-baseline gap-0.5 sm:justify-end">
                                                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none font-sans">
                                                  {cand.percentage.toFixed(1).replace('.', ',')}
                                                </span>
                                                <span className="text-lg sm:text-xl font-extrabold text-emerald-600 tracking-tight leading-none">%</span>
                                              </div>
                                            </div>
                                            <div className="text-right mt-0.5 sm:mt-1">
                                              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 sm:justify-end">
                                                <span className="font-bold text-slate-700">{cand.votesCount.toLocaleString('id-ID')}</span> suara
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden mt-3">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                              isWinner ? 'bg-emerald-500' : 'bg-blue-600'
                                            }`}
                                            style={{ width: `${cand.percentage}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>

              </div>

              {/* Right Column (Partisipasi Pemilu & Per Kelas) */}
              <div className="space-y-6 self-start">
                
                {/* Participation Rate Card */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
                  <div className="space-y-1.5 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Tingkat Partisipasi</span>
                    <h2 className="text-2xl font-black text-slate-800">{participationRate}%</h2>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                      <div className="bg-blue-600 h-full rounded-full transition-all duration-750" style={{ width: `${participationRate}%` }}></div>
                    </div>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 self-start">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* Kehadiran Kelas (Partisipasi) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800">Partisipasi Per Kelas</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Persentase kehadiran pemilih per kelas</p>
                  </div>

                  <div className="overflow-y-auto max-h-[260px] pr-2 space-y-4">
                    {!stats || stats.classParticipation.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400">Belum ada data terekam.</p>
                    ) : (
                      stats.classParticipation.map((item) => {
                        const pct = Math.round(item.percentage);
                        return (
                          <div key={item.className} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-700">{item.className}</span>
                              <span className="font-mono text-slate-500">
                                {item.completedCount}/{item.totalCount} <span className="font-bold text-slate-700">({pct}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-700 ${
                                  pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-blue-600' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-150">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Legend Partisipasi</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1 font-semibold">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Sangat Baik (&gt;=90%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>Baik (&gt;=70%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Cukup (&gt;=50%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Kurang (&lt;50%)</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
