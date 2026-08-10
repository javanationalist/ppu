import React from 'react';
import { X, User } from 'lucide-react';
import { Candidate } from '../../../../types';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
}

export function CandidateDetailModal({ isOpen, onClose, candidate }: CandidateDetailModalProps) {
  if (!isOpen || !candidate) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-sky-400 font-bold">Detail Pasangan Kandidat</span>
            <h3 className="text-base font-extrabold text-white">
              No. Urut {candidate.number} - {candidate.chairman} {candidate.vice ? `& ${candidate.vice}` : ''}
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-28 aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 dark:bg-[#202020] border border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-center">
              {candidate.photo_url ? (
                <img src={candidate.photo_url} alt={candidate.chairman} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Ketua</div>
              <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-2">{candidate.chairman}</div>
              {candidate.vice && (
                <>
                  <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Wakil</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{candidate.vice}</div>
                </>
              )}
            </div>
          </div>

          {candidate.visi && (
            <div className="bg-slate-50 dark:bg-[#202020] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold uppercase text-slate-400 mb-1">Visi Utama</div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{candidate.visi}</p>
            </div>
          )}

          {candidate.misi && candidate.misi.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#202020] p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-bold uppercase text-slate-400 mb-2">Misi & Program Kerja</div>
              <ul className="space-y-1.5">
                {candidate.misi.map((m, idx) => (
                  <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-ppu-blue shrink-0 mt-1.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
