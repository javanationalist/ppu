import React from 'react';
import { motion } from 'motion/react';
import { Home, CreditCard, MapPin, QrCode, User, Info } from 'lucide-react';

interface DashboardNavigationProps {
  activeTab: string;
  setActiveTab: (tab: 'status' | 'kartu' | 'scan' | 'profil' | 'informasi') => void;
  voteMode: 'regular' | 'booth';
  isVoting: boolean;
}

export function DashboardNavigation({
  activeTab,
  setActiveTab,
  voteMode,
  isVoting,
}: DashboardNavigationProps) {
  const items = [
    { id: 'status', label: 'Status', icon: Home },
    { id: 'kartu', label: 'Kartu Pemilih', icon: CreditCard },
    { 
      id: 'scan', 
      label: voteMode === 'regular' ? 'Alokasi' : 'Scan QR', 
      icon: voteMode === 'regular' ? MapPin : QrCode 
    },
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'informasi', label: 'Informasi', icon: Info },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-[#2a2a2a] shrink-0 z-10 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2 gap-2 sm:gap-3 select-none">
          {items.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            const isScan = item.id === 'scan';
            const isScanDisabled = false;
            const isTabLocked = isVoting && item.id !== 'scan';

            return (
              <button
                key={item.id}
                data-tour={item.id}
                onClick={() => {
                  if (isScanDisabled || isTabLocked) return;
                  setActiveTab(item.id as any);
                }}
                className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 select-none outline-none shrink-0 ${
                  isScanDisabled || isTabLocked
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-neutral-850 text-slate-450 dark:text-slate-550'
                    : isScan
                      ? isActive
                        ? 'bg-ppu-blue text-white dark:bg-sky-500 dark:text-slate-950 font-bold shadow-sm shadow-ppu-blue/15 scale-102 cursor-pointer'
                        : 'bg-ppu-blue-light/60 border border-ppu-blue/20 text-ppu-blue dark:bg-sky-500/10 dark:border-sky-500/25 dark:text-sky-400 font-semibold cursor-pointer'
                      : isActive
                        ? 'text-ppu-blue dark:text-sky-400 font-bold cursor-pointer'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-[#2a2a2a]/40 cursor-pointer'
                }`}
                type="button"
                disabled={isScanDisabled || isTabLocked}
              >
                {!isScan && isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-ppu-blue-light dark:bg-sky-500/10 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <IconComponent
                  className={`shrink-0 transition-all duration-200 ${
                    isScanDisabled || isTabLocked
                      ? 'text-slate-400 dark:text-slate-600'
                      : isScan
                        ? isActive
                          ? 'w-5 h-5 sm:w-5.5 sm:h-5.5 text-white dark:text-slate-950 scale-110'
                          : 'w-4.5 h-4.5 sm:w-5 sm:h-5 text-ppu-blue dark:text-sky-400'
                        : isActive
                          ? 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-ppu-blue dark:text-sky-400'
                          : 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-400 dark:text-[#a3a3a3]'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
