import React, { useState } from 'react';
import { Play, Vote, ShieldCheck, ArrowRight } from 'lucide-react';
import VotingFlow from '../components/voting/VotingFlow';

export default function FreeVotePage() {
  const [started, setStarted] = useState(false);

  const handleComplete = () => {
    setStarted(false);
  };

  const handleCancel = () => {
    setStarted(false);
  };

  if (started) {
    return (
      <VotingFlow
        voteMode="booth"
        isFreeVote={true}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] text-[#e8ecf5] flex flex-col font-sans select-none antialiased relative w-full items-center justify-center p-6">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md flex flex-col items-center text-center space-y-8 relative z-10">
        {/* Logo Section */}
        <div className="flex items-center justify-center p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 shadow-2xl shadow-indigo-950/50">
          <img
            src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp"
            alt="PPU Logo"
            className="w-20 h-20 object-contain"
          />
        </div>

        {/* Title Block */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black tracking-widest uppercase">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            <span>Bilik Suara Mandiri</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none">
            Mulai Pemilihan
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
            Gunakan hak suara Anda secara bijaksana. Voting dilakukan secara mandiri, rahasia, aman, dan tanpa dipungut biaya apa pun.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setStarted(true)}
          className="w-full max-w-xs flex items-center justify-center gap-3 px-8 py-4.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-indigo-950/50 hover:shadow-indigo-500/25 transition-all text-center cursor-pointer active:scale-95 duration-150 group"
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-200 fill-indigo-200 group-hover:scale-110 transition-transform" />
          <span>Mulai Voting</span>
          <ArrowRight className="w-4 h-4 text-indigo-200 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Info badges */}
        <div className="pt-6 border-t border-slate-800/60 w-full flex justify-center gap-6 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Anonymous & Aman</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Vote className="w-4 h-4 text-sky-500" />
            <span>Satu Sesi Voting</span>
          </div>
        </div>
      </div>
    </div>
  );
}
