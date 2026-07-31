import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Sparkles, Clock, Calendar, Check, X, Layers, AlertCircle } from 'lucide-react';
import { getSystemUpdates, createSystemUpdate, updateSystemUpdate, deleteSystemUpdate } from '../../lib/systemUpdateService';
import { SystemUpdate } from '../../types';
import { Skeleton } from '../../components/Skeleton';

export default function SystemUpdateAdmin() {
  const [updates, setUpdates] = useState<SystemUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<SystemUpdate | null>(null);

  // Form State
  const [version, setVersion] = useState('');
  const [date, setDate] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadUpdates = async () => {
    setLoading(true);
    try {
      const data = await getSystemUpdates();
      setUpdates(data);
    } catch (err) {
      console.error('Failed to load system updates in admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const openAddModal = () => {
    setEditingUpdate(null);
    setVersion('');
    // Default date string formatted e.g. 31 Juli 2026
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    setDate(todayStr);
    setContent('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: SystemUpdate) => {
    setEditingUpdate(item);
    setVersion(item.version);
    setDate(item.date);
    setContent(item.content);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !date.trim() || !content.trim()) {
      setErrorMsg('Semua bidang wajib diisi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      if (editingUpdate) {
        await updateSystemUpdate(editingUpdate.id, {
          version: version.trim(),
          date: date.trim(),
          content: content.trim(),
        });
      } else {
        await createSystemUpdate({
          version: version.trim(),
          date: date.trim(),
          content: content.trim(),
        });
      }
      setIsModalOpen(false);
      await loadUpdates();
    } catch (err) {
      console.error('Error saving system update:', err);
      setErrorMsg('Gagal menyimpan data pembaruan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSystemUpdate(id);
      setDeleteConfirmId(null);
      await loadUpdates();
    } catch (err) {
      console.error('Failed to delete update:', err);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-ppu-blue-light text-ppu-blue rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Kelola System Update
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Tambah, edit, dan hapus riwayat pembaruan sistem aplikasi PPU Digital.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ppu-blue hover:bg-ppu-blue-dark text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Update Baru</span>
        </button>
      </div>

      {/* List / Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 rounded-2xl text-center space-y-3">
            <Layers className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-bold text-gray-700">Belum Ada System Update</h3>
            <p className="text-xs text-gray-500">Klik tombol di atas untuk menambahkan pembaruan sistem pertama.</p>
          </div>
        ) : (
          updates.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-xs hover:border-ppu-blue/30 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 bg-ppu-blue-light text-ppu-blue font-extrabold text-xs sm:text-sm rounded-lg border border-ppu-blue/20">
                    {item.version}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {item.date}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-gray-700 font-medium whitespace-pre-line leading-relaxed pt-1">
                  {item.content}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-2 text-gray-600 hover:text-ppu-blue hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Edit Update"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Hapus Update"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form (Add / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-base sm:text-lg">
                {editingUpdate ? 'Edit System Update' : 'Tambah System Update Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Judul Versi
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="Contoh: Versi 2.1.0"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-ppu-blue focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tanggal
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Contoh: 31 Juli 2026"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-ppu-blue focus:outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Isi Update (Daftar Pembaruan)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder={`• Tampilan Dashboard User diperbarui.\n• Header baru.\n• Sistem Status diperbaiki.`}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-ppu-blue focus:outline-none transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-ppu-blue hover:bg-ppu-blue-dark text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Menyimpan...' : 'Simpan Update'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-extrabold text-gray-900 text-lg">Konfirmasi Hapus</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus catatan pembaruan sistem ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
