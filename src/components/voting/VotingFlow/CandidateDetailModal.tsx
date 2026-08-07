import React from 'react';
import { X, User } from 'lucide-react';
import { Candidate } from '../../../types';

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onSelect: (candidate: Candidate) => void;
}

export function CandidateDetailModal({ candidate, onClose, onSelect }: CandidateDetailModalProps) {
  if (!candidate) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-auto max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 font-black text-lg flex items-center justify-center border border-amber-500/30">
              #{candidate.number}
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">{candidate.chairman}</h3>
              {candidate.vice && <p className="text-xs text-slate-400 font-semibold">& {candidate.vice}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {candidate.photo_url && (
            <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <img src={candidate.photo_url} alt={candidate.chairman} className="w-full h-full object-cover object-top" />
            </div>
          )}

          {candidate.visi && (
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
              <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2">Visi Utama</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">{candidate.visi}</p>
            </div>
          )}

          {candidate.misi && candidate.misi.length > 0 && (
            <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800/80">
              <h4 className="text-xs font-black uppercase text-sky-400 tracking-wider mb-3">Misi & Program Kerja</h4>
              <ul className="space-y-2">
                {candidate.misi.map((m, idx) => (
                  <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm rounded-2xl transition-all"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelect(candidate);
            }}
            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Pilih Paslon Ini
          </button>
        </div>
      </div>
    </div>
  );
}
