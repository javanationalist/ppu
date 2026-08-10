import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';

interface ScannerOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ScannerStep {
  title: string;
  description: string;
  selector: string;
}

const STORAGE_KEY = 'suaraku_scanner_onboarding_completed';

const STEPS: ScannerStep[] = [
  {
    title: 'Kamera / Scan QR',
    description: 'Kamera ini digunakan untuk memindai QR Code yang tertera pada Kartu Pemilih siswa secara langsung.',
    selector: '[data-tour="scanner-camera"]',
  },
  {
    title: 'Input Manual 4 Digit',
    description: 'Jika QR Code tidak dapat dipindai, Card ID siswa dapat dimasukkan secara manual menggunakan 4 digit angka di sini.',
    selector: '[data-tour="scanner-input"]',
  },
  {
    title: 'Konfirmasi Otomatis',
    description: 'Setelah 4 digit diisi lengkap atau QR Code berhasil dipindai, sistem akan secara otomatis memproses konfirmasi akun siswa.',
    selector: '[data-tour="scanner-camera"]',
  },
  {
    title: 'Detail Akun Siswa',
    description: 'Setelah berhasil dikonfirmasi, detail data siswa akan muncul dalam pop-up dan dapat ditutup menggunakan tombol OK.',
    selector: '[data-tour="scanner-camera"]',
  },
  {
    title: 'Akun yang Sudah Dikonfirmasi',
    description: 'Gunakan tombol ini untuk melihat dan mengelola daftar lengkap akun siswa yang statusnya telah dikonfirmasi.',
    selector: '[data-tour="scanner-confirmed-btn"]',
  },
];

export function ScannerOnboarding({ isOpen, onClose }: ScannerOnboardingProps) {
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

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, updateTargetRect]);

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
  let tooltipTop = 160;
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
          className="fixed rounded-2xl pointer-events-none transition-all duration-300 ring-4 ring-indigo-500 z-[10000]"
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
        <div className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 flex flex-col gap-3">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Panduan Scanner ({currentStep + 1}/{STEPS.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleFinish}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Description */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {currentStepData.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Progress dots & Navigation Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1">
              {STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-5 bg-indigo-600'
                      : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {currentStep === STEPS.length - 1 ? 'Selesai' : 'Lanjut'}
                </span>
                {currentStep === STEPS.length - 1 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
