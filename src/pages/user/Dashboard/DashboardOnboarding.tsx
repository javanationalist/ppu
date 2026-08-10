import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';

interface DashboardOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: 'status' | 'kartu' | 'scan' | 'profil' | 'informasi') => void;
}

export interface Step {
  tabId: 'status' | 'kartu' | 'scan' | 'profil' | 'informasi';
  title: string;
  description: string;
  selector: string;
}

const STORAGE_KEY = 'suaraku_dashboard_onboarding_completed';

const STEPS: Step[] = [
  {
    tabId: 'status',
    title: 'Status',
    description: 'Di sini kamu bisa melihat tahapan proses pemilihanmu, mulai dari verifikasi akun sampai selesai memilih.',
    selector: '[data-tour="status"]',
  },
  {
    tabId: 'kartu',
    title: 'Kartu Pemilih',
    description: 'Di sini kamu dapat melihat dan menggunakan Kartu Pemilih sebagai identitas dalam proses pemilihan.',
    selector: '[data-tour="kartu"]',
  },
  {
    tabId: 'scan',
    title: 'Scan QR',
    description: 'Gunakan bagian ini untuk menghubungkan akunmu dengan Bilik Suara dengan memindai kode QR.',
    selector: '[data-tour="scan"]',
  },
  {
    tabId: 'profil',
    title: 'Profil',
    description: 'Di sini kamu bisa melihat dan edit profil akunmu.',
    selector: '[data-tour="profil"]',
  },
  {
    tabId: 'informasi',
    title: 'Informasi',
    description: 'Di sini kamu bisa melihat informasi resmi, panduan, dan pengumuman terbaru.',
    selector: '[data-tour="informasi"]',
  },
];

export function DashboardOnboarding({
  isOpen,
  onClose,
  setActiveTab,
}: DashboardOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  // Reset to step 0 when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Measure target element position
  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = STEPS[currentStep];
    if (!step) return;

    const element = document.querySelector(step.selector);
    if (element) {
      element.scrollIntoView({
        block: 'nearest',
        inline: 'center',
      });
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  // Switch tab when step changes and measure rect
  useEffect(() => {
    if (!isOpen) return;

    const step = STEPS[currentStep];
    if (step) {
      setActiveTab(step.tabId);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, setActiveTab, updateTargetRect]);

  // Recalculate position on window resize & scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, updateTargetRect]);

  const handleFinish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save onboarding status to localStorage:', e);
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const currentStepData = STEPS[currentStep];

  // Tooltip positioning
  const tooltipWidth = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 32 : 320);
  let tooltipTop = 140;
  let tooltipLeft = 16;

  if (targetRect) {
    tooltipLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16));

    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    if (spaceBelow >= 220) {
      tooltipTop = targetRect.top + targetRect.height + 14;
    } else {
      tooltipTop = Math.max(16, targetRect.top - 220);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto select-none overflow-hidden">
      {/* Target Spotlight Highlight */}
      {targetRect && (
        <div
          className="fixed rounded-full pointer-events-none transition-all duration-300 ring-4 ring-indigo-500 dark:ring-sky-400 z-[10000]"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.70), 0 0 20px rgba(99, 102, 241, 0.6)',
          }}
        />
      )}

      {!targetRect && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-[9999]" />
      )}

      {/* Tooltip Card */}
      <div
        className="fixed z-[10001] transition-all duration-300 ease-out"
        style={{
          top: `${tooltipTop}px`,
          left: `${tooltipLeft}px`,
          width: `${tooltipWidth}px`,
        }}
      >
        <div className="bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#333333] rounded-2xl p-5 shadow-2xl text-slate-800 dark:text-slate-100 space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-[#333333] pb-3">
            <div className="flex items-center gap-1.5">
              <span className="p-1 bg-indigo-50 dark:bg-sky-500/10 text-indigo-600 dark:text-sky-400 rounded-lg">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-sky-400">
                Panduan Penggunaan
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black bg-slate-100 dark:bg-[#333333] text-slate-600 dark:text-slate-300 rounded-full">
                {currentStep + 1} / {STEPS.length}
              </span>
              <button
                type="button"
                onClick={handleFinish}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                title="Tutup tutorial"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
              {currentStepData.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {currentStepData.description}
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors px-2 py-1.5 cursor-pointer"
            >
              Lewati
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 bg-slate-100 dark:bg-[#333333] hover:bg-slate-200 dark:hover:bg-[#444444] text-slate-700 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Kembali
                </button>
              )}

              {currentStep < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
                >
                  Berikutnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Selesai
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
