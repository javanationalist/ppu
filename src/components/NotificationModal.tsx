import React, { useState } from 'react';
import { Bell, BellOff, BellRing, Settings, AlertCircle, X, Check, Globe } from 'lucide-react';
import {
  NotificationPermissionStatus,
  getNotificationPermission,
  requestNotificationPermission,
  showNewInformationNotification,
} from '../lib/notificationService';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: NotificationPermissionStatus;
  onStatusChange: (newStatus: NotificationPermissionStatus) => void;
}

export default function NotificationModal({
  isOpen,
  onClose,
  status,
  onStatusChange,
}: NotificationModalProps) {
  const [loading, setLoading] = useState(false);
  const [showSettingsGuide, setShowSettingsGuide] = useState(false);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      onStatusChange(result);
      if (result === 'granted') {
        // Show test notification
        showNewInformationNotification();
        onClose();
      } else if (result === 'denied') {
        setShowSettingsGuide(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryPermission = () => {
    const current = getNotificationPermission();
    onStatusChange(current);
    if (current === 'granted') {
      onClose();
    } else {
      setShowSettingsGuide(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#202020] w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#333333] shadow-xl overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-sky-500/10 border border-indigo-100 dark:border-sky-500/20 flex items-center justify-center">
              {status === 'granted' ? (
                <BellRing className="w-5 h-5 text-ppu-blue dark:text-sky-400" />
              ) : status === 'denied' ? (
                <BellOff className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              ) : (
                <Bell className="w-5 h-5 text-ppu-blue dark:text-sky-400" />
              )}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Status Notifikasi
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-left">
          {/* CASE 1: UNSUPPORTED BROWSER */}
          {status === 'unsupported' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-slate-100 dark:bg-[#2a2a2a] text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-[#333333]">
                  <Globe className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
                  Notifikasi Tidak Didukung
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a3a3a3] leading-relaxed">
                  Browser Anda tidak mendukung Web Notification API. Informasi terbaru dari Panitia Pemilihan tetap dapat diakses secara manual melalui halaman ini.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-3 px-4 bg-slate-100 dark:bg-[#2a2a2a] text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm rounded-xl cursor-not-allowed border border-slate-200 dark:border-[#333333]"
                >
                  Browser tidak mendukung notifikasi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-transparent hover:bg-slate-50 dark:hover:bg-[#2a2a2a] text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* CASE 2: DEFAULT / NOT ASKED YET */}
          {status === 'default' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-sky-500/10 text-ppu-blue dark:text-sky-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100 dark:border-sky-500/20 shadow-xs">
                  <BellRing className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">
                  Aktifkan Notifikasi
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a3a3a3] leading-relaxed">
                  Aktifkan notifikasi agar tidak tertinggal informasi terbaru dari Panitia Pemilihan.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-ppu-blue hover:bg-ppu-blue-dark dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-ppu-blue/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Meminta Izin...</span>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Aktifkan</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-white dark:bg-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#303030] border border-slate-200 dark:border-[#333333] text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Nanti
                </button>
              </div>
            </div>
          )}

          {/* CASE 3: DENIED */}
          {status === 'denied' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100 dark:border-rose-500/20">
                  <BellOff className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
                  Notifikasi dinonaktifkan.
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a3a3a3] leading-relaxed">
                  Aktifkan kembali melalui pengaturan browser apabila ingin menerima informasi terbaru.
                </p>
              </div>

              {showSettingsGuide && (
                <div className="p-4 bg-slate-50 dark:bg-[#282828] border border-slate-200 dark:border-[#383838] rounded-xl text-xs space-y-2 text-slate-700 dark:text-slate-200">
                  <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-white">
                    <Settings className="w-4 h-4 text-ppu-blue dark:text-sky-400" />
                    <span>Cara Mengaktifkan di Browser:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-normal pl-1">
                    <li>Klik ikon gembok / pengaturan di bilah alamat browser (URL bar).</li>
                    <li>Cari menu <strong className="text-slate-800 dark:text-white">Izin / Notifications</strong>.</li>
                    <li>Ubah status menjadi <strong className="text-emerald-600 dark:text-emerald-400">Izinkan / Allow</strong>.</li>
                    <li>Muat ulang (refresh) halaman ini.</li>
                  </ol>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleRetryPermission}
                  className="w-full py-3 px-4 bg-ppu-blue hover:bg-ppu-blue-dark dark:bg-sky-500 dark:hover:bg-sky-600 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-ppu-blue/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  <span>Coba Lagi</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-white dark:bg-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#303030] border border-slate-200 dark:border-[#333333] text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}

          {/* CASE 4: GRANTED */}
          {status === 'granted' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100 dark:border-emerald-500/20">
                  <BellRing className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-2">
                  Notifikasi Aktif
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a3a3a3] leading-relaxed">
                  Anda akan menerima pemberitahuan setiap kali ada informasi terbaru dari Panitia Pemilihan.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Browser Anda sudah dikonfigurasi untuk menerima pemberitahuan.</span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => showNewInformationNotification('SUARAKU', 'Ini adalah notifikasi demo WAFO. Jika kamu melihat notifikasi ini, fitur notifikasi sudah aktif.')}
                  className="w-full py-2.5 px-4 bg-indigo-50 dark:bg-sky-500/10 hover:bg-indigo-100 dark:hover:bg-sky-500/20 text-ppu-blue dark:text-sky-400 font-bold text-xs sm:text-sm rounded-xl border border-indigo-100 dark:border-sky-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>Uji Notifikasi Browser</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-white dark:bg-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#303030] border border-slate-200 dark:border-[#333333] text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
