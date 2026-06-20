import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ConnectionStatus = 'online' | 'offline' | 'weak' | 'checking';

export default function NetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(navigator.onLine ? 'online' : 'offline');
  const [showGreen, setShowGreen] = useState(false);
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      // @ts-ignore - navigator.connection is not standard
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          setStatus('weak');
        } else if (navigator.onLine) {
          setStatus('online');
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const qualityInterval = setInterval(checkConnectionQuality, 5000);
    checkConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(qualityInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMobileClick = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsManualExpanded(true);
    timeoutRef.current = setTimeout(() => {
      setIsManualExpanded(false);
    }, 3000);
  };

  const isRed = status === 'offline';
  const isYellow = status === 'weak';
  const isGreenActive = (status === 'online' && (showGreen || (!isRed && !isYellow)));
  
  // Expanded logic: either auto-notifying (showGreen), manual interaction, or critical status (offline/weak)
  const isExpanded = isManualExpanded || showGreen || isRed || isYellow;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto select-none">
      <motion.div 
        onMouseEnter={() => setIsManualExpanded(true)}
        onMouseLeave={() => setIsManualExpanded(false)}
        onClick={handleMobileClick}
        animate={{ 
          scale: isExpanded ? 1.15 : 0.8
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 15,
          mass: 1
        }}
        className="bg-slate-900/80 backdrop-blur-md px-2 py-3 rounded-full border border-slate-700/50 flex flex-col gap-3 shadow-2xl origin-bottom-left cursor-pointer"
      >
        
        {/* Red Light (Offline) */}
        <div className="relative flex items-center justify-center">
          <div className={`w-3.5 h-3.5 rounded-full transition-colors duration-500 shadow-sm z-10 ${
            isRed 
              ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]' 
              : 'bg-slate-700 opacity-30'
          }`} />
          <AnimatePresence>
            {isExpanded && isRed && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-7 text-[9px] font-black text-rose-400 uppercase tracking-tighter whitespace-nowrap drop-shadow-sm"
              >
                OFFLINE
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Yellow Light (Weak) */}
        <div className="relative flex items-center justify-center">
          <div className={`w-3.5 h-3.5 rounded-full transition-all duration-500 shadow-sm z-10 ${
            isYellow 
              ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]' 
              : 'bg-slate-700 opacity-20'
          }`} />
          <AnimatePresence>
            {isExpanded && isYellow && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-7 text-[9px] font-black text-amber-500 uppercase tracking-tighter whitespace-nowrap drop-shadow-sm"
              >
                WEAK SIGNAL
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Green Light (Connected) */}
        <div className="relative flex items-center justify-center">
          <div className={`w-3.5 h-3.5 rounded-full transition-colors duration-500 shadow-sm z-10 ${
            isGreenActive
              ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
              : 'bg-slate-700 opacity-30'
          }`} />
          <AnimatePresence>
            {isExpanded && isGreenActive && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute left-7 text-[9px] font-black text-emerald-400 uppercase tracking-tighter whitespace-nowrap drop-shadow-sm"
              >
                CONNECTED
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

