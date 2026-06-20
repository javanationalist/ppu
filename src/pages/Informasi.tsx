import React, { useState, useEffect } from 'react';
import { Info, Megaphone, CalendarDays, FileText, AlertCircle, Clock, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WafoAnnouncement } from '../types';

export default function Informasi() {
  const [announcements, setAnnouncements] = useState<WafoAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('wafo_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching WAFO for Informasi page:", error);
      } else {
        setAnnouncements(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    
    // Listen for updates
    const channel = supabase
      .channel('wafo_changes_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wafo_announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    window.addEventListener('wafo_updated', fetchAnnouncements);
    
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('wafo_updated', fetchAnnouncements);
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pengumuman': return <AlertCircle className="w-5 h-5 text-ppu-red" />;
      case 'jadwal': return <CalendarDays className="w-5 h-5 text-ppu-blue" />;
      case 'panduan': return <FileText className="w-5 h-5 text-ppu-blue" />;
      default: return <Megaphone className="w-5 h-5 text-ppu-blue" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
      <div className="text-center mb-10 w-full animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ppu-blue/10 border border-ppu-blue/20 mb-6 shadow-md shadow-ppu-blue/5">
          <Info className="w-8 h-8 text-ppu-blue" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-ppu-blue tracking-tight uppercase mb-3 text-center w-full">
          Informasi & Pengumuman
        </h1>
        <p className="text-slate-600 font-semibold sm:text-lg max-w-2xl mx-auto text-center w-full">
          Pusat WAFO (Warung Informasi) resmi, panduan, dan jadwal pelaksanaan pemilihan umum.
        </p>
      </div>

      <div className="w-full space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-ppu-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold animate-pulse">Memuat Informasi...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white border border-ppu-border p-12 rounded-3xl text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Megaphone className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Belum Ada Informasi</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Saat ini belum ada pengumuman atau informasi baru yang diterbitkan oleh panitia.
            </p>
          </div>
        ) : (
          announcements.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-white border border-ppu-border p-6 sm:p-8 rounded-2xl shadow-md hover:border-ppu-blue/30 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-ppu-blue to-ppu-blue-dark opacity-70 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-12 h-12 shrink-0 bg-slate-50 border border-ppu-border rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                  <Megaphone className="w-5 h-5 text-ppu-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-[#0B1220] leading-tight group-hover:text-ppu-blue transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-ppu-border px-3 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600 leading-relaxed text-left space-y-2 whitespace-pre-line font-medium bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200">
                    {item.content}
                  </div>
                  
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status: Aktif</span>
                    </div>
                    <div className="text-ppu-blue font-bold text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>WAFO Digital</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

