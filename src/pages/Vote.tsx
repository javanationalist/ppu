import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import VotingFlow from '../components/voting/VotingFlow';
import { getVoteMode, VoteMode } from '../lib/voteModeService';
import { Lock, ShieldAlert } from 'lucide-react';

export default function VotePage() {
  const [searchParams] = useSearchParams();
  const [voteMode, setVoteMode] = useState<VoteMode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMode = async () => {
      try {
        const mode = await getVoteMode();
        setVoteMode(mode);
      } catch (err) {
        console.error('Failed to get vote mode:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMode();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f14] text-[#e8ecf5] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-semibold">Memuat sistem bilik suara...</p>
        </div>
      </div>
    );
  }

  // If booth mode is active and we are accessing /vote, block it!
  if (voteMode === 'booth') {
    return (
      <div className="min-h-screen bg-[#0d0f14] text-[#e8ecf5] flex flex-col items-center justify-center p-6 text-center select-none font-sans relative">
        <div className="relative mb-8 flex items-center justify-center">
          <div className="absolute w-28 h-28 bg-rose-500/10 rounded-full blur-xl"></div>
          <div className="absolute w-24 h-24 border border-rose-500/20 rounded-full border-dashed"></div>
          <div className="relative w-20 h-20 bg-[#151821] border border-rose-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-950/50">
            <Lock className="w-9 h-9 text-rose-500" />
            <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-1 border border-[#0d0f14] shadow-md">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black tracking-widest uppercase mb-4">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
          <span>Bilik Suara Terpusat</span>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-2 uppercase">Akses Ditutup</h1>
        <p className="text-slate-400 font-medium text-xs sm:text-sm mb-8 leading-relaxed max-w-sm">
          Bilik Suara Terpusat Aktif. Pemilihan hanya dapat dilakukan melalui terminal fisik Bilik Suara.
        </p>
      </div>
    );
  }

  // Regular mode: Render VotingFlow with "regular" mode and handle potential card_id query param
  const cardId = searchParams.get('card_id');

  return (
    <VotingFlow 
      voteMode="regular" 
      initialVoterCardId={cardId} 
    />
  );
}
