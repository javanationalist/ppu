import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function BackToHomeButton() {
  const location = useLocation();

  if (location.pathname === '/') {
    return null;
  }

  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold bg-[#123E8A] hover:bg-[#0b295c] dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl shadow-md shadow-[#123E8A]/10 dark:shadow-sky-500/10 active:scale-95 hover:scale-[1.02] transition-all duration-200 cursor-pointer whitespace-nowrap"
      id="back-to-home-btn"
    >
      <Home className="w-4 h-4 shrink-0" />
      <span>Kembali ke Home</span>
    </Link>
  );
}
