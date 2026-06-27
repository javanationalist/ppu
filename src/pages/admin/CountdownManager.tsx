import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Countdown } from '../../types';
import { 
  Clock, Plus, Search, Trash2, Edit2, 
  X, AlertCircle, Calendar, MessageSquare, 
  ToggleLeft, ToggleRight
} from 'lucide-react';

export default function CountdownManager() {
  const { user } = useAuth();
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTableMissing, setIsTableMissing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    target_datetime: '',
    finished_text: '',
    is_active: false
  });

  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchCountdowns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('countdown')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          setIsTableMissing(true);
          setCountdowns([]);
          return;
        }
        throw error;
      }
      setIsTableMissing(false);
      setCountdowns(data || []);
    } catch (err: any) {
      console.error('Error fetching countdowns:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountdowns();
  }, []);

  const triggerMockEvent = () => {
    const event = new Event('countdown_updated');
    window.dispatchEvent(event);
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    // Default target: 30 days from now at 07:00
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(7, 0, 0, 0);
    const targetLocalStr = formatForDateTimeLocal(d.toISOString());
    
    setFormData({ 
      name: '', 
      title: '', 
      target_datetime: targetLocalStr, 
      finished_text: '', 
      is_active: false 
    });
    setIsModalOpen(true);
    setMessage(null);
  };

  const formatForDateTimeLocal = (isoString: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleOpenEdit = (countdown: Countdown) => {
    setIsEditMode(true);
    setEditingId(countdown.id);
    setFormData({
      name: countdown.name,
      title: countdown.title,
      target_datetime: formatForDateTimeLocal(countdown.target_datetime),
      finished_text: countdown.finished_text,
      is_active: countdown.is_active
    });
    setIsModalOpen(true);
    setMessage(null);
  };

  const handleToggleStatus = async (countdown: Countdown) => {
    try {
      const newStatus = !countdown.is_active;
      
      if (newStatus) {
        // Deactivate all other active countdowns
        const { data: activeList } = await supabase
          .from('countdown')
          .select('*')
          .eq('is_active', true);
          
        if (activeList) {
          for (const item of activeList) {
            await supabase
              .from('countdown')
              .update({ is_active: false })
              .eq('id', item.id);
          }
        }
      }

      const { error } = await supabase
        .from('countdown')
        .update({ is_active: newStatus })
        .eq('id', countdown.id);
      
      if (error) throw error;
      
      fetchCountdowns();
      triggerMockEvent();
    } catch (err) {
      console.error("Toggle countdown status error", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus countdown "${name}"?`)) return;
    
    try {
      const { error } = await supabase.from('countdown').delete().eq('id', id);
      if (error) throw error;
      setCountdowns(prev => prev.filter(c => c.id !== id));
      triggerMockEvent();
    } catch (err) {
      console.error("Delete countdown error", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.title.trim() || !formData.target_datetime || !formData.finished_text.trim()) {
      setMessage({ type: 'error', text: 'Semua field wajib diisi.' });
      return;
    }

    try {
      const targetIso = new Date(formData.target_datetime).toISOString();

      if (formData.is_active) {
        // Deactivate other active countdowns first
        const { data: activeList } = await supabase
          .from('countdown')
          .select('*')
          .eq('is_active', true);
          
        if (activeList) {
          for (const item of activeList) {
            if (item.id !== editingId) {
              await supabase
                .from('countdown')
                .update({ is_active: false })
                .eq('id', item.id);
            }
          }
        }
      }

      const newRecord = {
        name: formData.name,
        title: formData.title,
        target_datetime: targetIso,
        finished_text: formData.finished_text,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (isEditMode && editingId) {
        const { error } = await supabase.from('countdown').update(newRecord).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('countdown').insert([{
          ...newRecord,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
      
      setMessage({ 
        type: 'success', 
        text: isEditMode ? 'Countdown berhasil diperbarui!' : 'Countdown berhasil ditambahkan!' 
      });
      fetchCountdowns();
      triggerMockEvent();
      
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' });
    }
  };

  const filtered = countdowns.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDisplayDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Kelola Countdown</h1>
              <p className="text-slate-500 font-medium">Buat dan atur hitung mundur pemilu di Landing Page</p>
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={handleOpenAdd}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Countdown
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau judul countdown..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-700 placeholder-gray-400 focus:outline-hidden"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Memuat data countdown...</p>
        </div>
      ) : isTableMissing ? (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-amber-200 bg-amber-50/10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Tabel Database Belum Dibuat</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Fitur Countdown memerlukan tabel baru bernama <strong>countdown</strong> di database Supabase Anda. 
                Silakan buka <strong>Supabase SQL Editor</strong> di proyek Anda, lalu salin dan jalankan perintah SQL berikut untuk membuat tabel dan mengaktifkan kebijakan keamanannya:
              </p>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 font-mono text-xs p-4 overflow-x-auto max-h-72">
            <div className="absolute top-2 right-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`-- Buat tabel countdown
CREATE TABLE IF NOT EXISTS countdown (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  target_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE countdown ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik
CREATE POLICY "Semua orang dapat membaca countdown" 
ON countdown FOR SELECT USING (true);

-- 2. Policy untuk Admin (Tambah)
CREATE POLICY "Admin dapat menambah countdown" 
ON countdown FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Policy untuk Admin (Ubah)
CREATE POLICY "Admin dapat mengubah countdown" 
ON countdown FOR UPDATE USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Policy untuk Admin (Hapus)
CREATE POLICY "Admin dapat menghapus countdown" 
ON countdown FOR DELETE USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Aktifkan Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE countdown;`);
                  alert('Query SQL berhasil disalin!');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                Salin SQL
              </button>
            </div>
            <pre>{`-- Buat tabel countdown
CREATE TABLE IF NOT EXISTS countdown (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  target_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE countdown ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik (Agar bisa dibaca oleh semua orang)
CREATE POLICY "Semua orang dapat membaca countdown" 
ON countdown FOR SELECT USING (true);

-- 2. Policy untuk Admin (Dapat menambah data)
CREATE POLICY "Admin dapat menambah countdown" 
ON countdown FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Policy untuk Admin (Dapat mengubah data)
CREATE POLICY "Admin dapat mengubah countdown" 
ON countdown FOR UPDATE USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Policy untuk Admin (Dapat menghapus data)
CREATE POLICY "Admin dapat menghapus countdown" 
ON countdown FOR DELETE USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Aktifkan Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE countdown;`}</pre>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400 font-medium">Setelah menjalankan SQL di atas, silakan klik tombol Segarkan di bawah ini.</p>
            <button
              onClick={() => fetchCountdowns()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
            >
              Segarkan Halaman
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Belum Ada Countdown</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'Tidak ada countdown yang cocok dengan pencarian Anda.' : 'Silakan tambahkan countdown baru untuk memulai penayangan hitung mundur.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((countdown) => (
            <div 
              key={countdown.id} 
              className={`bg-white rounded-2xl border transition-all p-6 flex flex-col justify-between shadow-xs ${
                countdown.is_active 
                  ? 'border-indigo-500 ring-2 ring-indigo-500/10' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="space-y-4">
                {/* Name & Status */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{countdown.name}</h3>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">ID: {countdown.id.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(countdown)}
                    className="focus:outline-hidden shrink-0"
                    title={countdown.is_active ? "Nonaktifkan" : "Aktifkan"}
                  >
                    {countdown.is_active ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Aktif
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-xs font-semibold">
                        Nonaktif
                      </div>
                    )}
                  </button>
                </div>

                {/* Info Fields */}
                <div className="space-y-3 pt-2 text-sm border-t border-gray-50">
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Judul Tampilan</p>
                      <p className="text-slate-700 font-medium whitespace-pre-line">{countdown.title}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Waktu Target</p>
                      <p className="text-slate-700 font-bold">{formatDisplayDate(countdown.target_datetime)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Pesan Setelah Berakhir</p>
                      <p className="text-slate-600 italic text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        "{countdown.finished_text}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleOpenEdit(countdown)}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 rounded-xl transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(countdown.id, countdown.name)}
                  className="flex items-center gap-1 px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100 rounded-xl transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditMode ? 'Edit Countdown' : 'Tambah Countdown'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {message && (
                <div className={`p-4 rounded-xl flex items-start gap-2.5 ${
                  message.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                    : 'bg-rose-50 text-rose-800 border border-rose-100'
                }`}>
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-semibold">{message.text}</p>
                </div>
              )}

              {/* Nama Countdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  Nama Countdown
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MPLS 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-medium"
                />
                <p className="text-[11px] text-gray-400 font-medium">Nama internal untuk keperluan pengelolaan data.</p>
              </div>

              {/* Judul Countdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  Judul Tampilan (di Landing Page)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Pemilihan MPK dan Ketua & Wakil Ketua OSIS&#10;SMA Negeri 1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-medium"
                />
                <p className="text-[11px] text-gray-400 font-medium">Gunakan baris baru (enter) untuk memisahkan teks secara vertikal.</p>
              </div>

              {/* Waktu Target */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  Waktu Target (Tanggal & Jam)
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.target_datetime}
                  onChange={(e) => setFormData({ ...formData, target_datetime: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-semibold font-mono"
                />
                <p className="text-[11px] text-gray-400 font-medium">Masukkan waktu penutupan / waktu akhir hitung mundur.</p>
              </div>

              {/* Pesan Setelah Selesai */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  Pesan Setelah Countdown Berakhir
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemungutan suara sedang berlangsung."
                  value={formData.finished_text}
                  onChange={(e) => setFormData({ ...formData, finished_text: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-gray-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Status Aktif */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Status Aktif</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Jika diaktifkan, countdown lain otomatis dinonaktifkan.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className="focus:outline-hidden text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {formData.is_active ? (
                    <ToggleRight className="w-10 h-10" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
