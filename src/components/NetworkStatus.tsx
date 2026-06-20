import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ConnectionStatus = 'online' | 'offline' | 'weak';

export default function NetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(navigator.onLine ? 'online' : 'offline');
  const [showGreen, setShowGreen] = useState(false);
  
  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
      setShowGreen(true);
      setTimeout(() => setShowGreen(false), 3000);
    };
    
    const handleOffline = () => {
      setStatus('offline');
      setShowGreen(false);
    };

    const checkConnectionQuality = () => {
      // @ts-ignore - navigator.connection is not standard in all browsers yet
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        // Effective types: 'slow-2g', '2g', '3g', '4g'
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          setStatus('weak');
        } else if (navigator.onLine) {
          setStatus('online');
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check quality every 5 seconds
    const qualityInterval = setInterval(checkConnectionQuality, 5000);
    checkConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
    };
  }, []);

  const isRed = status === 'offline';
  const isYellow = status === 'weak';
  const isGreen = status === 'online' && (showGreen || (!isRed && !isYellow));

  // Determine which light is active
  // Green only stays "vibrant" for 3s after reconnecting or if stable
  // For the purpose of "stable connection", we show green if online and not weak.
  // But per instructions: "hijau ditampilkan 3 detik jika berhasil terhubung"
  // This implies if we are stable, it might go dim. Let's follow the literal timing.

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none select-none">
      <motion.div 
        animate={{ scale: isRed || showGreen ? 1.15 : 0.8 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 15, // Provides the subtle bouncing effect
          mass: 1
        }}
        className="bg-slate-900/80 backdrop-blur-md px-2 py-3 rounded-full border border-slate-700/50 flex flex-col gap-2 shadow-2xl origin-bottom-left"
      >
        
        {/* Red Light (Offline) */}
        <div className="relative group">
          <div className={`w-3 h-3 rounded-full transition-colors duration-500 shadow-sm ${
            isRed 
              ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' 
              : 'bg-slate-700 opacity-30'
          }`} />
          {isRed && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap"
            >
              OFFLINE
            </motion.div>
          )}
        </div>

        {/* Yellow Light (Weak) */}
        <div className="relative group">
          <div className={`w-3 h-3 rounded-full transition-all duration-500 shadow-sm ${
            isYellow 
              ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]' 
              : 'bg-slate-700 opacity-30'
          }`} />
          {isYellow && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap"
            >
              SIGNAL WEAK
            </motion.div>
          )}
        </div>

        {/* Green Light (Connected) */}
        <div className="relative group">
          <div className={`w-3 h-3 rounded-full transition-colors duration-500 shadow-sm ${
            (isGreen || showGreen) && status !== 'offline' && status !== 'weak'
              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
              : 'bg-slate-700 opacity-30'
          }`} />
          {(showGreen) && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap"
            >
              CONNECTED
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
