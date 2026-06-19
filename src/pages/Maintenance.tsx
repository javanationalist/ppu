import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-100 max-w-lg w-full space-y-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-100">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Under Maintenance</h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            Website saat ini sedang kami perbaiki. Mohon maaf atas ketidaknyamanannya. Silakan tunggu hingga informasi diberikan.
          </p>
        </div>
      </div>
    </div>
  );
}
