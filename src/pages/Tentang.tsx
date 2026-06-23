import { Building2, ShieldCheck, Zap, Users } from 'lucide-react';

export default function Tentang() {
  const features = [
    {
      title: 'Digitalisasi Pemilu',
      description: 'Mentransformasi sistem pemungutan suara konvensional ke platform digital yang modern dan efisien.',
      icon: <Zap className="w-6 h-6 text-ppu-blue dark:text-sky-400" />
    },
    {
      title: 'Validasi & Keamanan',
      description: 'Menjamin bahwa satu pemilih hanya dapat memberikan satu suara dengan integritas data tingkat tinggi.',
      icon: <ShieldCheck className="w-6 h-6 text-ppu-blue dark:text-sky-400" />
    },
    {
      title: 'Aksesibilitas',
      description: 'Mudah diakses dari berbagai perangkat (smartphone, tablet, maupun komputer) di mana saja.',
      icon: <Users className="w-6 h-6 text-ppu-blue dark:text-sky-400" />
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto transition-colors duration-300">
      <div className="text-center mb-12 w-full animate-fade-in animate-in fade-in duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ppu-blue/10 dark:bg-sky-500/10 border border-ppu-blue/20 dark:border-sky-500/20 mb-6 shadow-md shadow-ppu-blue/5">
          <Building2 className="w-8 h-8 text-ppu-blue dark:text-sky-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-ppu-blue dark:text-sky-400 tracking-tight uppercase mb-3 text-center transition-colors">
          Tentang PPU
        </h1>
        <p className="text-slate-600 dark:text-[#a3a3a3] font-semibold sm:text-lg max-w-2xl mx-auto text-center transition-colors">
          Membangun iklim demokrasi digital yang transparan dan dapat diandalkan.
        </p>
      </div>

      <div className="w-full space-y-8 bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] p-8 sm:p-10 rounded-3xl shadow-xl relative overflow-hidden transition-colors">
        {/* Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-ppu-blue/5 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-ppu-blue/5 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

        <div className="relative z-10 w-full space-y-10">
          {/* Main Description */}
          <div>
            <h2 className="text-xs font-bold text-ppu-blue dark:text-sky-400 uppercase tracking-widest mb-4 transition-colors">Pengenalan Sistem</h2>
            <p className="text-slate-600 dark:text-[#f5f5f5] text-sm sm:text-base leading-relaxed font-medium transition-colors">
              Portal Pemilihan Umum (PPU) adalah sistem pemungutan suara berbasis web yang dirancang untuk memfasilitasi kebutuhan demokrasi di lingkungan institusi pendidikan, organisasi, dan komunitas. PPU berfokus pada kecepatan, keamanan, dan pengalaman pengguna yang modern.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold text-ppu-blue dark:text-sky-400 uppercase tracking-widest mb-6 transition-colors">Fitur Utama</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-[#1a1a1a] border border-ppu-border dark:border-[#333333] rounded-2xl p-6 flex flex-col items-center text-center hover:border-ppu-blue/30 dark:hover:border-sky-500/30 transition-colors">
                  <div className="w-12 h-12 bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] rounded-full flex items-center justify-center mb-4 transition-colors">
                    {feature.icon}
                  </div>
                  <h3 className="text-[#0B1220] dark:text-[#f5f5f5] font-bold mb-2 transition-colors">{feature.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#a3a3a3] leading-relaxed transition-colors">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-ppu-border dark:border-[#333333] pt-8 mt-4 text-center pb-4 transition-colors">
             <p className="text-xs font-semibold text-slate-500 dark:text-[#a3a3a3] uppercase tracking-widest mb-2 transition-colors">Penyelenggara / Pengembang</p>
             <h3 className="text-xl font-black text-ppu-blue dark:text-sky-400 tracking-widest uppercase transition-colors">SMA NEGERI 1</h3>
             <p className="text-sm text-slate-600 dark:text-[#a3a3a3] mt-2 font-medium transition-colors">Tim Pengembang Teknologi Informasi PPU</p>
          </div>
        </div>
      </div>
    </div>
  );
}
