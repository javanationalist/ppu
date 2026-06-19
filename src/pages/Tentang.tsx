import { Building2, ShieldCheck, Zap, Users } from 'lucide-react';

export default function Tentang() {
  const features = [
    {
      title: 'Digitalisasi Pemilu',
      description: 'Mentransformasi sistem pemungutan suara konvensional ke platform digital yang modern dan efisien.',
      icon: <Zap className="w-6 h-6 text-indigo-400" />
    },
    {
      title: 'Validasi & Keamanan',
      description: 'Menjamin bahwa satu pemilih hanya dapat memberikan satu suara dengan integritas data tingkat tinggi.',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />
    },
    {
      title: 'Aksesibilitas',
      description: 'Mudah diakses dari berbagai perangkat (smartphone, tablet, maupun komputer) di mana saja.',
      icon: <Users className="w-6 h-6 text-cyan-400" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
      <div className="text-center mb-12 w-full animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6 shadow-xl shadow-indigo-500/10">
          <Building2 className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-3 text-center">
          Tentang PPU
        </h1>
        <p className="text-indigo-200 font-medium sm:text-lg max-w-2xl mx-auto text-center">
          Membangun iklim demokrasi digital yang transparan dan dapat diandalkan.
        </p>
      </div>

      <div className="w-full space-y-8 bg-slate-900/40 backdrop-blur-md border border-white/10 p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="relative z-10 w-full space-y-10">
          {/* Main Description */}
          <div>
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Pengenalan Sistem</h2>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-medium">
              Portal Pemilihan Umum (PPU) adalah sistem pemungutan suara berbasis web yang dirancang untuk memfasilitasi kebutuhan demokrasi di lingkungan institusi pendidikan, organisasi, dan komunitas. PPU berfokus pada kecepatan, keamanan, dan pengalaman pengguna yang modern.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">Fitur Utama</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-black/20 border border-white/5 rounded-2xl p-6 flex flex-col items-center text-center hover:border-indigo-500/20 transition-colors">
                  <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-white font-bold mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 mt-4 text-center pb-4">
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Penyeleggara / Pengembang</p>
             <h3 className="text-xl font-black text-white tracking-widest uppercase">SMAN 1 BANGSAL</h3>
             <p className="text-sm text-slate-400 mt-2 font-medium">Tim Pengembang Teknologi Informasi PPU</p>
          </div>
        </div>
      </div>
    </div>
  );
}
