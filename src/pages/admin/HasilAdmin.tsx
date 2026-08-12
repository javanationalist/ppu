import { useEffect, useState } from 'react';
import { 
  BarChart, RefreshCw, Users, ShieldCheck, 
  Award, Clock, AlertTriangle, MapPin, ArrowLeft
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getAllProfiles } from '../../lib/adminService';
import { getCategories, getCandidates, getAllVotes, getDapils, getElectionStatistics, ElectionStatistics } from '../../lib/votingService';
import { Profile, Category, Vote, Candidate, Dapil } from '../../types';
import { M3ExpressiveLoadingIndicator } from '../../components/ui/M3ExpressiveLoadingIndicator';

const COLORS = [
  '#4f46e5', // indigo-600
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#f43f5e', // rose-500
  '#8b5cf6', // violet-500
];

export default function HasilAdmin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [stats, setStats] = useState<ElectionStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedDapilId, setSelectedDapilId] = useState('');

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
      console.error('Failed to load hasil voting', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset selected Dapil when category changes
  useEffect(() => {
    if (selectedCatId) {
      const activeCat = categories.find(c => c.id === selectedCatId);
      if (activeCat?.type === 'mpk_smaba') {
        const catDapils = dapils.filter(d => d.category_id === selectedCatId);
        if (selectedDapilId && !catDapils.some(d => d.id === selectedDapilId)) {
          setSelectedDapilId('');
        }
      } else {
        setSelectedDapilId('');
      }
    } else {
      setSelectedDapilId('');
    }
  }, [selectedCatId, categories, dapils]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <M3ExpressiveLoadingIndicator size="large" className="text-indigo-600 dark:text-sky-400" />
          <p className="text-slate-500 font-medium text-sm animate-pulse">Menghitung perolehan suara...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const voters = profiles.filter(p => p.role === 'user' && !p.is_deleted);
  const totalVoters = stats ? stats.totalDpt : voters.length;
  const votedVoters = stats ? stats.completedVoters : voters.filter(p => p.voting_status === 'sudah').length;
  const participationRate = stats ? stats.participationRate.toFixed(1) : (totalVoters > 0 ? ((votedVoters / totalVoters) * 100).toFixed(1) : '0');

  const activeCategory = categories.find(c => c.id === selectedCatId);
  const isMpkType = activeCategory?.type === 'mpk_smaba';

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 select-none animate-fade-in animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-[#f5f5f5] tracking-tight flex items-center gap-2">
            <BarChart className="w-6 h-6 text-indigo-600 dark:text-indigo-450" />
            <span>Hasil Perolehan Suara Utama</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Data rekapitulasi real-time suara masuk pemilu OSIS/MPK. Penyegaran otomatis aktif.
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {refreshing ? (
            <M3ExpressiveLoadingIndicator size="small" className="text-white" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* STEP 1: CATEGORY SELECTION (HALAMAN PERTAMA) */}
      {!selectedCatId && (
        <div className="space-y-8 animate-fade-in animate-in fade-in duration-300">
          {/* Metrics Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block font-mono">Suara Selesai</span>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-2">{votedVoters}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Siswa telah meluangkan suaranya</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block font-mono">Tingkat Partisipasi</span>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-2">{participationRate}%</h2>
                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${participationRate}%` }}></div>
                </div>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest block font-mono">DPT Terdaftar</span>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white mt-2">{totalVoters}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Target potensial DPT kesiswaan</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Main Content Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Choose Category Grid */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pilih Kategori Pemilihan</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Silakan pilih kategori di bawah untuk melihat rekapitulasi real-time perolehan suara.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {categories.map((cat) => {
                  const catVotes = votes.filter(v => v.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCatId(cat.id)}
                      className="group flex flex-col p-6 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl text-left shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer w-full"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-2xl p-3 bg-slate-50 dark:bg-[#2a2a2a] rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                          {cat.icon || '🗳️'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full font-mono">
                          {cat.type === 'mpk_smaba' ? 'MPK SMABA' : 'OSIS / REGULER'}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-800 dark:text-[#f5f5f5] mt-5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {cat.name}
                      </h3>
                      
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <span>{catVotes} suara masuk</span>
                        <span>•</span>
                        <span className="text-slate-500 font-medium">Klik untuk lihat hasil lengkap</span>
                      </p>

                      <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 gap-1 mt-auto">
                        <span>Lihat Hasil</span>
                        <span className="transition-transform group-hover:translate-x-1 duration-200">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Global Attendance & Contribution */}
            <div className="space-y-6">
              {/* 1. Kehadiran Kelas (Partisipasi) */}
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-[#f5f5f5]">Kehadiran Kelas</h3>
                  <p className="text-xs text-slate-400">Tingkat partisipasi kehadiran per kelas</p>
                </div>

                <div className="overflow-y-auto max-h-[250px] pr-2 space-y-4">
                  {!stats || stats.classParticipation.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400">Belum ada pemilih tercatat.</p>
                  ) : (
                    stats.classParticipation.map((item) => {
                      const pct = Math.round(item.percentage);
                      return (
                        <div key={item.className} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-350">{item.className}</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {item.completedCount}/{item.totalCount} <span className="font-bold text-slate-700 dark:text-slate-350">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-700 ${
                                pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-indigo-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-[#252525]/40 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-[#e0e0e0] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Indikator Partisipasi</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 font-sans">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>Luar Biasa (&gt;=90%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                      <span>Optimal (&gt;=70%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      <span>Sedang (&gt;=50%)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      <span>Kritis (&lt;50%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Tingkat Kontribusi Suara */}
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-[#f5f5f5]">Porsi Kontribusi Suara</h3>
                  <p className="text-xs text-slate-400">Porsi sumbangan suara selesai masing-masing kelas</p>
                </div>

                <div className="overflow-y-auto max-h-[200px] pr-2 space-y-4">
                  {!stats || stats.classContribution.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400">Belum ada pemilih selesai tercatat.</p>
                  ) : (
                    stats.classContribution.map((item) => {
                      const pct = Math.round(item.percentage);
                      return (
                        <div key={item.className} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-350">{item.className}</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">
                              {item.completedCount} Suara <span className="font-bold text-indigo-600 dark:text-indigo-400">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-700"
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: DAPIL SELECTION (ONLY FOR MPK SMABA AND DAPIL NOT SELECTED YET) */}
      {selectedCatId && isMpkType && !selectedDapilId && (
        <div className="space-y-8 animate-fade-in animate-in fade-in duration-300">
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedCatId('')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Kategori</span>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-mono bg-slate-100 dark:bg-slate-850 px-3 py-1 rounded-full">
              Kategori: {activeCategory?.name}
            </span>
          </div>

          {/* Title */}
          <div className="text-center py-4">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Pilih Daerah Pemilihan (Dapil)
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md mx-auto">
              Silakan pilih salah satu Dapil terdaftar di bawah ini untuk melihat detail perolehan suaranya.
            </p>
          </div>

          {/* Dapil Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {dapils.filter(d => d.category_id === selectedCatId).map((d) => {
              const dapilCandList = (candidatesMap[selectedCatId] || []).filter(c => c.dapil_id === d.id);
              const dapilVotesCount = votes.filter(v => dapilCandList.some(c => c.id === v.candidate_id)).length;

              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDapilId(d.id)}
                  className="group flex flex-col p-6 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl text-left shadow-xs hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer w-full"
                >
                  <div className="flex items-center justify-between w-full mb-4">
                    <span className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                      {dapilCandList.length} Kandidat
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {d.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1">
                    {dapilVotesCount} suara selesai memilih
                  </p>

                  <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 gap-1 mt-auto">
                    <span>Lihat Hasil Dapil</span>
                    <span className="transition-transform group-hover:translate-x-1 duration-200">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: RESULTS SCREEN (DONUT CHART & CANDIDATE LISTS) */}
      {selectedCatId && (!isMpkType || selectedDapilId) && (
        <div className="space-y-8 animate-fade-in animate-in fade-in duration-300">
          {/* Navigation Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                if (isMpkType) {
                  setSelectedDapilId('');
                } else {
                  setSelectedCatId('');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>

            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3.5 py-1 rounded-full font-mono">
              {isMpkType 
                ? `${activeCategory?.name} • ${dapils.find(d => d.id === selectedDapilId)?.name}` 
                : activeCategory?.name}
            </span>
          </div>

          {/* Calculations scope */}
          {(() => {
            const activeCandidates = candidatesMap[selectedCatId] || [];
            const activeCategoryVotes = votes.filter(v => v.category_id === selectedCatId);

            let filteredCandidates = activeCandidates;
            let scopeVotes = activeCategoryVotes;
            let totalScopeVotes = 0;
            let totalScopeVoters = totalVoters;
            let scopeParticipation = participationRate;

            if (isMpkType) {
              filteredCandidates = activeCandidates.filter(c => c.dapil_id === selectedDapilId);
              scopeVotes = activeCategoryVotes.filter(v => filteredCandidates.some(c => c.id === v.candidate_id));
              totalScopeVotes = scopeVotes.length;

              const activeDapil = dapils.find(d => d.id === selectedDapilId);
              const eligibleClasses = activeDapil?.eligible_classes || [];
              totalScopeVoters = voters.filter(p => eligibleClasses.includes(p.class)).length;
              scopeParticipation = totalScopeVoters > 0 ? ((totalScopeVotes / totalScopeVoters) * 100).toFixed(1) : '0';
            } else {
              totalScopeVotes = activeCategoryVotes.length;
              totalScopeVoters = totalVoters;
              scopeParticipation = participationRate;
            }

            // Empty State Validation
            if (totalScopeVotes === 0) {
              return (
                <div className="text-center py-20 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl mx-auto shadow-xs">
                  <AlertTriangle className="w-12 h-12 mx-auto text-amber-500 mb-3 animate-pulse" />
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-[#f5f5f5]">Belum ada suara yang masuk</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Kalkulasi perolehan suara akan muncul di sini secara otomatis setelah pemilih selesai menyalurkan suaranya.
                  </p>
                </div>
              );
            }

            // Format Chart Data
            const chartData = filteredCandidates.map(cand => {
              const votesCount = scopeVotes.filter(v => v.candidate_id === cand.id).length;
              const percentageNum = totalScopeVotes > 0 ? ((votesCount / totalScopeVotes) * 100) : 0;
              return {
                name: cand.chairman + (cand.vice ? ` & ${cand.vice}` : ` (${cand.class_name || cand.candidate_class || ''})`),
                value: votesCount,
                percentage: percentageNum.toFixed(1),
                cand,
              };
            }).sort((a, b) => b.value - a.value);

            return (
              <div className="space-y-8 animate-fade-in duration-300">
                {/* Visualizer and Statistics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left: Donut Chart Area */}
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between min-h-[420px]">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-800 dark:text-[#f5f5f5]">Visualisasi Persentase Suara</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Proporsi pembagian suara dari total {totalScopeVotes} kartu suara masuk</p>
                    </div>

                    {/* Donut rendering */}
                    <div className="relative w-full h-64 sm:h-80 flex items-center justify-center my-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="65%"
                            outerRadius="85%"
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} Suara`, 'Jumlah Suara']}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Total Suara</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white mt-0.5">{totalScopeVotes}</span>
                      </div>
                    </div>

                    {/* Custom Legend */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      {chartData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#252525]/30 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span>{entry.name}: <span className="font-bold">{entry.value}</span> ({entry.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Informational Stats Board */}
                  <div className="bg-white dark:bg-[#1a1a1a] p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-850 dark:text-[#f5f5f5]">Informasi Pemilihan</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Parameter rekapitulasi data aktif</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Suara Masuk</span>
                        <span className="text-sm font-black text-slate-850 dark:text-[#f5f5f5]">{totalScopeVotes} Suara</span>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pemilih</span>
                        <span className="text-sm font-black text-slate-850 dark:text-[#f5f5f5]">{totalScopeVoters} DPT</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Persentase Partisipasi</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-lg">{scopeParticipation}%</span>
                      </div>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                        <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full animate-pulse-slow" style={{ width: `${scopeParticipation}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-[#252525]/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-[#d0d0d0] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Sistem Real-Time</span>
                      </h4>
                      <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                        Data diperbarui otomatis setiap 30 detik. Silakan tekan tombol segarkan di atas untuk memperbarui data seketika.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom List of Candidates */}
                <div className="bg-white dark:bg-[#1a1a1a] p-6 sm:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-[#f5f5f5]">Daftar Perolehan Suara</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Kalkulasi perolehan suara setiap pasangan calon / perwakilan kelas</p>
                  </div>

                  {!isMpkType ? (
                    // Regular list
                    <div className="space-y-4">
                      {chartData.map((cand, index) => {
                        const placeColors = [
                          'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
                          'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
                          'bg-orange-100 text-orange-850 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900'
                        ];
                        const fallbackColor = 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-[#252525]/30 dark:text-slate-400 dark:border-slate-800';

                        return (
                          <div key={cand.cand.id} className="space-y-3 p-4 rounded-xl border border-slate-150/40 dark:border-slate-800 bg-slate-50/20 dark:bg-transparent hover:bg-slate-50/50 dark:hover:bg-[#252525]/20 transition-colors">
                            <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-xs ${index < 3 ? placeColors[index] : fallbackColor}`}>
                                  {index + 1}
                                </div>
                                <div>
                                  <span className="text-slate-400 dark:text-slate-500 text-[10px] font-mono font-black block">
                                    NO URUT {String(cand.cand.number).padStart(2, '0')}
                                  </span>
                                  <span className="font-extrabold text-slate-850 dark:text-white">{cand.cand.chairman}</span>
                                  {cand.cand.vice && <span className="text-xs text-slate-500 dark:text-slate-400 font-medium"> & {cand.cand.vice}</span>}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-lg font-black text-slate-900 dark:text-white block">{cand.value} Suara</span>
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-0.5 rounded-full">{cand.percentage}%</span>
                              </div>
                            </div>

                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out shadow-inner"
                                style={{ width: `${cand.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // MPK grouped by Class name
                    (() => {
                      const grouped: Record<string, Candidate[]> = {};
                      filteredCandidates.forEach(cand => {
                        const cls = cand.class_name || cand.candidate_class || 'Lainnya';
                        if (!grouped[cls]) {
                          grouped[cls] = [];
                        }
                        grouped[cls].push(cand);
                      });

                      const classesWithCands = Object.keys(grouped).sort();

                      return (
                        <div className="space-y-12 animate-fade-in">
                          {classesWithCands.map(clsName => {
                            const clsCandidates = grouped[clsName];
                            const clsCandIds = clsCandidates.map(c => c.id);
                            const classVotesCount = activeCategoryVotes.filter(v => clsCandIds.includes(v.candidate_id)).length;

                            const scoredClsCandidates = clsCandidates.map(cand => {
                              const cVoteCount = activeCategoryVotes.filter(v => v.candidate_id === cand.id).length;
                              const pct = classVotesCount > 0 ? ((cVoteCount / classVotesCount) * 100).toFixed(2) : '0.00';
                              return {
                                ...cand,
                                votesCount: cVoteCount,
                                percentage: pct,
                              };
                            }).sort((a, b) => b.votesCount - a.votesCount);

                            return (
                              <div key={clsName} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                  <span className="w-2.5 h-5 bg-indigo-600 dark:bg-indigo-500 rounded"></span>
                                  <span className="text-sm font-black text-slate-800 dark:text-[#e0e0e0] uppercase tracking-tight">Perwakilan Kelas {clsName}</span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 px-2.5 py-0.5 rounded-full ml-auto">
                                    DPT Kelas Memilih: {classVotesCount} suara
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  {scoredClsCandidates.map((cand, index) => {
                                    const isWinner = index === 0 && cand.votesCount > 0;
                                    return (
                                      <div key={cand.id} className={`p-4 rounded-xl border transition-all ${
                                        isWinner
                                          ? 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10'
                                          : 'border-slate-50 dark:border-slate-850 bg-slate-50/20 dark:bg-transparent'
                                      }`}>
                                        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                          <div className="flex items-center gap-2.5">
                                            <div className={`w-5 h-5 font-mono text-[10px] font-bold rounded-lg flex items-center justify-center ${
                                              isWinner ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-200 text-slate-650 dark:bg-slate-800 dark:text-slate-400'
                                            }`}>
                                              {index + 1}
                                            </div>
                                            <div>
                                              <span className="block text-[9px] font-black text-slate-400 dark:text-slate-500 font-mono">
                                                KANDIDAT {String(cand.number).padStart(2, '0')}
                                              </span>
                                              <span className="font-extrabold text-slate-800 dark:text-white text-sm leading-tight block">{cand.chairman}</span>
                                            </div>
                                          </div>

                                          <div className="text-right shrink-0">
                                            <span className="text-sm font-black text-slate-900 dark:text-white block leading-tight">{cand.votesCount} Suara</span>
                                            <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-lg inline-block mt-0.5 ${
                                              isWinner ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 dark:bg-[#252525]/30 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                              {cand.percentage}%
                                            </span>
                                          </div>
                                        </div>

                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
                                          <div
                                            className={`h-full rounded-full transition-all duration-1000 ${
                                              isWinner ? 'bg-emerald-500' : 'bg-indigo-600/80 dark:bg-indigo-500/80'
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
            );
          })()}
        </div>
      )}
    </div>
  );
}
