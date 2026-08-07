import React from 'react';
import { X, Check } from 'lucide-react';
import { Dapil } from '../../../../types';
import { ALL_CLASSES } from '../../../../lib/classConstants';

interface DapilModalProps {
  isOpen: boolean;
  onClose: () => void;
  dapilEditing: Dapil | null;
  dapilName: string;
  setDapilName: (val: string) => void;
  dapilPhotoUrl: string;
  setDapilPhotoUrl: (val: string) => void;
  dapilClasses: string[];
  setDapilClasses: React.Dispatch<React.SetStateAction<string[]>>;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  dropdownPosition: { top: number; left: number; width: number };
  toggleDropdown: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DapilModal({
  isOpen,
  onClose,
  dapilEditing,
  dapilName,
  setDapilName,
  dapilPhotoUrl,
  setDapilPhotoUrl,
  dapilClasses,
  setDapilClasses,
  dropdownOpen,
  setDropdownOpen,
  triggerRef,
  dropdownRef,
  dropdownPosition,
  toggleDropdown,
  onSubmit,
}: DapilModalProps) {
  if (!isOpen) return null;

  const col1 = ALL_CLASSES.filter(c => c.startsWith('X-'));
  const col2 = ALL_CLASSES.filter(c => c.startsWith('XI-'));
  const col3 = ALL_CLASSES.filter(c => c.startsWith('XII-'));
  const specialClasses = ALL_CLASSES.filter(c => !c.includes('-'));

  const toggleClassSelection = (cls: string) => {
    setDapilClasses(prev => 
      prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold">{dapilEditing ? 'Edit Daerah Pemilihan (Dapil)' : 'Tambah Dapil Baru'}</h3>
            <p className="text-xs text-indigo-100">Kelompokkan kelas ke dalam wilayah perwakilan MPK</p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nama Dapil / Wilayah</label>
            <input 
              type="text"
              value={dapilName}
              onChange={(e) => setDapilName(e.target.value)}
              placeholder="Contoh: Dapil X IPA, Dapil XII, dll."
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">URL Foto / Logo Dapil (Opsional)</label>
            <input 
              type="url"
              value={dapilPhotoUrl}
              onChange={(e) => setDapilPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
              Alokasi Kelas Pemilih ({dapilClasses.length} Terpilih)
            </label>

            <button
              type="button"
              ref={triggerRef}
              onClick={toggleDropdown}
              className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-left flex items-center justify-between text-xs sm:text-sm text-slate-800 dark:text-slate-200"
            >
              <span className="truncate">
                {dapilClasses.length > 0 ? dapilClasses.join(', ') : 'Pilih Kelas Terkait...'}
              </span>
              <span className="text-slate-400 text-xs ml-2">▼</span>
            </button>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-[#252525] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              Simpan Dapil
            </button>
          </div>
        </form>

        {dropdownOpen && (
          <div 
            ref={dropdownRef}
            className="fixed z-[100] bg-white dark:bg-[#202020] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 max-h-64 overflow-y-auto animate-scale-up"
            style={{
              top: dropdownPosition.top + 'px',
              left: dropdownPosition.left + 'px',
              width: dropdownPosition.width + 'px',
            }}
          >
            {specialClasses.length > 0 && (
              <div className="mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {specialClasses.map(cls => {
                  const isSel = dapilClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClassSelection(cls)}
                      className={`px-2 py-1 text-[11px] rounded-lg font-bold transition-all border flex items-center gap-1 ${
                        isSel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-[#252525] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {isSel && <Check className="w-3 h-3" />}
                      <span>{cls}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {['X', 'XI', 'XII'].map((grade, idx) => {
                const cols = [col1, col2, col3];
                return (
                  <div key={grade} className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1 text-center font-mono">{grade}</div>
                    {cols[idx].map(cls => {
                      const isSel = dapilClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => toggleClassSelection(cls)}
                          className={`w-full py-1 text-[11px] text-center rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                            isSel ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#252525]'
                          }`}
                        >
                          {isSel && <Check className="w-3 h-3" />}
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
