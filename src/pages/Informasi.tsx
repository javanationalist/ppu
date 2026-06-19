import { Info, CalendarDays, FileText, AlertCircle } from 'lucide-react';

export default function Informasi() {
  const informasiList = [
    {
      id: 1,
      type: 'pengumuman',
      icon: <AlertCircle className="w-5 h-5 text-indigo-400" />,
      title: 'Selamat Datang di Portal Baru',
      date: '10 Oktober 2026',
      content: 'PPU kini hadir dengan tampilan yang lebih fresh dan sistem yang lebih stabil. Pastikan Anda telah terdaftar sebelum masa pemilihan dimulai. '
    },
    {
      id: 2,
      type: 'jadwal',
      icon: <CalendarDays className="w-5 h-5 text-emerald-400" />,
      title: 'Jadwal Pemilihan Umum',
      date: '15 - 20 Oktober 2026',
      content: 'Masa pemungutan suara akan dibuka mulai tanggal 15 Oktober pukul 08:00 hingga tanggal 20 Oktober pukul 15:00. Gunakan hak pilih Anda dengan bijak.'
    },
    {
      id: 3,
      type: 'panduan',
      icon: <FileText className="w-5 h-5 text-amber-400" />,
      title: 'Tata Cara Penggunaan PPU',
      date: 'Terus Berlaku',
      content: '1. Login menggunakan akun/nisn yang terdaftar.\n2. Masuk ke halaman Bilik Suara.\n3. Pilih kandidat berdasarkan Kategori/Dapil.\n4. Konfirmasi dan kirim hak suara Anda.'
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
      <div className="text-center mb-10 w-full animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 shadow-xl shadow-indigo-500/10">
          <Info className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-3">
          Informasi Pemilu
        </h1>
        <p className="text-indigo-200 font-medium sm:text-lg max-w-2xl mx-auto">
          Pusat informasi resmi, panduan, dan jadwal pelaksanaan pemilihan umum.
        </p>
      </div>

      <div className="w-full space-y-6">
        {informasiList.map((item) => (
          <div 
            key={item.id} 
            className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 sm:p-8 rounded-2xl shadow-xl hover:border-indigo-500/30 transition-colors group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-indigo-900 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 shrink-0 bg-[#1c2030] border border-[#2a3050] rounded-xl flex items-center justify-center shadow-lg">
                {item.icon}
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white capitalize leading-tight">
                    {item.title}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 bg-black/40 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-center">
                    {item.date}
                  </span>
                </div>
                <div className="text-sm text-slate-300 leading-relaxed text-left space-y-2 whitespace-pre-line font-medium mt-3">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
