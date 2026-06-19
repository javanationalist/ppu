import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WafoAnnouncement } from '../types';

export default function WafoSlider() {
  const [announcements, setAnnouncements] = useState<WafoAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('wafo_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching WAFO:", error);
      } else {
        setAnnouncements(data || []);
        setCurrentIndex(0); // reset if data changes
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    // Listen to mock custom event, or you can implement a standard interval check for mock mode
    const handleStorageChange = () => {
      fetchAnnouncements();
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event to trigger updates immediately within the same window
    window.addEventListener('wafo_updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wafo_updated', handleStorageChange);
    };
  }, []);

  // Auto Scroll Logic
  useEffect(() => {
    if (announcements.length <= 1 || showModal || isHovered) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 10000);

    return () => clearInterval(interval);
  }, [announcements.length, currentIndex, showModal, isHovered]);

  const nextSlide = () => {
    if (announcements.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const prevSlide = () => {
    if (announcements.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    setTouchStart(null);
  };

  if (loading || announcements.length === 0) {
    return null; // hide if empty or loading
  }

  const currentAnnouncement = announcements[currentIndex];
  // Simple check for text length to trigger "Lihat Selengkapnya"
  const isLongContent = currentAnnouncement?.content.length > 120;

  return (
    <>
      <div 
        className="w-full bg-[#1c2030] border-b border-[#2a3050] text-[#e8ecf5] shadow-lg relative overflow-hidden transition-all"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>

        <div className="max-w-5xl mx-auto flex items-center p-3 sm:px-6 relative">
          {/* Icon */}
          <div className="hidden sm:flex items-center justify-center shrink-0 w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-md shadow-indigo-500/10 mr-4 group-hover:scale-105 transition-transform">
            <Megaphone className="w-5 h-5 animate-pulse" />
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {announcements.map((item) => (
                <div key={item.id} className="w-full flex-shrink-0 px-2 sm:px-4">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-1 lg:mb-0">
                      <Megaphone className="w-4 h-4 text-indigo-400 sm:hidden" />
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-tight break-words">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed max-w-3xl line-clamp-2 md:line-clamp-1">
                      {item.content}
                    </p>
                    {item.content.length > 120 && (
                      <button 
                        onClick={() => setShowModal(true)}
                        className="text-[10px] sm:text-[11px] text-indigo-400 hover:text-indigo-300 font-bold self-start mt-1 underline transition-colors"
                      >
                        Lihat Selengkapnya
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nav Controls */}
          {announcements.length > 1 && (
            <div className="shrink-0 flex items-center gap-1.5 ml-4 bg-[#151821] p-1 rounded-lg border border-[#2a3050]">
              <button 
                onClick={prevSlide}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#2a3050] text-slate-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Dots for Desktop */}
              <div className="hidden sm:flex items-center gap-1.5 px-2">
                {announcements.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === currentIndex 
                        ? 'bg-indigo-400 w-3' 
                        : 'bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              <button 
                onClick={nextSlide}
                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#2a3050] text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1c2030] border border-[#2a3050] w-full max-w-lg rounded-2xl shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-[#2a3050]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm sm:text-base pr-4">{currentAnnouncement?.title}</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Dipublikasikan: {new Date(currentAnnouncement.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {currentAnnouncement?.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
