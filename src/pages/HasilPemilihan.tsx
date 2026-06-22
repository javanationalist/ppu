import { useEffect, useState } from 'react';
import { 
  BarChart, RefreshCw, Users, ShieldCheck, 
  Award, Clock, AlertTriangle, MapPin, ArrowLeft, ShieldAlert
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserAccessSettings } from '../lib/userAccessService';
import { getAllProfiles } from '../lib/adminService';
import { getCategories, getCandidates, getAllVotes, getDapils, getElectionStatistics, ElectionStatistics } from '../lib/votingService';
import { Profile, Category, Vote, Candidate, Dapil } from '../types';

export default function HasilPemilihan() {
  const { profile: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [dapils, setDapils] = useState<Dapil[]>([]);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, Candidate[]>>({});
  const [stats, setStats] = useState<ElectionStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lihatHasilEnabled, setLihatHasilEnabled] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  
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

  if (loading || checkingAccess) {
    return (
      <div className="min-h-screen bg-ppu-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-ppu-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-bold text-sm animate-pulse">Menghitung perolehan suara...</p>
        </div>
      </div>
    );
  }

  // Check custom visibility block
  if (!lihatHasilEnabled && currentUser?.role !== 'admin') {
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

  const activeCategory = categories.find(c => c.id === selectedCatId);
  const isMpkType = activeCategory?.type === 'mpk_smaba';

  return (
    <div className="min-h-screen bg-ppu-surface py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8 select-none">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-ppu-border shadow-md sm:px-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 hover:text-ppu-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-ppu-blue hover:bg-ppu-blue-dark text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl border border-ppu-border shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart className="w-6 h-6 text-ppu-blue" />
              <span>Hasil Perolehan Suara Utama</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Data rekapitulasi real-time suara masuk pemilu OSIS/MPK. Penyegaran otomatis aktif.
            </p>
          </div>
        </div>

        {/* Metrics Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-ppu-blue uppercase tracking-widest block font-mono">Suara Selesai</span>
              <h2 className="text-4xl font-black text-slate-800 mt-2">{votedVoters}</h2>
              <p className="text-xs text-slate-500 mt-1">Siswa telah meluangkan suaranya</p>
            </div>
            <div className="p-3 bg-ppu-blue-light text-ppu-blue rounded-xl">
              <Award className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-ppu-blue uppercase tracking-widest block font-mono">Tingkat Partisipasi</span>
              <h2 className="text-4xl font-black text-slate-800 mt-2">{participationRate}%</h2>
              <div className="w-32 bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-ppu-blue h-full rounded-full animate-pulse" style={{ width: `${participationRate}%` }}></div>
              </div>
            </div>
            <div className="p-3 bg-ppu-blue-light text-ppu-blue rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-ppu-blue uppercase tracking-widest block font-mono">DPT Terdaftar</span>
              <h2 className="text-4xl font-black text-slate-800 mt-2">{totalVoters}</h2>
              <p className="text-xs text-slate-500 mt-1">Target potensial DPT kesiswaan</p>
            </div>
            <div className="p-3 bg-ppu-blue-light text-ppu-blue rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 1. Category Dropdown Selector at Top */}
        <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-ppu-blue block font-mono">PEMILIHAN AKTIF</span>
            <h3 className="text-base font-extrabold text-[#0B1220]">Pilih Kategori Pemilu</h3>
          </div>
          <div className="relative">
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              className="w-full sm:w-80 bg-[#F5F7FA] border-2 border-[#DCE3EA] hover:border-ppu-blue focus:border-ppu-blue focus:ring-4 focus:ring-ppu-blue/10 text-slate-800 rounded-xl px-4 py-3 font-extrabold text-sm outline-none transition-all cursor-pointer shadow-sm appearance-none pr-10"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon || '🗳️'} {cat.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 3. Selective MPK State: Choose Dapil Dropdown if type === 'mpk_smaba' */}
        {isMpkType && (
          <div className="bg-gradient-to-r from-ppu-blue/5 to-white border border-ppu-border p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-in">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-ppu-blue block font-mono">REKAPITULASI DAERAH PEMILIHAN</span>
              <h3 className="text-base font-extrabold text-[#0B1220]">Pilih Daerah Pemilihan (Dapil)</h3>
            </div>
            <div className="relative">
              <select
                value={selectedDapilId}
                onChange={(e) => setSelectedDapilId(e.target.value)}
                className="w-full sm:w-80 bg-white border-2 border-[#DCE3EA] hover:border-ppu-blue focus:border-ppu-blue focus:ring-4 focus:ring-ppu-blue/10 text-slate-900 rounded-xl px-4 py-3 font-extrabold text-sm outline-none transition-all cursor-pointer shadow-sm appearance-none pr-10"
              >
                <option value="">-- Pilih Dapil --</option>
                {dapils.filter(d => d.category_id === selectedCatId).map(d => (
                  <option key={d.id} value={d.id}>
                    📍 {d.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 border-l border-ppu-border ml-1">
                <MapPin className="w-4 h-4 text-ppu-blue" />
              </div>
            </div>
          </div>
        )}

        {/* Main Results Board Section Layout Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Scoring Card Panel */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-ppu-border shadow-sm lg:col-span-2 space-y-6">
            <div className="border-b border-[#F5F7FA] pb-4">
              <h3 className="text-lg font-extrabold text-slate-800">
                Status Perolehan Hasil Suara Terkini
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {isMpkType 
                  ? `Daerah Pemilihan: ${dapils.find(d => d.id === selectedDapilId)?.name || 'Sedang memuat...'}`
                  : `Total kartu suara masuk kategori: ${votes.filter(v => v.category_id === selectedCatId).length} suara`}
              </p>
            </div>

            {/* Conditional MPK vs Regular render */}
            {!isMpkType ? (
              // 2. REGULAR RENDERING WITH ABSOLUTE PERCENTAGES
              (() => {
                const activeCandidates = candidatesMap[selectedCatId] || [];
                const activeVotes = votes.filter(v => v.category_id === selectedCatId);
                const totalActiveVotes = activeVotes.length;

                const cScores = activeCandidates.map(c => {
                  const score = activeVotes.filter(v => v.candidate_id === c.id).length;
                  const percentageStr = totalActiveVotes > 0 ? ((score / totalActiveVotes) * 100).toFixed(1) : '0.0';
                  return {
                    ...c,
                    votesCount: score,
                    percentage: Number(percentageStr)
                  };
                }).sort((a, b) => b.votesCount - a.votesCount);

                if (cScores.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 border border-dashed border-[#DCE3EA] rounded-2xl">
                      <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-2 animate-bounce" />
                      <p className="text-xs font-bold uppercase tracking-wider">Belum Ada Kandidat</p>
                      <p className="text-[11px] text-slate-400 mt-1">Sistem belum mendeteksi konfigurasi kandidat untuk kategori ini.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {cScores.map((cand, index) => {
                      const placeColors = [
                        'bg-amber-100 text-amber-800 border-amber-200',
                        'bg-slate-100 text-slate-800 border-slate-200',
                        'bg-orange-100 text-orange-850 border-orange-200'
                      ];
                      const fallbackColor = 'bg-slate-50 text-slate-600 border-slate-100';

                      return (
                        <div key={cand.id} className="space-y-3 p-4 rounded-xl border border-ppu-border bg-[#F5F7FA]/30 hover:bg-[#F5F7FA]/75 transition-colors">
                          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono font-bold text-xs ${index < 3 ? placeColors[index] : fallbackColor}`}>
                                {index + 1}
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] font-mono font-black block">
                                  NO URUT {String(cand.number).padStart(2, '0')}
                                </span>
                                <span className="font-extrabold text-[#0B1220]">{cand.chairman}</span>
                                {cand.vice && <span className="text-xs text-slate-500 font-medium"> & {cand.vice}</span>}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-lg font-black text-[#0B1220] block">{cand.votesCount} Suara</span>
                              <span className="text-xs font-black text-ppu-blue font-mono bg-ppu-blue-light px-2.5 py-0.5 rounded-full">{cand.percentage}%</span>
                            </div>
                          </div>

                          {/* Percentage Progress Bar */}
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                            <div 
                              className="bg-ppu-blue h-full rounded-full transition-all duration-1000 ease-out shadow-inner"
                              style={{ width: `${cand.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              // 4. MPK RENDERING GROUPED BY CLASS AND SELECTED DAPIL
              (() => {
                if (!selectedDapilId) {
                  return (
                    <div className="text-center py-16 text-slate-400 border border-dashed border-ppu-border rounded-2xl bg-[#F5F7FA]/20">
                      <MapPin className="w-10 h-10 mx-auto text-ppu-blue mb-2 animate-pulse" />
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Dapil Belum Ditentukan</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">Silakan tentukan Daerah Pemilihan (Dapil) pada dropdown di atas untuk memulai kalkulasi.</p>
                    </div>
                  );
                }

                const allCandidatesInCategory = candidatesMap[selectedCatId] || [];
                const dapilCandidates = allCandidatesInCategory.filter(cand => cand.dapil_id === selectedDapilId);
                
                if (dapilCandidates.length === 0) {
                  return (
                    <div className="text-center py-16 text-slate-400 border border-dashed border-ppu-border rounded-2xl">
                      <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-wider">Kandidat Dapil Kosong</p>
                      <p className="text-[11px] text-slate-400 mt-1">Tidak ditemukan konfigurasi perwakilan MPK terdaftar di Dapil ini.</p>
                    </div>
                  );
                }

                // Group candidates by class_name
                const grouped: Record<string, Candidate[]> = {};
                dapilCandidates.forEach(cand => {
                  const cls = cand.class_name || cand.candidate_class || 'Lainnya';
                  if (!grouped[cls]) {
                    grouped[cls] = [];
                  }
                  grouped[cls].push(cand);
                });

                const classesWithCands = Object.keys(grouped).sort();

                // Fetch votes for this category
                const activeCategoryVotes = votes.filter(v => v.category_id === selectedCatId);

                return (
                  <div className="space-y-12">
                    {classesWithCands.map(clsName => {
                      const clsCandidates = grouped[clsName];
                      const clsCandIds = clsCandidates.map(c => c.id);
                      
                      // 5. Calculate class total votes
                      const classVotesCount = activeCategoryVotes.filter(v => clsCandIds.includes(v.candidate_id)).length;

                      // Compute individual candidate stats and sort
                      const scoredClsCandidates = clsCandidates.map(cand => {
                        const cVoteCount = activeCategoryVotes.filter(v => v.candidate_id === cand.id).length;
                        // 6. Percentage calculated per class, not per Dapil
                        const pct = classVotesCount > 0 ? ((cVoteCount / classVotesCount) * 100).toFixed(2) : '0.00';
                        return {
                          ...cand,
                          votesCount: cVoteCount,
                          percentage: Number(pct)
                        };
                      }).sort((a, b) => b.votesCount - a.votesCount); // Sorted by highest vote

                      return (
                        <div key={clsName} className="space-y-4">
                          {/* Class title section */}
                          <div className="flex items-center gap-2 border-b border-ppu-border pb-2">
                            <span className="w-2.5 h-5 bg-ppu-blue rounded"></span>
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Perwakilan Kelas {clsName}</span>
                            <span className="text-[10px] font-bold text-slate-500 bg-[#F5F7FA] border border-ppu-border px-2.5 py-0.5 rounded-full ml-auto">
                              DPT Kelas Memilih: {classVotesCount} suara
                            </span>
                          </div>

                          {/* Candidates score lists inside the class */}
                          <div className="grid grid-cols-1 gap-4">
                            {scoredClsCandidates.map((cand, index) => {
                              const isWinner = index === 0 && cand.votesCount > 0;
                              return (
                                <div key={cand.id} className={`p-4 rounded-xl border transition-all ${
                                  isWinner 
                                    ? 'border-emerald-100 bg-emerald-50/20' 
                                    : 'border-ppu-border bg-[#F5F7FA]/20'
                                }`}>
                                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-5 h-5 font-mono text-[10px] font-bold rounded-lg flex items-center justify-center ${
                                        isWinner ? 'bg-emerald-100 text-emerald-800' : 'bg-[#DCE3EA] text-slate-650'
                                      }`}>
                                        {index + 1}
                                      </div>
                                      <div>
                                        <span className="block text-[9px] font-black text-slate-400 font-mono">
                                          KANDIDAT {String(cand.number).padStart(2, '0')}
                                        </span>
                                        <span className="font-extrabold text-slate-850 text-sm leading-tight block">{cand.chairman}</span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="text-sm font-black text-slate-900 block leading-tight">{cand.votesCount} Suara</span>
                                      <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-lg inline-block mt-0.5 ${
                                        isWinner ? 'bg-emerald-100 text-emerald-700' : 'bg-ppu-blue-light text-ppu-blue'
                                      }`}>
                                        {cand.percentage}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress Indicator */}
                                  <div className="w-full bg-[#F5F7FA] h-2.5 rounded-full overflow-hidden mt-3">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-1000 ${
                                        isWinner ? 'bg-emerald-500' : 'bg-ppu-blue/80'
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

          {/* Right Split Column Panel: Class Attendance & Contribution metrics */}
          <div className="space-y-6 self-start">
            {/* 1. Kehadiran Kelas (Partisipasi) */}
            <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-850">Kehadiran Kelas (Partisipasi)</h3>
                <p className="text-xs text-slate-400">Persentase tingkat partisipasi kehadiran per kelas</p>
              </div>

              <div className="overflow-y-auto max-h-[300px] pr-2 space-y-4">
                {!stats || stats.classParticipation.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Belum ada pemilih tercatat.</p>
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
                        <div className="w-full bg-[#F5F7FA] h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-ppu-blue' : pct >= 50 ? 'bg-amber-500' : 'bg-ppu-red'
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="bg-[#F5F7FA] p-4 rounded-xl space-y-2 border border-ppu-border">
                <h4 className="text-xs font-bold text-slate-850 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-ppu-blue" />
                  <span>Indikator Warna Partisipasi</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    <span>Luar Biasa (&gt;=90%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-ppu-blue inline-block"></span>
                    <span>Optimal (&gt;=70%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    <span>Sedang (&gt;=50%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-ppu-red inline-block"></span>
                    <span>Kritis (&lt;50%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Tingkat Kontribusi Suara Berdasarkan Kelas */}
            <div className="bg-white p-6 rounded-2xl border border-ppu-border shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-slate-850">Tingkat Kontribusi Suara Berdasarkan Kelas</h3>
                <p className="text-xs text-slate-400">Porsi sumbangan suara selesai masing-masing kelas</p>
              </div>

              <div className="overflow-y-auto max-h-[300px] pr-2 space-y-4">
                {!stats || stats.classContribution.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Belum ada pemilih selesai tercatat.</p>
                ) : (
                  stats.classContribution.map((item) => {
                    const pct = Math.round(item.percentage);
                    return (
                      <div key={item.className} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{item.className}</span>
                          <span className="font-mono text-slate-500">
                            {item.completedCount} Suara <span className="font-bold text-ppu-blue">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#F5F7FA] h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-ppu-blue rounded-full transition-all duration-700"
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
    </div>
  );
}
