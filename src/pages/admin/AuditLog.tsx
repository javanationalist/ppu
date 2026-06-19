import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../lib/adminService';
import { AuditLog as AuditLogType } from '../../types';
import { Card } from '../../components/ui/Card';
import { 
  FileText, 
  UserCheck, 
  UserMinus, 
  RefreshCw, 
  Clock, 
  Calendar, 
  Mail, 
  Briefcase,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const getActionColor = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete') || act.includes('hapus')) return 'text-red-700 bg-red-50 border-red-100';
    if (act.includes('confirm') || act.includes('konfirmasi')) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    if (act.includes('restore') || act.includes('pulih')) return 'text-sky-700 bg-sky-50 border-sky-100';
    if (act.includes('reset')) return 'text-amber-700 bg-amber-50 border-amber-100';
    return 'text-slate-700 bg-slate-50 border-slate-100';
  };

  const getLogIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('delete')) return <UserMinus className="w-4 h-4 text-red-500" />;
    if (act.includes('confirm')) return <UserCheck className="w-4 h-4 text-emerald-500" />;
    return <FileText className="w-4 h-4 text-slate-500" />;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Audit Log Administrator
          </h1>
          <p className="text-slate-500 text-sm">
            Riwayat log sistem mencatat seluruh aksi krusial yang dilakukan oleh panitia pemilu secara transparan.
          </p>
        </div>
        <button 
          onClick={loadLogs}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all border border-slate-200"
          title="Refresh Logs"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-slate-400 shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs font-semibold">Memuat log sistem...</p>
        </div>
      ) : logs.length === 0 ? (
        <Card className="border border-slate-200 p-16 text-center text-slate-400 bg-white">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">Tidak ada riwayat aktivitas log</p>
          <p className="text-xs text-slate-400 mt-1">Seluruh log aksi pengurus bilik akan dicatat otomatis di sini.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log, index) => (
            <div 
              key={log.id || index} 
              className="bg-white shadow rounded-lg overflow-hidden border border-slate-150 p-4 hover:border-slate-350 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                {/* Action Icon Indicator */}
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-150 mt-0.5">
                  {getLogIcon(log.action)}
                </div>
                
                {/* Event text details */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {log.admin_email}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                  
                  {log.target_user && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Target Konten: <span className="font-bold text-slate-700">{log.target_user}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamp Info */}
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-350" />
                <span>{formatDate(log.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
