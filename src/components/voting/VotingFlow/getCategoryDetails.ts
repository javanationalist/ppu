import React from 'react';
import { Sparkles, User } from 'lucide-react';

export const getCategoryDetails = (catId: string, catName: string, catType?: string) => {
  const id = catId.toLowerCase();
  const name = catName.toLowerCase();
  
  let gradient = "from-indigo-600 via-indigo-700 to-indigo-950";
  let desc = "Pilih kandidat terbaik Anda dalam pemilihan umum demokratis ini untuk masa depan yang lebih cerah.";
  let icon: React.ReactNode = React.createElement(Sparkles, { className: "w-10 h-10 text-amber-400 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" });
  
  if (id.includes('osis') || name.includes('osis')) {
    gradient = "from-blue-600 via-indigo-700 to-slate-950";
    desc = "Pilih calon Ketua dan Wakil Ketua OSIS yang akan memimpin dan membawa perubahan positif.";
    icon = React.createElement(Sparkles, { className: "w-10 h-10 text-yellow-400 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" });
  } else if (id.includes('mpk') || name.includes('mpk') || catType === 'mpk_smaba') {
    gradient = "from-purple-600 via-indigo-700 to-slate-950";
    desc = "Pilih calon perwakilan MPK (Majelis Perwakilan Kelas) yang akan menjadi suara siswa di tingkat sekolah.";
    icon = React.createElement('img', {
      src: "https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/official%20logo/PPU%20WHITE.webp",
      alt: "PPU Logo",
      className: "w-12 h-12 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
    });
  } else if (id.includes('duta') || name.includes('duta')) {
    gradient = "from-teal-600 via-indigo-800 to-slate-950";
    desc = "Pilih Duta Sekolah terbaik untuk merepresentasikan prestasi, nilai, dan kepribadian sekolah kita.";
    icon = React.createElement(User, { className: "w-10 h-10 text-teal-400 filter drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]" });
  } else if (id.includes('ekskul') || name.includes('ekskul') || name.includes('ekstrakurikuler')) {
    gradient = "from-rose-600 via-indigo-800 to-slate-950";
    desc = "Pilih Ketua Ekstrakurikuler yang inspiratif untuk memandu berbagai minat bakat kreatif siswa.";
    icon = (
      React.createElement('svg', { className: "w-10 h-10 text-rose-400 filter drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" },
        React.createElement('circle', { cx: "12", cy: "12", r: "10" }),
        React.createElement('path', { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" }),
        React.createElement('path', { d: "M2 12h20" })
      )
    );
  }
  
  return { gradient, desc, icon };
};
