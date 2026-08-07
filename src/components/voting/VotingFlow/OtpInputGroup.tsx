import React from 'react';

interface OtpInputGroupProps {
  cardIdInput: string;
  otpRefs: React.RefObject<HTMLInputElement | null>[];
  handleOtpChange: (index: number, val: string) => void;
  handleOtpKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  searchLoading: boolean;
}

export function OtpInputGroup({
  cardIdInput,
  otpRefs,
  handleOtpChange,
  handleOtpKeyDown,
  searchLoading,
}: OtpInputGroupProps) {
  return (
    <div className="flex justify-center gap-2 sm:gap-3 my-4">
      {[0, 1, 2, 3].map((idx) => (
        <input
          key={idx}
          ref={otpRefs[idx]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={cardIdInput[idx] || ''}
          onChange={(e) => handleOtpChange(idx, e.target.value)}
          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
          disabled={searchLoading}
          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-black text-white bg-slate-900 border-2 border-slate-700 focus:border-sky-400 rounded-2xl outline-none transition-all shadow-inner disabled:opacity-50"
          placeholder="•"
        />
      ))}
    </div>
  );
}
