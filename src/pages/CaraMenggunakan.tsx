import React from 'react';

export default function CaraMenggunakan() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl bg-white border border-ppu-border rounded-3xl shadow-2xl overflow-hidden p-2 sm:p-4">
        <img
          src="https://bfuuuzmcrkfjblancewz.supabase.co/storage/v1/object/public/content/Tata%20Cara%20PPU.png"
          alt="Tata Cara Penggunaan PPU"
          className="w-full h-auto object-contain rounded-2xl mx-auto shadow-sm"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
