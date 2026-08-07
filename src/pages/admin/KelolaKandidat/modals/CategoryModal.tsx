import React from 'react';
import { X } from 'lucide-react';
import { Category } from '../../../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  catEditing: Category | null;
  catId: string;
  setCatId: (val: string) => void;
  catName: string;
  setCatName: (val: string) => void;
  catIcon: string;
  setCatIcon: (val: string) => void;
  catType: 'regular' | 'mpk_smaba';
  setCatType: (val: 'regular' | 'mpk_smaba') => void;
  catOrder: number;
  setCatOrder: (val: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CategoryModal({
  isOpen,
  onClose,
  catEditing,
  catId,
  setCatId,
  catName,
  setCatName,
  catIcon,
  setCatIcon,
  catType,
  setCatType,
  catOrder,
  setCatOrder,
  onSubmit,
}: CategoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4 z-[90] backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-ppu-blue to-sky-700 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-base font-extrabold">{catEditing ? 'Edit Kategori Pemilihan' : 'Tambah Kategori Baru'}</h3>
            <p className="text-xs text-sky-100">Atur wadah kandidat & perwakilan suara</p>
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
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nama Kategori</label>
            <input 
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Contoh: Ketua OSIS & Wakil"
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ppu-blue outline-none"
            />
          </div>

          {!catEditing && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">ID Unik Kategori (Opsional)</label>
              <input 
                type="text"
                value={catId}
                onChange={(e) => setCatId(e.target.value)}
                placeholder="Contoh: osis (Otomatis jika dikosongkan)"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ppu-blue outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Ikon (Emoji / Simbol)</label>
              <input 
                type="text"
                value={catIcon}
                onChange={(e) => setCatIcon(e.target.value)}
                placeholder="Contoh: 🏫"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ppu-blue outline-none text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Urutan Tampil</label>
              <input 
                type="number"
                min="1"
                value={catOrder}
                onChange={(e) => setCatOrder(parseInt(e.target.value) || 1)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#202020] text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-ppu-blue outline-none text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipe Pemilihan</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCatType('regular')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                  catType === 'regular'
                    ? 'bg-ppu-blue/10 border-ppu-blue text-ppu-blue dark:bg-sky-500/20 dark:border-sky-400 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202020]'
                }`}
              >
                Reguler (Satu Pilihan Semua Pemilih)
              </button>

              <button
                type="button"
                onClick={() => setCatType('mpk_smaba')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                  catType === 'mpk_smaba'
                    ? 'bg-ppu-blue/10 border-ppu-blue text-ppu-blue dark:bg-sky-500/20 dark:border-sky-400 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#202020]'
                }`}
              >
                Perwakilan Suara (Dapil / Kelas MPK)
              </button>
            </div>
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
              className="flex-1 py-2.5 px-4 bg-ppu-blue hover:bg-sky-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-ppu-blue/20"
            >
              Simpan Kategori
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
