import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { WafoAnnouncement } from '../../types';
import { 
  Megaphone, Plus, Search, Trash2, Edit2, 
  ToggleLeft, ToggleRight, X, AlertCircle
} from 'lucide-react';

export default function WafoManager() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<WafoAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState(''); // Just reusing common variable name for search term
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_active: true
  });

  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wafo_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const triggerMockEvent = () => {
    const event = new Event('wafo_updated');
    window.dispatchEvent(event);
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({ title: '', content: '', is_active: true });
    setIsModalOpen(true);
    setMessage(null);
  };

  const handleOpenEdit = (announcement: WafoAnnouncement) => {
    setIsEditMode(true);
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      is_active: announcement.is_active
    });
    setIsModalOpen(true);
    setMessage(null);
  };

  const handleToggleStatus = async (announcement: WafoAnnouncement) => {
    try {
      const newStatus = !announcement.is_active;
      const { error } = await supabase
        .from('wafo_announcements')
        .upsert({ ...announcement, is_active: newStatus });
      
      if (error) throw error;
      
      setAnnouncements(prev => 
        prev.map(a => a.id === announcement.id ? { ...a, is_active: newStatus } : a)
      );
      triggerMockEvent();
    } catch (err) {
      console.error("Toggle error", err);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Yakin ingin menghapus informasi "${title}"?`)) return;
    
    try {
      const { error } = await supabase.from('wafo_announcements').delete().eq('id', id);
      if (error) throw error;
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      triggerMockEvent();
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage({ type: 'error', text: 'Judul dan isi tidak boleh kosong.' });
      return;
    }

    try {
      const newRecord = {
        title: formData.title,
        content: formData.content,
        is_active: formData.is_active
      };

      if (isEditMode && editingId) {
        const { error } = await supabase.from('wafo_announcements').upsert({
          id: editingId,
          ...newRecord,
          updated_at: new Date().toISOString()
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('wafo_announcements').insert([newRecord]);
        if (error) throw error;
      }
      
      setMessage({ type: 'success', text: isEditMode ? 'Informasi berhasil diperbarui!' : 'Informasi berhasil ditambahkan!' });
      fetchAnnouncements();
      triggerMockEvent();
      
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
      
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Terjadi kesalahan' });
    }
  };

  const filtered = announcements.filter(a => 
    a.title.toLowerCase().includes(searchEmail.toLowerCase()) || 
    a.content.toLowerCase().includes(searchEmail.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">WAFO (Warung Informasi)</h1>
              <p className="text-slate-500 font-medium">Kelola papan pengumuman Landing Page</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Informasi
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col w-full h-full min-h-[500px]">
        {/* Search */}
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari judul atau isi informasi..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 sm:p-6 flex-1 bg-white flex flex-col w-full">
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center h-64 w-full">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-medium tracking-wide">Memuat data...</p>
             </div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center w-full">
              <Megaphone className="w-16 h-16 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Papan Informasi Kosong</h3>
              <p className="text-slate-500 max-w-sm mx-auto selection:bg-indigo-100">
                Belum ada informasi yang ditambahkan. Klik "Tambah Informasi" untuk membuat pengumuman baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 w-full">
              {filtered.map(item => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors w-full group">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                        {item.is_active ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed line-clamp-3 mb-3">
                        {item.content}
                      </p>
                      <div className="text-xs text-slate-400 font-medium">
                        Dibuat: {new Date(item.created_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    
                    <div className="flex items-center sm:items-start gap-2 shrink-0">
                      <button 
                        onClick={() => handleToggleStatus(item)}
                        title={item.is_active ? "Nonaktifkan" : "Aktifkan"}
                        className={`p-2 rounded-lg transition-colors ${item.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'}`}
                      >
                        {item.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Informasi"
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id, item.title)}
                        title="Hapus"
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {isEditMode ? 'Edit Informasi' : 'Tambah Informasi Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="wafoForm" onSubmit={handleSubmit} className="space-y-5">
                {message && (
                  <div className={`p-4 rounded-xl flex gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{message.text}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Judul Informasi</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Contoh: Perubahan Jadwal Voting"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Isi Pengumuman</label>
                  <textarea
                    required
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Tulis informasi detail di sini..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y text-sm leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">Status Publikasi</p>
                    <p className="text-xs text-slate-500">Jika aktif, akan langsung tampil di Landing Page</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                    className={`p-1 rounded-lg transition-colors ${formData.is_active ? 'text-emerald-600' : 'text-gray-400'}`}
                  >
                    {formData.is_active ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                  </button>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="wafoForm"
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-lg shadow-indigo-600/20"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
