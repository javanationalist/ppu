import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Megaphone, CalendarDays, FileText, AlertCircle, Clock, 
  ChevronRight, ArrowLeft, Settings, Sparkles, Bell, BellRing, HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { WafoAnnouncement, SystemUpdate } from '../../types';
import { getSystemUpdates } from '../../lib/systemUpdateService';
import { Skeleton } from '../Skeleton';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BackToHomeButton from '../BackToHomeButton';
import NotificationModal from '../NotificationModal';
import {
  NotificationPermissionStatus,
  getNotificationPermission,
  showNewInformationNotification,
  subscribeToNotificationBroadcast,
  registerNotificationServiceWorker,
} from '../../lib/notificationService';

interface WafoViewProps {
  showBackButtons?: boolean;
  showSystemUpdate?: boolean;
  onOpenTutorial?: () => void;
}

export default function WafoView({ showBackButtons = true, showSystemUpdate = true, onOpenTutorial }: WafoViewProps) {
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
    if (showSystemUpdate) {
      fetchUpdates();
    }

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
      .channel('wafo_changes_view_' + (showBackButtons ? 'page' : 'tab'))
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

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'pengumuman':
        return {
          label: 'PENGUMUMAN',
          bg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-500/30',
          icon: <AlertCircle className="w-3.5 h-3.5" />
        };
      case 'jadwal':
        return {
          label: 'JADWAL',
          bg: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-500/30',
          icon: <CalendarDays className="w-3.5 h-3.5" />
        };
      case 'panduan':
        return {
          label: 'PANDUAN',
          bg: 'bg-blue-50 dark:bg-sky-500/10 text-blue-700 dark:text-sky-400 border-blue-200/80 dark:border-sky-500/30',
          icon: <FileText className="w-3.5 h-3.5" />
        };
      default:
        return {
          label: 'INFORMASI',
          bg: 'bg-blue-50 dark:bg-sky-500/10 text-blue-700 dark:text-sky-400 border-blue-200/80 dark:border-sky-500/30',
          icon: <Megaphone className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center py-2 sm:py-4 px-2 sm:px-4 w-full max-w-4xl mx-auto transition-colors duration-300">
      {/* Top Navigation / Action Row */}
      <div className="w-full flex items-center justify-between gap-3 mb-4">
        {showBackButtons ? (
          <div className="flex items-center gap-2 flex-wrap">
            <BackToHomeButton />
            {user && (
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:bg-slate-50 dark:hover:bg-[#333333] text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-2xs transition-all duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kembali ke Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onOpenTutorial && (
            <button
              type="button"
              onClick={onOpenTutorial}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-sky-500/10 hover:bg-indigo-100 dark:hover:bg-sky-500/20 text-blue-700 dark:text-sky-400 border border-indigo-200 dark:border-sky-500/30 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
              title="Buka tutorial panduan"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-bold">Tutorial</span>
            </button>
          )}

          {/* Notification Bell Button */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border shadow-2xs transition-all duration-200 shrink-0 cursor-pointer ${
              notifPermission === 'granted'
                ? 'bg-indigo-50 dark:bg-sky-500/10 border-indigo-200 dark:border-sky-500/30 text-blue-700 dark:text-sky-400 hover:bg-indigo-100 dark:hover:bg-sky-500/20'
                : 'bg-white dark:bg-[#2a2a2a] border-slate-200 dark:border-[#333333] text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            aria-label="Atur Notifikasi"
            title={notifPermission === 'granted' ? 'Notifikasi Aktif' : 'Aktifkan Notifikasi'}
          >
            {notifPermission === 'granted' ? (
              <BellRing className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline font-bold">
              {notifPermission === 'granted' ? 'Notifikasi Aktif' : 'Notifikasi'}
            </span>
          </button>

          {/* System Updates Link */}
          {showSystemUpdate && (
            <Link
              to="/informasi/system-update"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:border-blue-400 dark:hover:border-sky-500 text-slate-700 dark:text-[#f5f5f5] rounded-xl shadow-2xs transition-all duration-200 shrink-0"
              title="System Update"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline font-bold">System Update</span>
            </Link>
          )}
        </div>
      </div>

      {/* WAFO Hero Banner Header */}
      <div className="w-full bg-gradient-to-r from-blue-900/5 via-indigo-900/5 to-slate-50 dark:from-sky-950/30 dark:via-sky-900/10 dark:to-[#1f1f1f] border border-blue-100/90 dark:border-sky-500/20 rounded-2xl p-4 sm:p-5 mb-5 relative overflow-hidden shadow-2xs">
        {/* Subtle decorative background icon */}
        <div className="absolute -right-3 -bottom-5 text-blue-600/5 dark:text-sky-400/5 pointer-events-none select-none">
          <Megaphone className="w-32 h-32" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            {/* Small Official Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100/80 dark:bg-sky-500/20 text-blue-800 dark:text-sky-300 border border-blue-200/60 dark:border-sky-500/30 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-sky-400 animate-pulse" />
              Pusat Informasi Resmi Pemilihan
            </div>

            {/* Title & Subtitle */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                WAFO
              </h1>
              <span className="text-sm sm:text-base font-bold text-blue-700 dark:text-sky-400">
                Warung Informasi
              </span>
            </div>

            {/* Compact Description */}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
              Kamu akan mendapatkan informasi resmi atau panduan dan jadwal pelaksanaan pemilihan di sini.
            </p>
          </div>

          {/* Quick Counter Badge */}
          <div className="hidden sm:flex items-center gap-2 bg-white/90 dark:bg-[#2a2a2a]/90 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200/80 dark:border-[#333] shrink-0 self-start sm:self-center shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {loading ? 'Memuat...' : `${announcements.length} Informasi`}
            </span>
          </div>
        </div>
      </div>

      {/* Announcements List Container */}
      <div className="w-full space-y-3.5">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div 
                key={i} 
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-4 sm:p-5 rounded-2xl shadow-2xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <Skeleton className="h-5 w-28 rounded-md" />
                  <Skeleton className="h-4 w-24 rounded-md" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-md mb-3" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-8 sm:p-10 rounded-2xl text-center shadow-2xs my-2">
            <div className="w-12 h-12 bg-blue-50 dark:bg-sky-500/10 rounded-xl border border-blue-100 dark:border-sky-500/20 flex items-center justify-center mx-auto mb-3">
              <Info className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
              Belum ada informasi
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
              Informasi resmi pemilihan akan ditampilkan di sini.
            </p>
          </div>
        ) : (
          announcements.map((item, index) => {
            const badge = getTypeBadge(item.type);
            return (
              <div 
                key={item.id} 
                className="bg-white dark:bg-[#2a2a2a] border border-slate-200/90 dark:border-[#333333] p-4 sm:p-5 rounded-2xl shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-sky-500/40 transition-all group relative overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300 fill-mode-both"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Accent bar on left */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 dark:bg-sky-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>

                <div className="pl-1">
                  {/* Badge & Date header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold border ${badge.bg}`}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[11px] font-semibold">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mb-2 group-hover:text-blue-700 dark:group-hover:text-sky-400 transition-colors">
                    {item.title}
                  </h3>

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line font-medium bg-slate-50/70 dark:bg-[#222222]/60 p-3.5 rounded-xl border border-slate-100 dark:border-[#333333]">
                    {item.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SECTION: System Update */}
      {showSystemUpdate && (
        <div className="w-full mt-10 pt-8 border-t border-slate-200/80 dark:border-[#333333]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-sky-500/10 border border-blue-100 dark:border-sky-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  System Update
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Pembaruan dan peningkatan aplikasi SUARAKU
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {updatesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : systemUpdates.length === 0 ? (
              <div className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-4 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
                Belum ada pembaruan sistem yang tercatat.
              </div>
            ) : (
              systemUpdates.map((update) => (
                <div
                  key={update.id}
                  className="bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] p-4 rounded-xl shadow-2xs hover:border-blue-300 dark:hover:border-sky-500/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-blue-50 dark:bg-sky-500/10 text-blue-700 dark:text-sky-400 border border-blue-100 dark:border-sky-500/20">
                      {update.version}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {update.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                    {update.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <Link
            to="/informasi/system-update"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white dark:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] hover:border-blue-400 dark:hover:border-sky-500 text-blue-700 dark:text-sky-400 font-bold text-xs rounded-xl transition-all shadow-2xs"
          >
            <span>Lihat Semua Update</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

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
