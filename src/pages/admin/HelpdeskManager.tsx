import React, { useState, useEffect } from 'react';
import { getHelpdeskButtons, saveHelpdeskButton, deleteHelpdeskButton } from '../../lib/helpdesk';
import { HelpdeskButton } from '../../types';
import { Card } from '../../components/ui/Card';
import { Plus, Trash2, Edit2, Link as LinkIcon, RefreshCw, Check, X } from 'lucide-react';

export default function HelpdeskManager() {
  const [buttons, setButtons] = useState<HelpdeskButton[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadButtons = async () => {
    setLoading(true);
    try {
      const data = await getHelpdeskButtons();
      setButtons(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadButtons();
  }, []);

  const handleEditClick = (btn: HelpdeskButton) => {
    setEditingId(btn.id);
    setLabel(btn.label);
    setUrl(btn.url);
    setFormError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setLabel('');
    setUrl('');
    setFormError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) {
      setFormError('Semua kolom input harus diisi.');
      return;
    }

    // Basic URL format validation
    try {
      new URL(url);
    } catch (_) {
      setFormError('Masukkan URL/Link yang valid (termasuk http:// atau https://).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await saveHelpdeskButton({
        id: editingId || undefined,
        label: label.trim(),
        url: url.trim()
      });
      
      await loadButtons();
      handleCancel();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan tombol helpdesk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus tombol helpdesk ini?')) {
      try {
        await deleteHelpdeskButton(id);
        await loadButtons();
      } catch (err) {
        console.error('Gagal menghapus tombol', err);
      }
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kelola Helpdesk</h1>
          <p className="text-slate-500 text-sm">Tambahkan, ubah, atau hapus tombol bantuan WhatsApp, Instagram, dll. untuk pemilih</p>
        </div>
        <button 
          onClick={loadButtons}
          className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-all"
          title="Refresh Data"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Form panel */}
        <div className="md:col-span-5">
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">
                {editingId ? 'Edit Tombol Helpdesk' : 'Tambah Tombol Helpdesk'}
              </h3>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold leading-relaxed border border-red-100">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
                  Label / Nama Tombol
                </label>
                <input
                  type="text"
                  placeholder="e.g. WhatsApp, Instagram OSIS, LINE"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-800"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
                  URL / Link Tujuan
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://wa.me/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm text-slate-800"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md text-sm font-bold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSubmitting ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Tombol'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-slate-100 text-slate-700 py-2 px-4 rounded-md text-sm font-bold hover:bg-slate-200 focus:outline-none transition-colors flex items-center justify-center"
                    title="Batalkan Edit"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Buttons list */}
        <div className="md:col-span-7">
          <Card className="border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700">Daftar Tombol Aktif</h3>
            </div>
            
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  Memuat tombol...
                </div>
              ) : buttons.length === 0 ? (
                <div className="p-8 text-center text-slate-500 leading-relaxed italic">
                  Belum ada tombol helpdesk yang dikonfigurasi.
                </div>
              ) : (
                buttons.map((btn) => (
                  <div key={btn.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0 pr-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{btn.label}</h4>
                        <p className="text-xs text-slate-400 font-mono truncate">{btn.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditClick(btn)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Edit Tombol"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(btn.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Hapus Tombol"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Real-time Preview */}
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">👁️ Live Preview Tombol di Dashboard Pemilih</h4>
            <div className="flex flex-wrap gap-3">
              {buttons.map((btn) => (
                <a
                  key={btn.id}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-110 transition-transform"></span>
                  {btn.label}
                  <span className="text-[10px] text-slate-400 font-normal">→</span>
                </a>
              ))}
              {buttons.length === 0 && (
                <span className="text-xs text-slate-400 italic">Preview kosong.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
