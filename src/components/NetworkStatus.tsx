import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ConnectionStatus = 'online' | 'offline' | 'weak' | 'checking';

export default function NetworkStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(navigator.onLine ? 'online' : 'offline');
  const [isExpandedState, setIsExpandedState] = useState(false);
  const [opacityState, setOpacityState] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  const timerScaleRef = useRef<NodeJS.Timeout | null>(null);
  const timerFadeRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setStatus('online');
    };
    
    const handleOffline = () => {
      setStatus('offline');
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
    };
  }, []);

  const triggerSequence = () => {
    // Cancel any active timers
    if (timerScaleRef.current) clearTimeout(timerScaleRef.current);
    if (timerFadeRef.current) clearTimeout(timerFadeRef.current);

    // 1. Reset state to visible and expanded (membesar)
    setOpacityState(1);
    setIsExpandedState(true);

    // 2. Wait 3 seconds in expanded state
    timerScaleRef.current = setTimeout(() => {
      // 3. Shrink to normal size
      setIsExpandedState(false);

      // 4. Wait 500ms for shrink animation to finish, then start 3-second fade out
      timerFadeRef.current = setTimeout(() => {
        setOpacityState(0);
      }, 500); // Wait for the shrink animation to finish
    }, 3000);
  };

  useEffect(() => {
    if (status === 'online') {
      triggerSequence();
    } else {
      // For offline or weak, cancel sequence timers and keep it visible & expanded
      if (timerScaleRef.current) clearTimeout(timerScaleRef.current);
      if (timerFadeRef.current) clearTimeout(timerFadeRef.current);
      setIsExpandedState(true);
      setOpacityState(1);
    }

    return () => {
      if (timerScaleRef.current) clearTimeout(timerScaleRef.current);
      if (timerFadeRef.current) clearTimeout(timerFadeRef.current);
    };
  }, [status]);

  const handleStatusClick = () => {
    triggerSequence();
  };

  const isRed = status === 'offline';
  const isYellow = status === 'weak';
  const isGreenActive = status === 'online';
  
  // Expanded if: auto-expanding, hovered (and visible), or offline/weak
  const isExpanded = isExpandedState || (isHovered && opacityState > 0) || isRed || isYellow;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto select-none">
      <motion.div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleStatusClick}
        animate={{ 
          scale: isExpanded ? 1.15 : 0.8,
          opacity: opacityState
        }}
        transition={{ 
          scale: {
            type: "spring", 
            stiffness: 400, 
            damping: 15,
            mass: 1
          },
          opacity: {
            duration: opacityState === 0 ? 3 : 0.2,
            ease: "easeInOut"
          }
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

