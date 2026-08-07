import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Megaphone, CalendarDays, FileText, AlertCircle, Clock, 
  ChevronRight, ArrowLeft, Settings, Sparkles, Bell, BellRing
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { WafoAnnouncement, SystemUpdate } from '../types';
import { getSystemUpdates } from '../lib/systemUpdateService';
import { Skeleton } from '../components/Skeleton';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BackToHomeButton from '../components/BackToHomeButton';
import NotificationModal from '../components/NotificationModal';
import {
  NotificationPermissionStatus,
  getNotificationPermission,
  requestNotificationPermission,
  showNewInformationNotification,
  subscribeToNotificationBroadcast,
  isNotificationSupported,
  registerNotificationServiceWorker,
} from '../lib/notificationService';

export default function Informasi() {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const dashboardPath = profile?.role === 'admin' ? '/admin' : '/dashboard';
  const [announcements, setAnnouncements] = useState<WafoAnnouncement[]>([]);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatesLoading, setUpdatesLoading] = useState(true);

  // Notification State
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionStatus>(() => getNotificationPermission());
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  // Ref to track seen WAFO IDs and avoid duplicate notifications on re-render / reconnect / refresh
  const seenWafoIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchDone = useRef<boolean>(false);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('wafo_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching WAFO for Informasi page:", error);
      } else {
        const fetchedData = data || [];
        setAnnouncements(fetchedData);

        // Track initial WAFO IDs so existing items do not trigger notification on page load
        if (!isInitialFetchDone.current) {
          fetchedData.forEach(item => seenWafoIdsRef.current.add(item.id));
          isInitialFetchDone.current = true;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      const data = await getSystemUpdates();
      setSystemUpdates(data.slice(0, 3));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const handleNewWafoArrival = async (newWafo?: { id?: string; title?: string; content?: string }) => {
    if (newWafo?.id) {
      if (seenWafoIdsRef.current.has(newWafo.id)) {
        // Already processed / notified
        return;
      }
      seenWafoIdsRef.current.add(newWafo.id);
    }

    if (getNotificationPermission() === 'granted') {
      await showNewInformationNotification('SUARAKU', 'Informasi baru tersedia di WAFO.');
    }
    fetchAnnouncements();
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchUpdates();

    // Warm up / register Service Worker for notifications if supported
    registerNotificationServiceWorker().catch((err) => {
      console.warn('[Notification] Initial Service Worker registration warning:', err);
    });

    // Check notification permission on mount
    const currentPerm = getNotificationPermission();
    setNotifPermission(currentPerm);

    // If permission is 'default' (not yet asked) and notification API is supported, prompt modal automatically
    if (currentPerm === 'default') {
      setIsNotifModalOpen(true);
    }

    // Listen for window focus to detect if permission changed in browser settings
    const handleFocus = () => {
      setNotifPermission(getNotificationPermission());
    };
    window.addEventListener('focus', handleFocus);

    // Listen for broadcast channel notification events
    const unsubscribeBroadcast = subscribeToNotificationBroadcast((detail) => {
      handleNewWafoArrival(detail);
    });

    // Listen for Supabase Realtime updates on wafo_announcements
    const channel = supabase
      .channel('wafo_changes_page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wafo_announcements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRecord = payload.new as WafoAnnouncement;
            handleNewWafoArrival({
              id: newRecord?.id,
              title: newRecord?.title,
              content: newRecord?.content,
            });
          } else {
            fetchAnnouncements();
          }
        }
      )
      .subscribe();

    window.addEventListener('wafo_updated', fetchAnnouncements);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('wafo_updated', fetchAnnouncements);
      window.removeEventListener('focus', handleFocus);
      unsubscribeBroadcast();
    };
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'pengumuman': return <AlertCircle className="w-5 h-5 text-ppu-red dark:text-rose-400" />;
      case 'jadwal': return <CalendarDays className="w-5 h-5 text-ppu-blue dark:text-sky-400" />;
      case 'panduan': return <FileText className="w-5 h-5 text-ppu-blue dark:text-sky-400" />;
      default: return <Megaphone className="w-5 h-5 text-ppu-blue dark:text-sky-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto transition-colors duration-300">
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <BackToHomeButton />
          {user && (
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali ke Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border shadow-xs transition-all duration-200 shrink-0 cursor-pointer ${
              notifPermission === 'granted'
                ? 'bg-indigo-50 dark:bg-sky-500/10 border-indigo-200 dark:border-sky-500/30 text-ppu-blue dark:text-sky-400 hover:bg-indigo-100 dark:hover:bg-sky-500/20'
                : 'bg-white dark:bg-[#2a2a2a] border-slate-200 dark:border-[#333333] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            aria-label="Atur Notifikasi"
            title={notifPermission === 'granted' ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
          >
            {notifPermission === 'granted' ? (
              <BellRing className="w-4 h-4 text-ppu-blue dark:text-sky-400" />
            ) : (
              <Bell className="w-4 h-4" />
            )}
            <span className="hidden sm:inline font-bold">
              {notifPermission === 'granted' ? 'Notifikasi Aktif' : 'Notifikasi'}
            </span>
          </button>

          {/* Gear Icon Button for System Updates */}
          <Link
            to="/informasi/system-update"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:border-ppu-blue dark:hover:border-sky-500 text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-xs transition-all duration-200 shrink-0"
            title="System Update"
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline font-bold">System Update</span>
          </Link>
        </div>
      </div>

      <div className="text-center mb-10 w-full animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-ppu-blue/10 dark:bg-sky-500/10 border border-ppu-blue/20 dark:border-sky-500/20 mb-6 shadow-md shadow-ppu-blue/5">
          <Info className="w-8 h-8 text-ppu-blue dark:text-sky-400" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-ppu-blue dark:text-sky-400 tracking-tight uppercase mb-3 text-center w-full transition-colors">
          WAFO<br />Warung Informasi
        </h1>
        <p className="text-slate-600 dark:text-[#a3a3a3] font-semibold sm:text-lg max-w-2xl mx-auto text-center w-full transition-colors">
          Kamu akan mendapatkan informasi resmi atau panduan dan jadwal pelaksanaan pemilihan di sini.
        </p>
      </div>

      <div className="w-full space-y-6">
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-slate-300 dark:bg-slate-700"></div>
                
                <div className="flex items-start gap-4 sm:gap-6">
                  {/* Icon block skeleton */}
                  <Skeleton className="w-12 h-12 shrink-0 rounded-xl" />
                  
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Title skeleton */}
                      <Skeleton className="h-6 w-2/3 rounded" />
                      {/* Date badge skeleton */}
                      <Skeleton className="h-6 w-32 rounded-full shrink-0" />
                    </div>
                    
                    {/* Content skeleton */}
                    <div className="space-y-2 p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#333333]">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-5/6 rounded" />
                      <Skeleton className="h-4 w-4/5 rounded" />
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-4 w-28 rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] p-12 rounded-3xl text-center shadow-sm transition-colors">
            <div className="w-16 h-16 bg-slate-50 dark:bg-[#1a1a1a] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-[#333333]">
              <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-[#f5f5f5] mb-2 transition-colors">Belum Ada Informasi</h3>
            <p className="text-slate-500 dark:text-[#a3a3a3] max-w-md mx-auto transition-colors">
              Saat ini belum ada pengumuman atau informasi baru yang diterbitkan oleh panitia.
            </p>
          </div>
        ) : (
          announcements.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-[#2a2a2a] border border-ppu-border dark:border-[#333333] p-6 sm:p-8 rounded-2xl shadow-md hover:border-ppu-blue/30 dark:hover:border-sky-500/30 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-ppu-blue to-ppu-blue-dark dark:from-sky-500 dark:to-sky-600 opacity-70 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="w-12 h-12 shrink-0 bg-slate-50 dark:bg-[#1a1a1a] border border-ppu-border dark:border-[#333333] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-all">
                  {getIcon(item.type || 'pengumuman')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-[#0B1220] dark:text-[#f5f5f5] leading-tight group-hover:text-ppu-blue dark:group-hover:text-sky-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0 bg-slate-50 dark:bg-[#1a1a1a] border border-ppu-border dark:border-[#333333] px-3 py-1.5 rounded-full transition-colors">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-[#a3a3a3] whitespace-nowrap transition-colors">
                        {new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm sm:text-base text-slate-600 dark:text-[#f5f5f5] leading-relaxed text-left space-y-2 whitespace-pre-line font-medium bg-slate-50/50 dark:bg-[#1a1a1a]/40 p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#333333] transition-colors">
                    {item.content}
                  </div>
                  
                  <div className="mt-5 flex items-center justify-end">
                    <div className="text-ppu-blue dark:text-sky-400 font-bold text-xs flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>WAFO Digital</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SECTION: System Update */}
      <div className="w-full mt-16 pt-10 border-t border-slate-200 dark:border-[#333333]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-sky-500/10 border border-indigo-100 dark:border-sky-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-ppu-blue dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                System Update
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Pembaruan dan peningkatan aplikasi SUARAKU
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {updatesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
          ) : systemUpdates.length === 0 ? (
            <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-6 rounded-2xl text-center text-sm text-slate-500 dark:text-slate-400">
              Belum ada pembaruan sistem yang tercatat.
            </div>
          ) : (
            systemUpdates.map((update) => (
              <div
                key={update.id}
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-5 sm:p-6 rounded-2xl shadow-xs hover:border-ppu-blue/30 dark:hover:border-sky-500/30 transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-indigo-50 dark:bg-sky-500/10 text-ppu-blue dark:text-sky-400 border border-indigo-100 dark:border-sky-500/20">
                    {update.version}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {update.date}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                  {update.content}
                </p>
              </div>
            ))
          )}
        </div>

        <Link
          to="/informasi/system-update"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:border-ppu-blue dark:hover:border-sky-500 text-ppu-blue dark:text-sky-400 font-bold text-sm rounded-xl transition-all shadow-xs"
        >
          <span>Lihat Semua Update</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Notification Permission Dialog / Modal */}
      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        status={notifPermission}
        onStatusChange={(newStatus) => setNotifPermission(newStatus)}
      />
    </div>
  );
}


